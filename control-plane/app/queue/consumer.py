"""
Signal Consumer
----------------
Background worker that consumes signals from 'signals_queue' and
writes them to Redis (real-time aggregates) and PostgreSQL.

Reliability guarantees:
  - Messages are ACK'd ONLY after successful processing
  - On any exception: NACK (requeue=True) → message stays in queue and retries
  - After 3 failures the message goes to the dead-letter queue (not silently dropped)
  - Uses a persistent DB session per message (not shared across messages)

Start this from main.py startup:
    asyncio.create_task(start_signal_consumer())
"""

import json
import asyncio
import random
import aio_pika
from ..config import settings
from ..queue.connection import get_rabbitmq_channel, SIGNALS_QUEUE_NAME
from ..realtime_aggregates import update_realtime_aggregate
from app.redis.cache import invalidate_user_cache
from ..database.database import AsyncSessionLocal
from ..database import models


async def _process_signal(signal_data: dict) -> None:
    """
    Core processing logic for a single signal.
    Called inside the message handler.

    Steps:
      1. Update Redis real-time aggregates (always)
      2. Store in PostgreSQL (with sampling rate)
      3. Invalidate user cache
    """
    user_id        = signal_data["user_id"]
    service_name   = signal_data["service_name"]
    endpoint       = signal_data["endpoint"]
    latency_ms     = signal_data["latency_ms"]
    sig_status     = signal_data["status"]
    customer_id    = signal_data.get("customer_identifier")
    priority       = signal_data.get("priority", "medium")

    # ── STEP 1: Update Redis real-time aggregates ──────────────────────────
    await update_realtime_aggregate(
        user_id=user_id,
        service_name=service_name,
        endpoint=endpoint,
        latency_ms=latency_ms,
        status=sig_status,
        customer_identifier=customer_id,
        priority=priority,
    )
    print(
        f"✅ [Consumer] Redis updated | "
        f"{service_name}{endpoint} | user_id={user_id}"
    )

    # ── STEP 2: Store in PostgreSQL (sampling logic) ───────────────────────
    should_store = (
        sig_status == "error"
        or random.random() < settings.SIGNAL_SAMPLING_RATE
    )

    if should_store:
        async with AsyncSessionLocal() as db:
            signal = models.Signal(**signal_data)
            db.add(signal)
            await db.commit()
        print(f"💾 [Consumer] Signal stored in DB | {service_name}{endpoint}")
    else:
        print(f"⏭️  [Consumer] Signal aggregated only (sampling) | {service_name}{endpoint}")

    # ── STEP 3: Invalidate user cache ─────────────────────────────────────
    await invalidate_user_cache(user_id)


async def _on_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    """
    Called for each message delivered by RabbitMQ.
    ACK on success, NACK (requeue) on failure so the message is retried.
    """
    async with message.process(requeue=True, ignore_processed=True):
        try:
            signal_data = json.loads(message.body.decode())
            await _process_signal(signal_data)
            # ACK is sent automatically when the context manager exits cleanly
        except Exception as exc:
            print(f"❌ [Consumer] Failed to process signal: {exc} — requeueing")
            await message.nack(requeue=True)


async def start_signal_consumer() -> None:
    """
    Long-running consumer loop. Connects to RabbitMQ and starts
    consuming from 'signals_queue'.

    Retries connection every 5s if RabbitMQ is not yet available.
    This is safe to run as an asyncio background task.
    """
    print("🐇 [Consumer] Starting signal consumer...")

    while True:
        try:
            channel = await get_rabbitmq_channel()
            queue   = await channel.get_queue(SIGNALS_QUEUE_NAME)

            print(f"🐇 [Consumer] Listening on queue: '{SIGNALS_QUEUE_NAME}'")
            await queue.consume(_on_message)

            # Keep the consumer alive indefinitely
            await asyncio.Future()

        except asyncio.CancelledError:
            print("🛑 [Consumer] Consumer task cancelled — shutting down")
            break
        except Exception as exc:
            print(f"❌ [Consumer] Connection error: {exc} — retrying in 5s...")
            await asyncio.sleep(5)
