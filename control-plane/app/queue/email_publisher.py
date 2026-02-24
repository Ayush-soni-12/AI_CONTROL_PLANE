"""
Email Publisher
----------------
Publishes an email job as a JSON message to the RabbitMQ email_queue.

Message is marked PERSISTENT so it survives a RabbitMQ broker restart.
On any failure the caller logs the error but the API response is NOT blocked —
email delivery failure is non-fatal for the /api/config endpoint.

Usage:
    from app.queue.email_publisher import publish_email
    await publish_email(to_email="user@example.com", subject="...", context={...})
"""

import json
import aio_pika
from .connection import get_email_rabbitmq_channel, EMAIL_QUEUE_NAME


async def publish_email(to_email: str, subject: str, context: dict) -> None:
    """
    Publish an email job to the email_queue.

    Args:
        to_email: Recipient email address.
        subject:  Email subject line.
        context:  Template context dict (passed to FastMail template).

    Raises:
        Exception: propagated if RabbitMQ publish fails so the caller
                   can log it. The /api/config endpoint catches this and
                   continues returning a valid config response.
    """
    channel = await get_email_rabbitmq_channel()

    payload = {
        "to_email": to_email,
        "subject": subject,
        "context": context,
    }

    message = aio_pika.Message(
        body=json.dumps(payload, default=str).encode(),
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,  # survives broker restart
        content_type="application/json",
    )

    await channel.default_exchange.publish(
        message,
        routing_key=EMAIL_QUEUE_NAME,
    )

    print(
        f"📤 Email published to queue | "
        f"to={to_email} "
        f"subject={subject!r}"
    )
