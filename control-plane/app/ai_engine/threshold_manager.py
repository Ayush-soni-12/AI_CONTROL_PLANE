"""
Threshold Manager — CRUD operations for AI-tuned thresholds.

Handles reading and writing AI thresholds to the database,
with fallback to sensible defaults when no AI data exists.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import models
from datetime import datetime, timezone
from typing import Dict, Optional


# Default thresholds (used when no AI data exists)
DEFAULTS = {
    'cache_latency_ms': 500,
    'circuit_breaker_error_rate': 0.3,
    'queue_deferral_rpm': 80,
    'load_shedding_rpm': 150,
    'rate_limit_customer_rpm': 15
}


async def get_threshold(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
    threshold_type: str
) -> float:
    """
    Get a single AI-tuned threshold value with fallback to defaults.
    
    Args:
        db: Database session
        user_id: User ID
        service_name: Service name
        endpoint: Endpoint path
        threshold_type: One of: cache_latency_ms, circuit_breaker_error_rate,
                        queue_deferral_rpm, load_shedding_rpm, rate_limit_customer_rpm
    
    Returns:
        Threshold value (AI-tuned or default)
    """
    stmt = select(models.AIThreshold).filter(
        models.AIThreshold.user_id == user_id,
        models.AIThreshold.service_name == service_name,
        models.AIThreshold.endpoint == endpoint
    )
    result = await db.execute(stmt)
    threshold = result.scalars().first()
    
    if threshold:
        return getattr(threshold, threshold_type, DEFAULTS.get(threshold_type))
    
    return DEFAULTS.get(threshold_type, 0)


async def get_all_thresholds(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str
) -> Dict:
    """
    Get all AI-tuned thresholds for a service/endpoint.
    
    Returns dict with all threshold values + metadata.
    Falls back to defaults if no AI data exists.
    """
    stmt = select(models.AIThreshold).filter(
        models.AIThreshold.user_id == user_id,
        models.AIThreshold.service_name == service_name,
        models.AIThreshold.endpoint == endpoint
    )
    result = await db.execute(stmt)
    threshold = result.scalars().first()
    
    if threshold:
        return {
            'cache_latency_ms': threshold.cache_latency_ms,
            'circuit_breaker_error_rate': threshold.circuit_breaker_error_rate,
            'queue_deferral_rpm': threshold.queue_deferral_rpm,
            'load_shedding_rpm': threshold.load_shedding_rpm,
            'rate_limit_customer_rpm': threshold.rate_limit_customer_rpm,
            'confidence': threshold.confidence,
            'reasoning': threshold.reasoning,
            'last_updated': threshold.last_updated.isoformat() if threshold.last_updated else None,
            'source': 'ai'
        }
    
    return {
        **DEFAULTS,
        'confidence': None,
        'reasoning': 'Using default thresholds (no AI analysis yet)',
        'last_updated': None,
        'source': 'default'
    }


async def update_thresholds(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
    thresholds: dict,
    reasoning: str,
    confidence: float
) -> models.AIThreshold:
    """
    Upsert AI-tuned thresholds for a service/endpoint.
    
    Creates new record or updates existing one.
    """
    # Try to find existing threshold
    stmt = select(models.AIThreshold).filter(
        models.AIThreshold.user_id == user_id,
        models.AIThreshold.service_name == service_name,
        models.AIThreshold.endpoint == endpoint
    )
    result = await db.execute(stmt)
    existing = result.scalars().first()
    
    if existing:
        # Update existing
        existing.cache_latency_ms = thresholds.get('cache_latency_ms', existing.cache_latency_ms)
        existing.circuit_breaker_error_rate = thresholds.get('circuit_breaker_error_rate', existing.circuit_breaker_error_rate)
        existing.queue_deferral_rpm = thresholds.get('queue_deferral_rpm', existing.queue_deferral_rpm)
        existing.load_shedding_rpm = thresholds.get('load_shedding_rpm', existing.load_shedding_rpm)
        existing.rate_limit_customer_rpm = thresholds.get('rate_limit_customer_rpm', existing.rate_limit_customer_rpm)
        existing.confidence = confidence
        existing.reasoning = reasoning
        existing.last_updated = datetime.now(timezone.utc)
        return existing
    else:
        # Create new
        new_threshold = models.AIThreshold(
            user_id=user_id,
            service_name=service_name,
            endpoint=endpoint,
            cache_latency_ms=thresholds.get('cache_latency_ms', DEFAULTS['cache_latency_ms']),
            circuit_breaker_error_rate=thresholds.get('circuit_breaker_error_rate', DEFAULTS['circuit_breaker_error_rate']),
            queue_deferral_rpm=thresholds.get('queue_deferral_rpm', DEFAULTS['queue_deferral_rpm']),
            load_shedding_rpm=thresholds.get('load_shedding_rpm', DEFAULTS['load_shedding_rpm']),
            rate_limit_customer_rpm=thresholds.get('rate_limit_customer_rpm', DEFAULTS['rate_limit_customer_rpm']),
            confidence=confidence,
            reasoning=reasoning,
            last_updated=datetime.now(timezone.utc)
        )
        db.add(new_threshold)
        return new_threshold
