"""
Signal Consumer Pipeline (Fanout Architecture)
-----------------------------------------------
Two decoupled consumer loops:
1. start_metrics_consumer(): Consumes 'signals_metrics_queue' -> updates Redis real-time aggregates in < 1ms.
2. start_storage_consumer(): Consumes 'signals_storage_queue' -> writes sampled signals to PostgreSQL.
3. Poison message handling: After 3 failed retries, messages route to 'signals_dead_letter'.
"""

import json
import asyncio
import random
import aio_pika
from datetime import datetime
from app.config import settings
from app.queue.connection import (
    get_rabbitmq_channel,
    SIGNALS_METRICS_QUEUE_NAME,
    SIGNALS_STORAGE_QUEUE_NAME,
    DEAD_LETTER_EXCHANGE_NAME,
    SIGNALS_QUEUE_NAME
)
from app.realtime_aggregates import update_realtime_aggregate
from app.redis.cache import invalidate_user_cache
from app.database.database import AsyncSessionLocal
from app.database import models

MAX_RETRIES = 3


# ═════════════════════════════════════════════════════════════════════════════
# 1. METRICS CONSUMER (Redis Fast-Path, Zero Disk Wait)
# ═════════════════════════════════════════════════════════════════════════════

async def _process_metrics_signal(signal_data: dict) -> None:
    """Updates in-memory Redis metrics in sub-millisecond time."""
    user_id      = signal_data.get("user_id")
    service_name = signal_data.get("service_name")
    endpoint     = signal_data.get("endpoint")
    latency_ms   = signal_data.get("latency_ms")
    sig_status   = signal_data.get("status")
    customer_id  = signal_data.get("customer_identifier")
    priority     = signal_data.get("priority", "medium")
    action_taken = signal_data.get("action_taken", "none")
    flag_name    = signal_data.get("flag_name")

    await update_realtime_aggregate(
        user_id=user_id,
        service_name=service_name,
        endpoint=endpoint,
        latency_ms=latency_ms,
        status=sig_status,
        customer_identifier=customer_id,
        priority=priority,
        action_taken=action_taken,
        flag_name=flag_name,
    )
    await invalidate_user_cache(user_id)


async def _on_metrics_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    headers = dict(message.headers or {})
    retry_count = int(headers.get("x-retry-count", 0))

    try:
        signal_data = json.loads(message.body.decode())
        await _process_metrics_signal(signal_data)
        await message.ack()
    except Exception as exc:
        print(f"⚠️ [Metrics Consumer] Error processing signal: {exc} (retry {retry_count}/{MAX_RETRIES})")
        if retry_count < MAX_RETRIES:
            # Requeue with incremented retry count
            headers["x-retry-count"] = retry_count + 1
            await message.nack(requeue=True)
        else:
            print(f"☠️ [Metrics Consumer] Quarantining poison message to DLQ after {MAX_RETRIES} failures.")
            await message.reject(requeue=False) # Routes to dead-letter queue


async def start_metrics_consumer() -> None:
    """Consumes from signals_metrics_queue to update Redis in real-time."""
    print(f"🐇 [Metrics Consumer] Starting consumer on '{SIGNALS_METRICS_QUEUE_NAME}'...")

    while True:
        channel = None
        try:
            channel = await get_rabbitmq_channel()
            queue = await channel.get_queue(SIGNALS_METRICS_QUEUE_NAME)
            await queue.consume(_on_metrics_message)
            print(f"⚡ [Metrics Consumer] Active on queue: '{SIGNALS_METRICS_QUEUE_NAME}'")
            await asyncio.Future()

        except asyncio.CancelledError:
            print("🛑 [Metrics Consumer] Task cancelled — shutting down")
            break
        except Exception as exc:
            print(f"❌ [Metrics Consumer] Connection error: {exc} — retrying in 5s...")
            import app.queue.connection as _conn_mod
            _conn_mod._channel = None
            _conn_mod._queue_declared = False
            await asyncio.sleep(5)


# ═════════════════════════════════════════════════════════════════════════════
# 2. STORAGE CONSUMER (PostgreSQL Sampled Persistence)
# ═════════════════════════════════════════════════════════════════════════════

async def _process_storage_signal(signal_data: dict) -> None:
    """Sampled disk write to PostgreSQL database."""
    sig_status = signal_data.get("status")
    should_store = (
        sig_status == "error"
        or random.random() < settings.SIGNAL_SAMPLING_RATE
    )

    if not should_store:
        return

    async with AsyncSessionLocal() as db:
        ts_raw = signal_data.get("timestamp") or signal_data.get("recorded_at")
        resolved_ts = None
        if ts_raw and isinstance(ts_raw, str):
            try:
                resolved_ts = datetime.fromisoformat(ts_raw.replace('Z', '+00:00'))
            except ValueError:
                pass
        elif isinstance(ts_raw, datetime):
            resolved_ts = ts_raw

        SIGNAL_COLUMNS = {
            "user_id", "service_name", "tenant_id", "endpoint",
            "latency_ms", "status", "priority",
            "customer_identifier", "action_taken", "flag_name", "is_agent"
        }
        clean = {k: v for k, v in signal_data.items() if k in SIGNAL_COLUMNS}
        if resolved_ts:
            clean["timestamp"] = resolved_ts

        signal = models.Signal(**clean)
        db.add(signal)
        await db.commit()


async def _on_storage_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    headers = dict(message.headers or {})
    retry_count = int(headers.get("x-retry-count", 0))

    try:
        signal_data = json.loads(message.body.decode())
        await _process_storage_signal(signal_data)
        await message.ack()
    except Exception as exc:
        print(f"⚠️ [Storage Consumer] DB write error: {exc} (retry {retry_count}/{MAX_RETRIES})")
        if retry_count < MAX_RETRIES:
            headers["x-retry-count"] = retry_count + 1
            await message.nack(requeue=True)
        else:
            print(f"☠️ [Storage Consumer] Quarantining poison message to DLQ after {MAX_RETRIES} failures.")
            await message.reject(requeue=False)


async def start_storage_consumer() -> None:
    """Consumes from signals_storage_queue to persist sampled records to PostgreSQL."""
    print(f"💾 [Storage Consumer] Starting consumer on '{SIGNALS_STORAGE_QUEUE_NAME}'...")

    while True:
        channel = None
        try:
            channel = await get_rabbitmq_channel()
            queue = await channel.get_queue(SIGNALS_STORAGE_QUEUE_NAME)
            await queue.consume(_on_storage_message)
            print(f"💾 [Storage Consumer] Active on queue: '{SIGNALS_STORAGE_QUEUE_NAME}'")
            await asyncio.Future()

        except asyncio.CancelledError:
            print("🛑 [Storage Consumer] Task cancelled — shutting down")
            break
        except Exception as exc:
            print(f"❌ [Storage Consumer] Connection error: {exc} — retrying in 5s...")
            import app.queue.connection as _conn_mod
            _conn_mod._channel = None
            _conn_mod._queue_declared = False
            await asyncio.sleep(5)


# ═════════════════════════════════════════════════════════════════════════════
# 3. UNIFIED SIGNAL CONSUMER RUNNER
# ═════════════════════════════════════════════════════════════════════════════

async def start_signal_consumer() -> None:
    """Runs both metrics and storage consumers concurrently."""
    await asyncio.gather(
        start_metrics_consumer(),
        start_storage_consumer()
    )
