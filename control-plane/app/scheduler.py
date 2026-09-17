from app.ai_engine.background_analyzer import analyze_all_services
import asyncio
import signal
import sys
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.jobs.aggregation_jobs import aggregate_signals_hourly, aggregate_signals_daily, cleanup_old_data
from app.jobs.agent_scoring import run_scoring_job
from app.redis.aggregate_persistence import snapshot_redis_aggregates
from app.database import models
from app.database.database import get_async_db
from sqlalchemy import update
from app.redis.cache import redis_client

stop_event = asyncio.Event()

def handle_shutdown_signal(sig, frame):
    print(f"\n🛑 Received shutdown signal ({sig}). Stopping scheduler gracefully...")
    stop_event.set()

async def reset_monthly_signal_counters():
    """Reset signals_used_month to 0 for all users at the start of each billing period."""
    try:
        async for db in get_async_db():
            await db.execute(update(models.User).values(signals_used_month=0))
            await db.commit()
            print("✅ Monthly signal counters reset for all users")
            break
    except Exception as e:
        print("❌ Error resetting monthly signal counters:", e)

async def run_scheduler():
    print("=" * 60)
    print("⏰ NeuralControl Cron & AI Background Scheduler Starting...")
    print("   • Hourly aggregation:   Every hour at :05")
    print("   • Daily aggregation:    Daily at 00:30 UTC")
    print("   • Data cleanup:         Daily at 02:00 UTC")
    print("   • Aggregate snapshots:  Every 30 minutes")
    print("   • Agent Trust Scoring:  Every hour at :00")
    print("   • Monthly quota reset:  1st of month at 00:00 UTC")
    print("   • AI Service Analysis:  Every 5 minutes")
    print("=" * 60)

    # Test Redis connection
    try:
        await redis_client.ping()
        print("✅ Redis connected (Scheduler Process)")
    except Exception as e:
        print("⚠️ Warning: Redis connection failed on scheduler start:", e)

    scheduler = AsyncIOScheduler()

    # 1. Hourly aggregation
    scheduler.add_job(
        aggregate_signals_hourly,
        trigger=CronTrigger(minute=5),
        id="hourly_aggregation",
        name="Aggregate signals hourly",
        replace_existing=True
    )

    # 2. Daily aggregation
    scheduler.add_job(
        aggregate_signals_daily,
        trigger=CronTrigger(hour=0, minute=30),
        id="daily_aggregation",
        name="Aggregate signals daily",
        replace_existing=True
    )

    # 3. Cleanup old data
    scheduler.add_job(
        cleanup_old_data,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_old_data",
        name="Cleanup old signals",
        replace_existing=True
    )

    # 4. Snapshot Redis aggregates to Postgres
    scheduler.add_job(
        snapshot_redis_aggregates,
        trigger=CronTrigger(minute=30),
        id="snapshot_aggregates",
        name="Snapshot Redis aggregates to PostgreSQL",
        replace_existing=True
    )

    # 5. Agentic Payments: Dynamic Trust Scoring
    scheduler.add_job(
        run_scoring_job,
        trigger=CronTrigger(minute=0),
        id="agent_trust_scoring",
        name="Update AI Agent Trust Scores on Blockchain",
        replace_existing=True
    )

    # 6. Monthly quota reset
    scheduler.add_job(
        reset_monthly_signal_counters,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_quota_reset",
        name="Reset monthly signal quota counters",
        replace_existing=True
    )
    # scheduler.add_job(
    #     analyze_all_services,
    #     trigger=CronTrigger(minute='*/5'),
    #     id="ai_background_analysis",
    #     name="AI background service analysis",
    #     replace_existing=True
    # )

    scheduler.start()
    print("✅ Scheduler loop active and running.")

    await stop_event.wait()

    print("⏳ Shutting down scheduler...")
    scheduler.shutdown(wait=False)

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

    print("🏁 NeuralControl Scheduler shutdown complete.")

def main():
    signal.signal(signal.SIGINT, handle_shutdown_signal)
    signal.signal(signal.SIGTERM, handle_shutdown_signal)

    try:
        asyncio.run(run_scheduler())
    except (KeyboardInterrupt, SystemExit):
        pass

if __name__ == "__main__":
    main()
