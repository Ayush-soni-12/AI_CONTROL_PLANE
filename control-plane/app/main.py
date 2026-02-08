from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from .functions.decisionFunction import make_decision
from . import models, Schema
from .database import engine, Base
from .database import get_db
from sqlalchemy.orm import Session
from typing import List
from .router import signals, auth, history
from .cache import redis_client
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from .jobs.aggregation_jobs import aggregate_signals_hourly, aggregate_signals_daily, cleanup_old_data
from .aggregate_persistence import snapshot_redis_aggregates

# Create the app
app = FastAPI()

# signals_memory = []

# Create all tables (Signal, User, ApiKey)
Base.metadata.create_all(bind=engine)

# Initialize background scheduler (Async version for FastAPI loop)
scheduler = AsyncIOScheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create one simple endpoint
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}

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
    
    # Snapshot Redis aggregates: Run every 3 minutes for testing (usually 30m)
    scheduler.add_job(
        snapshot_redis_aggregates,
        trigger=CronTrigger(minute='*/30'),
        id="snapshot_aggregates",
        name="Snapshot Redis aggregates to PostgreSQL",
        replace_existing=True
    )
    
    scheduler.start()
    print("✅ Background jobs scheduled:")
    print("   - Hourly aggregation: Every hour at :05")
    print("   - Daily aggregation: Daily at 00:30 UTC")
    print("   - Data cleanup: Daily at 02:00 UTC")
    print("   - Aggregate snapshots: Every 30 minutes")

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    scheduler.shutdown()
    print("🛑 Background jobs stopped")


app.include_router(signals.router)
app.include_router(auth.router)

# Import and include history router
app.include_router(history.router)