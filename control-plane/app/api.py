from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from app.database import models, Schema
from app.database.database import engine, Base
from sqlalchemy.exc import IntegrityError, ProgrammingError
from app.redis.cache import redis_client
from app.router import (
    signals,
    auth,
    history,
    sse,
    ai_insights,
    analytics,
    overrides,
    IncidentTracker,
    billing,
    services,
    adaptive_timeout,
    traces,
    flags,
    agentic_payments
)

# Create FastAPI app for dedicated API container
app = FastAPI(
    title="NeuralControl AI Control Plane API",
    description="High-performance real-time traffic signal ingestion and control plane API",
    version="1.4.1"
)

# Safe table creation fallback
try:
    Base.metadata.create_all(bind=engine)
except (IntegrityError, ProgrammingError) as e:
    print(f"Table creation skipped (handled by migration or existing container): {e}")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://neuralcontrol.online",
        "https://www.neuralcontrol.online",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def home():
    return {
        "service": "neuralcontrol-api",
        "status": "running",
        "message": "NeuralControl API Gateway is operational"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "api"}

@app.on_event("startup")
async def startup():
    try:
        await redis_client.ping()
        print("✅ Redis connected (API Gateway)")
    except Exception as e:
        print("❌ Redis connection failed:", e)

@app.on_event("shutdown")
async def shutdown():
    try:
        from app.database.database import async_engine
        await async_engine.dispose()
        print("✅ Database connection pool closed cleanly (API Gateway)")
    except Exception as e:
        print("⚠️ Error disposing Database connection pool:", e)

    try:
        await redis_client.aclose()
        print("🛑 Redis connection closed (API Gateway)")
    except Exception as e:
        print("⚠️ Error closing Redis connection:", e)

# ── Register all HTTP Routers ────────────────────────────────────────────────
app.include_router(signals.router)
app.include_router(auth.router)
app.include_router(history.router)
app.include_router(sse.router)
app.include_router(ai_insights.router)
app.include_router(analytics.router)
app.include_router(overrides.router)
app.include_router(IncidentTracker.router)
app.include_router(billing.router)
app.include_router(services.router)
app.include_router(adaptive_timeout.router)
app.include_router(traces.router)
app.include_router(flags.router)
app.include_router(agentic_payments.router)
