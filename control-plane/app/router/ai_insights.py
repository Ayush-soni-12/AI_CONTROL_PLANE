"""
AI Insights Router — API endpoints for AI analysis data.

Provides endpoints for the dashboard to display:
- AI-generated insights (patterns, anomalies, recommendations)
- Current AI-tuned thresholds per service/endpoint
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import models
from app.database.database import get_async_db
from app.router.token import get_current_user
from app.ai_engine.threshold_manager import get_all_thresholds

router = APIRouter(
    prefix="/api/ai",
    tags=['AI Insights']
)


@router.get("/insights")
async def get_ai_insights(
    request: Request,
    service_name: str = None,
    limit: int = 20,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get recent AI insights for the authenticated user.
    
    Optional filters:
    - service_name: Filter by service
    - limit: Max results (default 20, max 100)
    """
    current_user = await get_current_user(request, db)
    
    limit = min(limit, 100)
    
    stmt = select(models.AIInsight).filter(
        models.AIInsight.user_id == current_user.id
    )
    
    if service_name:
        stmt = stmt.filter(models.AIInsight.service_name == service_name)
    
    stmt = stmt.order_by(models.AIInsight.created_at.desc()).limit(limit)
    
    result = await db.execute(stmt)
    insights = result.scalars().all()
    
    return {
        "insights": [
            {
                "id": insight.id,
                "service_name": insight.service_name,
                "insight_type": insight.insight_type,
                "description": insight.description,
                "confidence": insight.confidence,
                "created_at": insight.created_at.isoformat() if insight.created_at else None
            }
            for insight in insights
        ],
        "total": len(insights)
    }


@router.get("/thresholds/{service_name}/{endpoint:path}")
async def get_ai_thresholds(
    service_name: str,
    endpoint: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get current AI-tuned thresholds for a specific service/endpoint.
    
    Returns the AI-recommended values or defaults if no AI analysis yet.
    """
    current_user = await get_current_user(request, db)
    
    # Normalize endpoint
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint
    
    thresholds = await get_all_thresholds(
        db, current_user.id, service_name, endpoint
    )
    
    return {
        "service_name": service_name,
        "endpoint": endpoint,
        "thresholds": thresholds
    }


@router.get("/thresholds")
async def get_all_ai_thresholds(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all AI-tuned thresholds for the authenticated user.
    """
    current_user = await get_current_user(request, db)
    
    stmt = select(models.AIThreshold).filter(
        models.AIThreshold.user_id == current_user.id
    ).order_by(models.AIThreshold.last_updated.desc())
    
    result = await db.execute(stmt)
    thresholds = result.scalars().all()
    
    return {
        "thresholds": [
            {
                "service_name": t.service_name,
                "endpoint": t.endpoint,
                "cache_latency_ms": t.cache_latency_ms,
                "circuit_breaker_error_rate": t.circuit_breaker_error_rate,
                "queue_deferral_rpm": t.queue_deferral_rpm,
                "load_shedding_rpm": t.load_shedding_rpm,
                "rate_limit_customer_rpm": t.rate_limit_customer_rpm,
                "confidence": t.confidence,
                "reasoning": t.reasoning,
                "last_updated": t.last_updated.isoformat() if t.last_updated else None
            }
            for t in thresholds
        ],
        "total": len(thresholds)
    }
