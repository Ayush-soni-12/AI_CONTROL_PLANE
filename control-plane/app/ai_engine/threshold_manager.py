"""
Threshold Manager — CRUD operations for AI-tuned thresholds.

Handles reading and writing AI thresholds to the database,
with fallback to sensible defaults when no AI data exists.

Staleness policy
────────────────
AI thresholds are recalculated every 5 minutes by the background analyzer.
If a service goes idle and then suddenly receives traffic, the stored
thresholds may be too old to be trustworthy (e.g. calibrated for different
traffic conditions hours ago).  When thresholds are older than
MAX_THRESHOLD_AGE_MINUTES we fall back to safe hardcoded defaults so that
no bad AI decision is made on stale data.
"""

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import models
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional


# How long AI thresholds are considered fresh.
# Background analyzer runs every 5 min, so 30 min = 6 missed cycles before we
# give up and fall back to defaults.  Tune this if you change the scheduler.
MAX_THRESHOLD_AGE_MINUTES = 30


# Default thresholds (used when no AI data exists)
DEFAULTS = {
    'cache_latency_ms': 500,
    'circuit_breaker_error_rate': 0.3,
    'queue_deferral_rpm': 80,
    'load_shedding_rpm': 150,
    'rate_limit_customer_rpm': 15,
    # Adaptive Timeout: recommended timeout the SDK should use for this endpoint.
    # AI tunes this based on historical p99 latency.
    # Default is 2000ms (2s) which is safe for most fast APIs.
    'adaptive_timeout_latency_ms': 2000,
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

    Staleness policy
    ────────────────
    If the stored thresholds are older than MAX_THRESHOLD_AGE_MINUTES we
    treat them as stale and return safe defaults.  This prevents the AI from
    making decisions based on thresholds calibrated for very different traffic
    conditions (e.g. a busy morning vs a quiet night).

    Falls back to defaults if:
      • No AI thresholds exist yet (new endpoint)
      • last_updated is None (corrupted row)
      • Thresholds are older than MAX_THRESHOLD_AGE_MINUTES
    """
    stmt = select(models.AIThreshold).filter(
        models.AIThreshold.user_id == user_id,
        models.AIThreshold.service_name == service_name,
        models.AIThreshold.endpoint == endpoint
    )
    result = await db.execute(stmt)
    threshold = result.scalars().first()

    if threshold and threshold.last_updated:
        now = datetime.now(timezone.utc)

        # Make last_updated timezone-aware if the DB stored it as naive UTC
        last_updated = threshold.last_updated
        if last_updated.tzinfo is None:
            last_updated = last_updated.replace(tzinfo=timezone.utc)

        age_minutes = (now - last_updated).total_seconds() / 60

        if age_minutes > MAX_THRESHOLD_AGE_MINUTES:
            # Thresholds are stale — fall back to safe defaults
            print(
                f"⚠️  [ThresholdManager] Thresholds for {service_name}{endpoint} are "
                f"{age_minutes:.0f} min old (limit: {MAX_THRESHOLD_AGE_MINUTES} min). "
                f"Falling back to defaults until background analyzer refreshes them."
            )
            return {
                **DEFAULTS,
                'confidence': None,
                'reasoning': (
                    f'Thresholds expired ({age_minutes:.0f} min old, limit {MAX_THRESHOLD_AGE_MINUTES} min). '
                    f'Using safe defaults until background analyzer refreshes them.'
                ),
                'last_updated': last_updated.isoformat(),
                'source': 'default_stale',  # distinct from 'default' (never had AI) and 'ai' (fresh)
            }

        # Fresh AI thresholds — use them
        return {
            'cache_latency_ms': threshold.cache_latency_ms,
            'circuit_breaker_error_rate': threshold.circuit_breaker_error_rate,
            'queue_deferral_rpm': threshold.queue_deferral_rpm,
            'load_shedding_rpm': threshold.load_shedding_rpm,
            'rate_limit_customer_rpm': threshold.rate_limit_customer_rpm,
            'adaptive_timeout_latency_ms': threshold.adaptive_timeout_latency_ms,
            'confidence': threshold.confidence,
            'reasoning': threshold.reasoning,
            'last_updated': last_updated.isoformat(),
            'source': 'ai',
        }

    # No record at all, or last_updated is NULL
    return {
        **DEFAULTS,
        'confidence': None,
        'reasoning': 'Using default thresholds (no AI analysis yet)',
        'last_updated': None,
        'source': 'default'
    }


async def _get_active_override(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
) -> models.ConfigOverride | None:
    """
    Return the active, non-expired ConfigOverride for this endpoint, or None.
    Shared helper used by threshold_manager and ai_engine to avoid circular imports.
    """
    if db is None or user_id is None:
        return None
    now = datetime.now(timezone.utc)
    stmt = (
        select(models.ConfigOverride)
        .where(
            and_(
                models.ConfigOverride.user_id == user_id,
                models.ConfigOverride.service_name == service_name,
                models.ConfigOverride.endpoint == endpoint,
                models.ConfigOverride.is_active == True,
                models.ConfigOverride.expires_at > now,
            )
        )
        .order_by(models.ConfigOverride.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalars().first()


def _apply_override(thresholds: dict, override: models.ConfigOverride) -> dict:
    """
    Merge a ConfigOverride's numeric values into a thresholds dict.
    Only non-None fields from the override replace the existing value.
    Returns a new dict (original is not mutated).
    """
    merged = dict(thresholds)
    mapping = {
        'cache_latency_ms': override.cache_latency_ms,
        'circuit_breaker_error_rate': override.circuit_breaker_error_rate,
        'queue_deferral_rpm': override.queue_deferral_rpm,
        'load_shedding_rpm': override.load_shedding_rpm,
        'rate_limit_customer_rpm': override.rate_limit_customer_rpm,
        'adaptive_timeout_latency_ms': override.adaptive_timeout_latency_ms,
    }
    for key, val in mapping.items():
        if val is not None:
            merged[key] = val
    return merged


async def get_all_thresholds_with_override(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
) -> Dict:
    """
    Get all thresholds for a service/endpoint, with any active ConfigOverride
    merged on top of the AI/default values.

    This is the preferred function for callers that need to display or act on
    the *effective* thresholds (i.e. what the system is actually using).

    Returns dict with all threshold values + metadata:
      - source: 'ai', 'default', or 'default_stale'
      - has_override: True if a ConfigOverride was applied
    """
    thresholds = await get_all_thresholds(db, user_id, service_name, endpoint)
    override = await _get_active_override(db, user_id, service_name, endpoint)
    if override is not None:
        thresholds = _apply_override(thresholds, override)
        thresholds['has_override'] = True
    else:
        thresholds['has_override'] = False
    return thresholds


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
        existing.adaptive_timeout_latency_ms = thresholds.get('adaptive_timeout_latency_ms', existing.adaptive_timeout_latency_ms)
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
            adaptive_timeout_latency_ms=thresholds.get('adaptive_timeout_latency_ms', DEFAULTS['adaptive_timeout_latency_ms']),
            confidence=confidence,
            reasoning=reasoning,
            last_updated=datetime.now(timezone.utc)
        )
        db.add(new_threshold)
        return new_threshold
