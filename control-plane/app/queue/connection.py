"""
RabbitMQ Connection Manager
----------------------------
Manages a single shared async connection and channel to RabbitMQ.
Using a singleton pattern so we don't open a new connection per request.

Provides:
  - get_rabbitmq_channel()   → returns a ready-to-use aio_pika channel
  - close_rabbitmq_connection() → called on app shutdown
"""

import aio_pika
import asyncio
from ..config import settings

# Module-level singletons
_connection: aio_pika.abc.AbstractRobustConnection | None = None
_channel: aio_pika.abc.AbstractChannel | None = None
_email_channel: aio_pika.abc.AbstractChannel | None = None

# Signal exchange and queue names
SIGNALS_EXCHANGE_NAME = "signals_exchange"
SIGNALS_METRICS_QUEUE_NAME = "signals_metrics_queue"
SIGNALS_STORAGE_QUEUE_NAME = "signals_storage_queue"
DEAD_LETTER_EXCHANGE_NAME = "signals_dead_letter_exchange"
DEAD_LETTER_QUEUE_NAME = "signals_dead_letter"

# Legacy alias for backward compatibility
SIGNALS_QUEUE_NAME = "signals_metrics_queue"

# Email queue names
EMAIL_QUEUE_NAME = "email_queue"
EMAIL_DLQ_NAME = "email_dead_letter"

_queue_declared = False

async def get_rabbitmq_channel() -> aio_pika.abc.AbstractChannel:
    """
    Returns the shared RabbitMQ channel, creating it if needed.
    Declares the fanout exchange, dual queues (metrics & storage), and DLQ.
    """
    global _connection, _channel, _queue_declared

    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            reconnect_interval=5,     # retry every 5s on disconnect
        )
        print("✅ RabbitMQ connected")

    if _channel is None or _channel.is_closed:
        _channel = await _connection.channel()
        _queue_declared = False # Reset on new channel

    if not _queue_declared:
        await _channel.set_qos(prefetch_count=50)

        # 1. Declare the Dead-Letter Exchange and Queue (receives rejected / failed messages)
        dlx = await _channel.declare_exchange(
            DEAD_LETTER_EXCHANGE_NAME,
            type=aio_pika.ExchangeType.FANOUT,
            durable=True
        )
        dlq = await _channel.declare_queue(
            DEAD_LETTER_QUEUE_NAME,
            durable=True,
        )
        await dlq.bind(dlx)

        # 2. Declare the main signals Fanout Exchange
        signals_exchange = await _channel.declare_exchange(
            SIGNALS_EXCHANGE_NAME,
            type=aio_pika.ExchangeType.FANOUT,
            durable=True
        )

        dlq_args = {
            "x-dead-letter-exchange": DEAD_LETTER_EXCHANGE_NAME,
            "x-message-ttl": 86_400_000,  # messages expire after 24h if unprocessed
        }

        # 3. Queue A: Fast in-memory metrics queue for Redis (< 1ms updates)
        metrics_queue = await _channel.declare_queue(
            SIGNALS_METRICS_QUEUE_NAME,
            durable=True,
            arguments=dlq_args
        )
        await metrics_queue.bind(signals_exchange)

        # 4. Queue B: Sampled persistent storage queue for PostgreSQL
        storage_queue = await _channel.declare_queue(
            SIGNALS_STORAGE_QUEUE_NAME,
            durable=True,
            arguments=dlq_args
        )
        await storage_queue.bind(signals_exchange)

        _queue_declared = True
        print(f"✅ RabbitMQ Fanout Pipeline Ready | Exchange: '{SIGNALS_EXCHANGE_NAME}' -> ['{SIGNALS_METRICS_QUEUE_NAME}', '{SIGNALS_STORAGE_QUEUE_NAME}']")

    return _channel


async def get_email_rabbitmq_channel() -> aio_pika.abc.AbstractChannel:
    """
    Returns a dedicated RabbitMQ channel for email jobs.
    Shares the same RobustConnection as the signal channel but uses a
    separate channel so email and signal traffic are fully isolated.
    """
    global _connection, _email_channel

    # Reuse (or create) the shared connection
    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            reconnect_interval=5,
        )
        print("✅ RabbitMQ connected (email channel init)")

    if _email_channel is None or _email_channel.is_closed:
        _email_channel = await _connection.channel()
        await _email_channel.set_qos(prefetch_count=5)

        # Declare DLQ first (receives messages that exceed retry limit)
        await _email_channel.declare_queue(
            EMAIL_DLQ_NAME,
            durable=True,
        )

        # Declare main email queue with dead-letter routing.
        # NOTE: x-delivery-limit is a Quorum Queue-only feature and is NOT
        # supported by Classic Queues (PRECONDITION_FAILED).
        # Retry limiting is handled manually in the consumer via headers.
        await _email_channel.declare_queue(
            EMAIL_QUEUE_NAME,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": EMAIL_DLQ_NAME,
                "x-message-ttl": 86_400_000,   # 24h — expire unsent emails
            },
        )

        print(f"✅ RabbitMQ email channel ready | Queue: '{EMAIL_QUEUE_NAME}'")

    return _email_channel


async def close_rabbitmq_connection():
    """Called on app shutdown to cleanly close both channels and the connection."""
    global _connection, _channel, _email_channel

    if _email_channel and not _email_channel.is_closed:
        await _email_channel.close()
        print("🔌 RabbitMQ email channel closed")

    if _channel and not _channel.is_closed:
        await _channel.close()
        print("🔌 RabbitMQ signal channel closed")

    if _connection and not _connection.is_closed:
        await _connection.close()
        print("🔌 RabbitMQ connection closed")
