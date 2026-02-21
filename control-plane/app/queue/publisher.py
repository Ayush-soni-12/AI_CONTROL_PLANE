"""
Signal Publisher
-----------------
Publishes a signal dict as a JSON message to the RabbitMQ signals_queue.

Message is marked PERSISTENT so it survives a RabbitMQ broker restart
(written to disk inside RabbitMQ, not just held in memory).

Usage:
    from app.queue.publisher import publish_signal
    await publish_signal(signal_data)
"""

import json
import aio_pika
from .connection import get_rabbitmq_channel, SIGNALS_QUEUE_NAME


async def publish_signal(signal_data: dict) -> None:
    """
    Publish a signal to the signals_queue.

    Args:
        signal_data: dict containing all signal fields including user_id.
                     Must be JSON-serialisable.

    Raises:
        Exception: propagated if RabbitMQ publish fails so the caller
                   can return a 503 to the SDK and let it retry.
    """
    channel = await get_rabbitmq_channel()

    message = aio_pika.Message(
        body=json.dumps(signal_data, default=str).encode(),
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # survives broker restart
        content_type="application/json",
    )

    await channel.default_exchange.publish(
        message,
        routing_key=SIGNALS_QUEUE_NAME,
    )

    print(
        f"📤 Signal published to queue | "
        f"service={signal_data.get('service_name')} "
        f"endpoint={signal_data.get('endpoint')} "
        f"user_id={signal_data.get('user_id')}"
    )
