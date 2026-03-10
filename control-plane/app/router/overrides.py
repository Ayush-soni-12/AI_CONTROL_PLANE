"""
Config Override Router
======================
API endpoints for creating, listing, and cancelling manual overrides.

An override lets a user force specific traffic-management flags (cache,
circuit breaker, load shedding, etc.) for a service/endpoint for a fixed
duration, bypassing the AI decision engine.

Endpoints
---------
POST   /api/overrides                                 – create override
GET    /api/overrides                                 – list all (active + recent)
GET    /api/overrides/{service_name}/{endpoint:path}  – active override for one endpoint
DELETE /api/overrides/{override_id}                   – cancel (deactivate) an override
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import models
from app.database.database import get_async_db
from app.dependencies import verify_api_key
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field
from app.database.Schema import OverrideCreate, OverrideResponse
from typing import Optional
from .auth import get_current_user

router = APIRouter(prefix="/api/overrides", tags=["Overrides"])


# ─────────────────────────── Pydantic schemas ───────────────────────────────




def _to_response(override: models.ConfigOverride) -> OverrideResponse:
    now = datetime.now(timezone.utc)
    expires = override.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    still_active = override.is_active and expires > now
    minutes_remaining = int((expires - now).total_seconds() / 60) if still_active else None

    return OverrideResponse(
        id=override.id,
        service_name=override.service_name,
        endpoint=override.endpoint,
        reason=override.reason,
        cache_latency_ms=override.cache_latency_ms,
        circuit_breaker_error_rate=override.circuit_breaker_error_rate,
        queue_deferral_rpm=override.queue_deferral_rpm,
        load_shedding_rpm=override.load_shedding_rpm,
        rate_limit_customer_rpm=override.rate_limit_customer_rpm,
        adaptive_timeout_latency_ms=override.adaptive_timeout_latency_ms,
        created_at=override.created_at,
        expires_at=override.expires_at,
        is_active=still_active,
        minutes_remaining=minutes_remaining,
    )


# ─────────────────────────── Endpoints ──────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=OverrideResponse)
async def create_override(
    request: Request,
    payload: OverrideCreate,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Create a manual threshold override for a service/endpoint.

    Any threshold left as null will still be decided by the AI engine.
    The override expires automatically after `duration_minutes`.
    """

    current_user = await get_current_user(request, db)
    endpoint = payload.endpoint if payload.endpoint.startswith('/') else '/' + payload.endpoint

    # Deactivate any existing active override for the same endpoint first
    stmt = select(models.ConfigOverride).where(
        and_(
            models.ConfigOverride.user_id == current_user.id,
            models.ConfigOverride.service_name == payload.service_name,
            models.ConfigOverride.endpoint == endpoint,
            models.ConfigOverride.is_active == True,
        )
    )
    result = await db.execute(stmt)
    for old in result.scalars().all():
        old.is_active = False

    now = datetime.now(timezone.utc)
    override = models.ConfigOverride(
        user_id=current_user.id,
        service_name=payload.service_name,
        endpoint=endpoint,
        reason=payload.reason,
        cache_latency_ms=payload.cache_latency_ms,
        circuit_breaker_error_rate=payload.circuit_breaker_error_rate,
        queue_deferral_rpm=payload.queue_deferral_rpm,
        load_shedding_rpm=payload.load_shedding_rpm,
        rate_limit_customer_rpm=payload.rate_limit_customer_rpm,
        adaptive_timeout_latency_ms=payload.adaptive_timeout_latency_ms,
        created_at=now,
        expires_at=now + timedelta(minutes=payload.duration_minutes),
        is_active=True,
    )
    db.add(override)
    await db.commit()
    await db.refresh(override)

    print(
        f"✏️  Override created: {payload.service_name}{endpoint} "
        f"for {payload.duration_minutes} min by user {current_user.email} — {payload.reason}"
    )
    return _to_response(override)



@router.get("", response_model=list[OverrideResponse])
async def list_overrides(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    List all overrides (active and recently expired) for the current user.
    Returns the last 50 overrides ordered by creation time.
    """

    current_user =await get_current_user(request,db)

    stmt = (
        select(models.ConfigOverride)
        .where(models.ConfigOverride.user_id == current_user.id)
        .order_by(models.ConfigOverride.created_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    overrides = result.scalars().all()
    return [_to_response(o) for o in overrides]


@router.get("/{service_name}/{endpoint:path}", response_model=Optional[OverrideResponse])
async def get_active_override(
    request: Request,
    service_name: str,
    endpoint: str,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get the currently active override for a specific service/endpoint.
    Returns null if no active override exists.
    """

    current_user =await get_current_user(request,db)
    endpoint = endpoint if endpoint.startswith('/') else '/' + endpoint
    now = datetime.now(timezone.utc)

    stmt = select(models.ConfigOverride).where(
        and_(
            models.ConfigOverride.user_id == current_user.id,
            models.ConfigOverride.service_name == service_name,
            models.ConfigOverride.endpoint == endpoint,
            models.ConfigOverride.is_active == True,
            models.ConfigOverride.expires_at > now,
        )
    ).order_by(models.ConfigOverride.created_at.desc())

    result = await db.execute(stmt)
    override = result.scalars().first()
    return _to_response(override) if override else None


@router.delete("/{override_id}", status_code=status.HTTP_200_OK)
async def cancel_override(
    request: Request,
    override_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Cancel (deactivate) an override immediately.
    The AI engine will resume control on the next request.
    """
    current_user =await get_current_user(request,db)
    stmt = select(models.ConfigOverride).where(
        and_(
            models.ConfigOverride.id == override_id,
            models.ConfigOverride.user_id == current_user.id,
        )
    )
    result = await db.execute(stmt)
    override = result.scalars().first()

    if not override:
        raise HTTPException(status_code=404, detail="Override not found")

    override.is_active = False
    await db.commit()

    print(f"🗑️  Override {override_id} cancelled for {override.service_name}{override.endpoint}")
    return {
        "message": "Override cancelled. AI engine will resume control.",
        "override_id": override_id,
    }
