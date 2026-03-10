from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from app.functions.decisionFunction import make_decision
from app.database import models, Schema
from app.database.database import engine, Base
from app.database.database import get_db
from sqlalchemy.orm import Session
from typing import List
from app.router import signals, auth, history, sse, ai_insights, analytics, overrides, IncidentTracker, billing, services, adaptive_timeout
from app.redis.cache import redis_client
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.jobs.aggregation_jobs import aggregate_signals_hourly, aggregate_signals_daily, cleanup_old_data
from app.redis.aggregate_persistence import snapshot_redis_aggregates
from app.ai_engine.background_analyzer import analyze_all_services
from app.queue.consumer import start_signal_consumer
from app.queue.email_consumer import start_email_consumer
from app.queue.connection import close_rabbitmq_connection
import asyncio
# from app.config import settings

from sqlalchemy.exc import IntegrityError, ProgrammingError

# Create the app
app = FastAPI()

# Wrap create_all in try/except to handle race condition when 2 containers start at same time
try:
    Base.metadata.create_all(bind=engine)
except (IntegrityError, ProgrammingError) as e:
    print(f"Table creation skipped (likely created by other container): {e}")

# Initialize background scheduler (Async version for FastAPI loop)
scheduler = AsyncIOScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://neuralcontrol.online",
        "https://www.neuralcontrol.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# print("environment: ", os.getenv("ENVIRONMENT"))
# print("redis url: ", os.getenv("REDIS_URL"))

# print("environment: ", settings.ENVIRONMENT)
# print("redis url: ", settings.REDIS_URL)

# Create one simple endpoint
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}


@app.get("/test")
async def home():
    return {"message": "test successful"}


@app.on_event("startup")
async def startup():
    # Start Redis connection
    try:
        await redis_client.ping()
        print("✅ Redis connected")
    except Exception as e:
        print("❌ Redis connection failed:", e)
    
    # Start background jobs
    print("🚀 Starting background jobs...")
    
    # Hourly aggregation: Run every hour at minute 5 (e.g., 10:05, 11:05, ...)
    scheduler.add_job(
        aggregate_signals_hourly,
        trigger=CronTrigger(minute=5),
        # trigger=CronTrigger(minute='*/3'),
        id="hourly_aggregation",
        name="Aggregate signals hourly",
        replace_existing=True
    )
    
    # Daily aggregation: Run daily at 00:30 UTC
    scheduler.add_job(
        aggregate_signals_daily,
        trigger=CronTrigger(hour=0, minute=30),
        id="daily_aggregation",
        name="Aggregate signals daily",
        replace_existing=True
    )
    
    # Cleanup old data: Run daily at 02:00 UTC
    scheduler.add_job(
        cleanup_old_data,
        trigger=CronTrigger(hour=2, minute=0),
        id="cleanup_old_data",
        name="Cleanup old signals",
        replace_existing=True
    )
    
    # Snapshot Redis aggregates: Run every 30 minutes
    scheduler.add_job(
        snapshot_redis_aggregates,
        trigger=CronTrigger(minute=30),
        # trigger=CronTrigger(minute='*/2'),
        id="snapshot_aggregates",
        name="Snapshot Redis aggregates to PostgreSQL",
        replace_existing=True
    )
    
    # AI Background Analysis: Run every 5 minutes
    # scheduler.add_job(
    #     analyze_all_services,
    #     trigger=CronTrigger(minute='*/2'),
    #     id="ai_background_analysis",
    #     name="AI background service analysis",
    #     replace_existing=True
    # )
    
    # Monthly quota reset: Run on the 1st of every month at 00:00 UTC
    async def reset_monthly_signal_counters():
        """Reset signals_used_month to 0 for all users at the start of each billing period."""
        from app.database.database import get_async_db as _get_db
        from sqlalchemy import update as _update
        async for db in _get_db():
            await db.execute(_update(models.User).values(signals_used_month=0))
            await db.commit()
            print("✅ Monthly signal counters reset for all users")
            break

    scheduler.add_job(
        reset_monthly_signal_counters,
        trigger=CronTrigger(day=1, hour=0, minute=0),
        id="monthly_quota_reset",
        name="Reset monthly signal quota counters",
        replace_existing=True
    )

    scheduler.start()
    print("✅ Background jobs scheduled:")
    print("   - Hourly aggregation: Every hour at :05")
    print("   - Daily aggregation: Daily at 00:30 UTC")
    print("   - Data cleanup: Daily at 02:00 UTC")
    print("   - Aggregate snapshots: Every 30 minutes")
    print("   - 🤖 AI analysis: Every 5 minutes")

    # Start RabbitMQ signal consumer as a background asyncio task
    app.state.signal_consumer_task = asyncio.create_task(start_signal_consumer())
    print("✅ RabbitMQ signal consumer started")

    # Start RabbitMQ email consumer as a background asyncio task
    app.state.email_consumer_task = asyncio.create_task(start_email_consumer())
    print("✅ RabbitMQ email consumer started")

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    scheduler.shutdown()
    
    # Gracefully cancel background consumer tasks
    tasks = []
    if hasattr(app.state, "signal_consumer_task"):
        app.state.signal_consumer_task.cancel()
        tasks.append(app.state.signal_consumer_task)
        
    if hasattr(app.state, "email_consumer_task"):
        app.state.email_consumer_task.cancel()
        tasks.append(app.state.email_consumer_task)
        
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
        
    await close_rabbitmq_connection()
    print("🛑 Background jobs stopped")



app.include_router(signals.router)


app.include_router(auth.router)

# Import and include history router
app.include_router(history.router)

# Import and include SSE router
app.include_router(sse.router)

# Import and include AI Insights router
app.include_router(ai_insights.router)

# Import and include Analytics router
app.include_router(analytics.router)

# Import and include Config Overrides router
app.include_router(overrides.router)

app.include_router(IncidentTracker.router)

# Billing router (IS_CLOUD_MODE-gated inside the router itself)
app.include_router(billing.router)

# Services management router (list + delete)
app.include_router(services.router)

# Adaptive Timeout status router
app.include_router(adaptive_timeout.router)