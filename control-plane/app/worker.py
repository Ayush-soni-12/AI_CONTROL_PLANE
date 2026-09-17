import asyncio
import signal
import sys
from app.queue.consumer import start_signal_consumer
from app.queue.email_consumer import start_email_consumer
from app.queue.connection import close_rabbitmq_connection
from app.redis.cache import redis_client

stop_event = asyncio.Event()

def handle_shutdown_signal(sig, frame):
    print(f"\n🛑 Received shutdown signal ({sig}). Initiating graceful worker teardown...")
    stop_event.set()

async def run_worker():
    print("=" * 60)
    print("🚀 NeuralControl RabbitMQ Ingestion Worker Starting...")
    print("   • Signal Consumer: Active (signals_queue)")
    print("   • Email Consumer:  Active (email_queue)")
    print("=" * 60)

    # Test Redis connection
    try:
        await redis_client.ping()
        print("✅ Redis connected (Worker Process)")
    except Exception as e:
        print("⚠️ Warning: Redis connection failed on worker start:", e)

    # Launch consumer tasks
    signal_task = asyncio.create_task(start_signal_consumer())
    email_task = asyncio.create_task(start_email_consumer())

    # Wait until stop event is triggered
    await stop_event.wait()

    print("⏳ Canceling active consumer tasks...")
    signal_task.cancel()
    email_task.cancel()

    await asyncio.gather(signal_task, email_task, return_exceptions=True)

    try:
        await close_rabbitmq_connection()
        print("✅ RabbitMQ connection closed cleanly")
    except Exception as e:
        print("⚠️ Error closing RabbitMQ connection:", e)

    try:
        from app.database.database import async_engine
        await async_engine.dispose()
        print("✅ Database connection pool closed cleanly")
    except Exception as e:
        print("⚠️ Error closing Database connections:", e)

    try:
        await redis_client.aclose()
        print("✅ Redis connection closed cleanly")
    except Exception as e:
        print("⚠️ Error closing Redis connection:", e)

    print("🏁 NeuralControl Worker shutdown complete.")

def main():
    # Register POSIX signal handlers
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    try:
        asyncio.run(run_worker())
    except (KeyboardInterrupt, SystemExit):
        pass

if __name__ == "__main__":
    main()
