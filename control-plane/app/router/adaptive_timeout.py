"""
Adaptive Timeout Router — API endpoints for the Adaptive Timeout dashboard.

Provides:
  GET /api/adaptive-timeout/status
    → Per-endpoint adaptive timeout status for the authenticated user.
      Returns current p99, threshold, recommended timeout, active flag, trend.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone

from app.database import models
from app.database.database import get_async_db
from app.router.token import get_current_user
from app.realtime_aggregates import get_realtime_metrics
from app.ai_engine.threshold_manager import get_all_thresholds

router = APIRouter(
    prefix="/api/adaptive-timeout",
    tags=["Adaptive Timeout"],
)


def _latency_trend(p99_1h: float, p99_24h: float) -> str:
    if p99_24h <= 0:
        return "stable"
    change = (p99_1h - p99_24h) / p99_24h
    if change > 0.15:
        return "rising"
    if change < -0.15:
        return "falling"
    return "stable"


@router.get("/status")
async def get_adaptive_timeout_status(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Return per-endpoint adaptive timeout status for the authenticated user.

    For each tracked service/endpoint:
    - active: whether latency currently exceeds the AI-set threshold
    - recommended_timeout_ms: what the SDK is currently enforcing
    - threshold_ms: the AI-calculated "alarm line" (adaptive_timeout_latency_ms)
    - baseline_p99_ms: healthy p99 from the 24h window
    - current_p99_ms: recent p99 from the 1h window
    - latency_trend: rising / falling / stable
    """
    current_user = await get_current_user(request, db)

    # Collect distinct service/endpoint pairs with signal data
    stmt = select(
        models.Signal.service_name,
        models.Signal.endpoint,
    ).filter(
        models.Signal.user_id == current_user.id
    ).distinct()

    result = await db.execute(stmt)
    pairs = result.all()

    statuses = []

    for service_name, endpoint in pairs:
        try:
            # 1h metrics — primary (recent)
            metrics_1h = await get_realtime_metrics(
                user_id=current_user.id,
                service_name=service_name,
                endpoint=endpoint,
                window="1h",
                db=db,
            )
            if not metrics_1h or metrics_1h.get("count", 0) < 1:
                continue

            # 24h metrics — baseline
            metrics_24h = None
            try:
                metrics_24h = await get_realtime_metrics(
                    user_id=current_user.id,
                    service_name=service_name,
                    endpoint=endpoint,
                    window="24h",
                    db=db,
                )
            except Exception:
                pass

            # Current percentiles & baseline
            p50_now = float(metrics_1h.get("p50", 0) or 0)
            p95_now = float(metrics_1h.get("p95", 0) or 0)
            p99_now = float(metrics_1h.get("p99", 0) or 0)
            p99_baseline = float(
                (metrics_24h or {}).get("p99", p99_now) or p99_now
            )

            # Fetch manual override if active, else AI-tuned threshold, else 2000ms default
            stmt_override = select(models.ConfigOverride).filter(
                models.ConfigOverride.user_id == current_user.id,
                models.ConfigOverride.service_name == service_name,
                models.ConfigOverride.endpoint == endpoint,
                models.ConfigOverride.is_active == True,
                models.ConfigOverride.expires_at > datetime.now(timezone.utc),
            )
            res_override = await db.execute(stmt_override)
            override = res_override.scalars().first()

            stmt_ai = select(models.AIThreshold).filter(
                models.AIThreshold.user_id == current_user.id,
                models.AIThreshold.service_name == service_name,
                models.AIThreshold.endpoint == endpoint,
            )
            res_ai = await db.execute(stmt_ai)
            ai_thresh = res_ai.scalars().first()

            if override and override.adaptive_timeout_latency_ms is not None:
                threshold_ms = int(override.adaptive_timeout_latency_ms)
            elif ai_thresh and ai_thresh.adaptive_timeout_latency_ms is not None:
                threshold_ms = int(ai_thresh.adaptive_timeout_latency_ms)
            else:
                threshold_ms = 2000

            # Compute recommended timeout (what the SDK enforces)
            recommended_timeout_ms = threshold_ms

            # Active: current p99 exceeds the threshold
            is_active = p99_now > threshold_ms

            # Trend
            trend = _latency_trend(p99_now, p99_baseline)

            statuses.append({
                "service_name": service_name,
                "endpoint": endpoint,
                "active": is_active,
                "recommended_timeout_ms": recommended_timeout_ms,
                "threshold_ms": threshold_ms,
                "p50_ms": round(p50_now, 1),
                "p95_ms": round(p95_now, 1),
                "baseline_p99_ms": round(p99_baseline, 1),
                "current_p99_ms": round(p99_now, 1),
                "latency_trend": trend,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            })

        except Exception as e:
            # Skip this endpoint if metrics are unavailable
            import logging
            logging.getLogger(__name__).warning(
                f"[AdaptiveTimeout] Skipped {service_name}{endpoint}: {e}"
            )
            continue

    # Sort: active (spiking) endpoints first, then by service + endpoint
    statuses.sort(key=lambda x: (not x["active"], x["service_name"], x["endpoint"]))

    return statuses
