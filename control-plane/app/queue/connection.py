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

# Signal queue names
SIGNALS_QUEUE_NAME = "signals_queue"
DEAD_LETTER_QUEUE_NAME = "signals_dead_letter"

# Email queue names
EMAIL_QUEUE_NAME = "email_queue"
EMAIL_DLQ_NAME = "email_dead_letter"


async def get_rabbitmq_channel() -> aio_pika.abc.AbstractChannel:
    """
    Returns the shared RabbitMQ channel, creating it if needed.
    Uses RobustConnection which auto-reconnects on disconnect.
    """
    global _connection, _channel

    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(
            settings.RABBITMQ_URL,
            reconnect_interval=5,     # retry every 5s on disconnect
        )
        print("✅ RabbitMQ connected")

    if _channel is None or _channel.is_closed:
        _channel = await _connection.channel()

        # Set prefetch so consumer only takes 1 message at a time
        # (ensures fair dispatch and no message overload)
        await _channel.set_qos(prefetch_count=10)

        # Declare the dead-letter queue first (receives rejected messages)
        await _channel.declare_queue(
            DEAD_LETTER_QUEUE_NAME,
            durable=True,  # survives RabbitMQ restarts
        )

        # Declare the main signals queue
        # durable=True  → queue survives broker restarts
        # arguments     → failed messages go to dead-letter queue
        await _channel.declare_queue(
            SIGNALS_QUEUE_NAME,
            durable=True,
            arguments={
                "x-dead-letter-exchange": "",
                "x-dead-letter-routing-key": DEAD_LETTER_QUEUE_NAME,
                "x-message-ttl": 86_400_000,  # messages expire after 24h if unprocessed
            }
        )

        print(f"✅ RabbitMQ channel ready | Queue: '{SIGNALS_QUEUE_NAME}'")

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
