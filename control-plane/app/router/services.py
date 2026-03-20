"""
Services Router
==============
Endpoints for managing registered services.

Since services don't have their own table (they are derived from the signals
table), deleting a service means removing all rows that reference
(user_id, service_name) across every related table.

Endpoints
---------
GET    /api/services                      – list unique service names for user
DELETE /api/services/{service_name}       – delete all data for a service
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, distinct
from app.database import models
from app.database.database import get_async_db
from app.router.auth import get_current_user
from app.redis.cache import cache_delete_pattern, cache_delete

router = APIRouter(prefix="/api/services", tags=["Services"])


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("")
async def list_services(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Return the list of unique service names for the authenticated user.
    Derived from the signals table.
    """
    current_user = await get_current_user(request, db)

    stmt = (
        select(distinct(models.Signal.service_name))
        .where(models.Signal.user_id == current_user.id)
        .order_by(models.Signal.service_name)
    )
    result = await db.execute(stmt)
    service_names = [row[0] for row in result.all()]

    return {"services": service_names, "total": len(service_names)}


@router.delete("/{service_name}", status_code=status.HTTP_200_OK)
async def delete_service(
    service_name: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Delete all data for a specific service.

    Removes rows from every table that stores (user_id, service_name) data:
      - signals
      - signal_aggregates_hourly
      - signal_aggregates_daily
      - aggregate_snapshots
      - ai_thresholds
      - ai_insights
      - config_overrides
      - incidents  (incident_events cascade automatically)

    Also flushes all Redis real-time aggregate keys for the service.
    """
    current_user = await get_current_user(request, db)
    uid = current_user.id

    # Verify the service exists first
    check_stmt = select(models.Signal.service_name).where(
        models.Signal.user_id == uid,
        models.Signal.service_name == service_name,
    ).limit(1)
    check_result = await db.execute(check_stmt)
    if not check_result.first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Service '{service_name}' not found.",
        )

    deleted_counts: dict[str, int] = {}

    # ── 1. Incidents (incident_events cascade via SQLAlchemy relationship) ──
    inc_stmt = select(models.Incident).where(
        models.Incident.user_id == uid,
        models.Incident.service_name == service_name,
    )
    inc_result = await db.execute(inc_stmt)
    incidents = inc_result.scalars().all()
    incident_count = len(incidents)
    for incident in incidents:
        await db.delete(incident)   # cascade deletes incident_events
    deleted_counts["incidents"] = incident_count

    # ── 2. Config overrides ──────────────────────────────────────────────────
    result = await db.execute(
        delete(models.ConfigOverride).where(
            models.ConfigOverride.user_id == uid,
            models.ConfigOverride.service_name == service_name,
        ).returning(models.ConfigOverride.id)
    )
    deleted_counts["config_overrides"] = len(result.all())

    # ── 3. AI Insights ───────────────────────────────────────────────────────
    result = await db.execute(
        delete(models.AIInsight).where(
            models.AIInsight.user_id == uid,
            models.AIInsight.service_name == service_name,
        ).returning(models.AIInsight.id)
    )
    deleted_counts["ai_insights"] = len(result.all())

    # ── 4. AI Thresholds ─────────────────────────────────────────────────────
    result = await db.execute(
        delete(models.AIThreshold).where(
            models.AIThreshold.user_id == uid,
            models.AIThreshold.service_name == service_name,
        ).returning(models.AIThreshold.id)
    )
    deleted_counts["ai_thresholds"] = len(result.all())

    # ── 5. Aggregate Snapshots ───────────────────────────────────────────────
    result = await db.execute(
        delete(models.AggregateSnapshot).where(
            models.AggregateSnapshot.user_id == uid,
            models.AggregateSnapshot.service_name == service_name,
        ).returning(models.AggregateSnapshot.id)
    )
    deleted_counts["aggregate_snapshots"] = len(result.all())

    # ── 6. Hourly Aggregates ─────────────────────────────────────────────────
    result = await db.execute(
        delete(models.SignalAggregateHourly).where(
            models.SignalAggregateHourly.user_id == uid,
            models.SignalAggregateHourly.service_name == service_name,
        ).returning(models.SignalAggregateHourly.id)
    )
    deleted_counts["signal_aggregates_hourly"] = len(result.all())

    # ── 7. Daily Aggregates ──────────────────────────────────────────────────
    result = await db.execute(
        delete(models.SignalAggregateDaily).where(
            models.SignalAggregateDaily.user_id == uid,
            models.SignalAggregateDaily.service_name == service_name,
        ).returning(models.SignalAggregateDaily.id)
    )
    deleted_counts["signal_aggregates_daily"] = len(result.all())

    # ── 7.5. Spans (Distributed Tracing) ─────────────────────────────────────
    result = await db.execute(
        delete(models.Span).where(
            models.Span.user_id == uid,
            models.Span.service_name == service_name,
        ).returning(models.Span.span_id)
    )
    deleted_counts["spans"] = len(result.all())

    # ── 8. Raw Signals (last — biggest table) ────────────────────────────────
    result = await db.execute(
        delete(models.Signal).where(
            models.Signal.user_id == uid,
            models.Signal.service_name == service_name,
        ).returning(models.Signal.id)
    )
    deleted_counts["signals"] = len(result.all())

    # ── Commit all DB changes ────────────────────────────────────────────────
    await db.commit()

    # ── 9. Flush Redis real-time aggregate keys ──────────────────────────────
    redis_pattern = f"rt_agg:user:{uid}:service:{service_name}:*"
    await cache_delete_pattern(redis_pattern)

    # ── 10. Flush 24h decision logs and alerts for this service ──────────────
    await cache_delete_pattern(f"decision_log:{uid}:{service_name}:*")
    await cache_delete_pattern(f"alert_sent:{uid}:{service_name}:*")
    
    # Revalidate the dashboard's service list cache
    await cache_delete(f"user:{uid}:services")

    total_deleted = sum(deleted_counts.values())

    print(
        f"🗑️  Service '{service_name}' deleted by user {current_user.email} — "
        f"{total_deleted} total records removed: {deleted_counts}"
    )

    return {
        "message": f"Service '{service_name}' and all its data have been permanently deleted.",
        "service_name": service_name,
        "deleted_counts": deleted_counts,
        "total_deleted": total_deleted,
    }
