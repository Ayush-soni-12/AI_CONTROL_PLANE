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
from app.queue.connection import get_rabbitmq_channel, SIGNALS_EXCHANGE_NAME


async def publish_signal(signal_data: dict) -> None:
    """
    Publish a signal to the signals_exchange fanout exchange.
    RabbitMQ automatically duplicates to both signals_metrics_queue and signals_storage_queue.
    """
    channel = await get_rabbitmq_channel()

    message = aio_pika.Message(
        body=json.dumps(signal_data, default=str).encode(),
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # survives broker restart
        content_type="application/json",
    )

    exchange = await channel.get_exchange(SIGNALS_EXCHANGE_NAME)
    await exchange.publish(
        message,
        routing_key="",  # Ignored by fanout exchanges
    )

    print(
        f"📤 Signal published to exchange '{SIGNALS_EXCHANGE_NAME}' | "
        f"service={signal_data.get('service_name')} "
        f"endpoint={signal_data.get('endpoint')} "
        f"user_id={signal_data.get('user_id')}"
    )
    return True
