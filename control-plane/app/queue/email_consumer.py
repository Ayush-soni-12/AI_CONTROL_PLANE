"""
Email Consumer
---------------
Background worker that consumes email jobs from 'email_queue' and
sends them via FastMail / SMTP.

Reliability guarantees:
  - Messages are ACK'd ONLY after the email is successfully sent.
  - On any SMTP exception: NACK (requeue=True) → message is requeued.
  - After 3 delivery attempts RabbitMQ routes the message to
    'email_dead_letter' for manual inspection / future retry.
  - Consumer auto-reconnects every 5s if RabbitMQ is temporarily down.

Start this from main.py startup:
    asyncio.create_task(start_email_consumer())
"""

import json
import asyncio
import aio_pika
from ..queue.connection import get_email_rabbitmq_channel, EMAIL_QUEUE_NAME
from ..functions.mailer import send_alert_email


async def _process_email(payload: dict) -> None:
    """
    Send a single email from a queue payload.

    Expected payload keys:
        to_email (str)   – recipient address
        subject  (str)   – email subject
        context  (dict)  – template context for FastMail
    """
    to_email = payload["to_email"]
    subject  = payload["subject"]
    context  = payload["context"]

    await send_alert_email(
        to_email=to_email,
        subject=subject,
        context=context,
    )

    print(
        f"✅ [EmailConsumer] Email sent | "
        f"to={to_email} subject={subject!r}"
    )


MAX_RETRIES = 3  # After this many SMTP failures → route to DLQ


async def _on_email_message(message: aio_pika.abc.AbstractIncomingMessage) -> None:
    """
    Called for each message delivered by RabbitMQ.
    ACK on success.
    On failure: increment 'x-retry-count' header and re-publish if under
    MAX_RETRIES, otherwise reject (→ dead-letter queue) so the message is
    not lost and can be inspected manually.
    """
    async with message.process(requeue=False, ignore_processed=True):
        try:
            payload = json.loads(message.body.decode())
            await _process_email(payload)
            # ACK sent automatically when context manager exits cleanly

        except Exception as exc:
            # Read current retry count from headers (default 0)
            headers      = dict(message.headers or {})
            retry_count  = int(headers.get("x-retry-count", 0)) + 1

            if retry_count < MAX_RETRIES:
                # Re-publish with incremented retry counter
                channel = await get_email_rabbitmq_channel()
                retry_message = aio_pika.Message(
                    body=message.body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                    content_type="application/json",
                    headers={**headers, "x-retry-count": retry_count},
                )
                await channel.default_exchange.publish(
                    retry_message,
                    routing_key=EMAIL_QUEUE_NAME,
                )
                print(
                    f"⚠️  [EmailConsumer] Retry {retry_count}/{MAX_RETRIES} "
                    f"for email to {payload.get('to_email')} — {exc}"
                )
            else:
                # Reject without requeue → RabbitMQ routes to email_dead_letter
                await message.reject(requeue=False)
                print(
                    f"💀 [EmailConsumer] Max retries reached for email to "
                    f"{payload.get('to_email')} — routed to DLQ"
                )


async def start_email_consumer() -> None:
    """
    Long-running consumer loop. Connects to RabbitMQ and starts
    consuming from 'email_queue'.

    Retries connection every 5s if RabbitMQ is not yet available.
    Safe to run as an asyncio background task.
    """
    print("📧 [EmailConsumer] Starting email consumer...")

    while True:
        try:
            channel = await get_email_rabbitmq_channel()
            queue   = await channel.get_queue(EMAIL_QUEUE_NAME)

            print(f"📧 [EmailConsumer] Listening on queue: '{EMAIL_QUEUE_NAME}'")
            await queue.consume(_on_email_message)

            # Keep the consumer alive indefinitely
            await asyncio.Future()

        except asyncio.CancelledError:
            print("🛑 [EmailConsumer] Consumer task cancelled — shutting down")
            break
        except Exception as exc:
            print(f"❌ [EmailConsumer] Connection error: {exc} — retrying in 5s...")
            await asyncio.sleep(5)
