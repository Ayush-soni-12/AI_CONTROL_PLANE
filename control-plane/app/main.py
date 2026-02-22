from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from app.functions.decisionFunction import make_decision
from app.database import models, Schema
from app.database.database import engine, Base
from app.database.database import get_db
from sqlalchemy.orm import Session
from typing import List
from app.router import signals, auth, history, sse, ai_insights, analytics
from app.redis.cache import redis_client
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.jobs.aggregation_jobs import aggregate_signals_hourly, aggregate_signals_daily, cleanup_old_data
from app.redis.aggregate_persistence import snapshot_redis_aggregates
from app.ai_engine.background_analyzer import analyze_all_services
from app.queue.consumer import start_signal_consumer
from app.queue.connection import close_rabbitmq_connection
import asyncio

# Create the app
app = FastAPI()

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
    
    # Snapshot Redis aggregates: Run every 30 minutes
    scheduler.add_job(
        snapshot_redis_aggregates,
        # trigger=CronTrigger(minute=30),
        trigger=CronTrigger(minute='*/2'),
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
    
    scheduler.start()
    print("✅ Background jobs scheduled:")
    print("   - Hourly aggregation: Every hour at :05")
    print("   - Daily aggregation: Daily at 00:30 UTC")
    print("   - Data cleanup: Daily at 02:00 UTC")
    print("   - Aggregate snapshots: Every 30 minutes")
    print("   - 🤖 AI analysis: Every 5 minutes")

    # Start RabbitMQ signal consumer as a background asyncio task
    asyncio.create_task(start_signal_consumer())
    print("✅ RabbitMQ signal consumer started")

@app.on_event("shutdown")
async def shutdown():
    await redis_client.close()
    scheduler.shutdown()
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