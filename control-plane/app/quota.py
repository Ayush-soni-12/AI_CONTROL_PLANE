"""
Quota enforcement dependency.

Injected into signal ingestion endpoints (POST /api/signals and
POST /api/signals/batch) to enforce plan-based limits.

When IS_CLOUD_MODE=False (the default for self-hosted deployments)
this entire module is a no-op — no quotas are ever checked.
"""

from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from app.database import models
from app.database.database import get_async_db
from app.dependencies import verify_api_key
from app.config import settings
from app.redis.cache import redis_client

# ── Plan quota constants (mirrors billing.py) ─────────────────────────────────

PLAN_QUOTAS = {
    "free":     {"signals": 50_000,  "services": 2},
    "pro":      {"signals": 500_000, "services": 10},
    "business": {"signals": None,    "services": None},  # Unlimited
}


async def _get_services_count(user_id: int, db: AsyncSession) -> int:
    """Count distinct service_name values for a user (cached in Redis for 60s)."""
    cache_key = f"quota:services_count:{user_id}"

    try:
        cached = await redis_client.get(cache_key)
        if cached is not None:
            return int(cached)
    except Exception:
        pass  # Redis unavailable, fall through to DB

    stmt = select(func.count(func.distinct(models.Signal.service_name))).where(
        models.Signal.user_id == user_id
    )
    result = await db.execute(stmt)
    count = result.scalar_one() or 0

    try:
        await redis_client.setex(cache_key, 60, str(count))
    except Exception:
        pass

    return count


async def _increment_signal_counter(user_id: int, count: int, db: AsyncSession):
    """
    Atomically increment the signals_used_month counter in PostgreSQL.
    We use a Redis counter as a fast path and sync to DB every N signals
    to avoid a DB write on every single request.
    """
    redis_key = f"quota:signals_used:{user_id}"

    try:
        new_total = await redis_client.incrby(redis_key, count)
        # Sync to DB every 100 signals to keep PostgreSQL roughly accurate
        if new_total % 100 == 0:
            await db.execute(
                update(models.User)
                .where(models.User.id == user_id)
                .values(signals_used_month=new_total)
            )
            await db.commit()
    except Exception:
        # Redis unavailable — write directly to DB (slower but correct)
        await db.execute(
            update(models.User)
            .where(models.User.id == user_id)
            .values(signals_used_month=models.User.signals_used_month + count)
        )
        await db.commit()


async def check_quota(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(verify_api_key),
):
    """
    FastAPI dependency that enforces signal + service quotas.

    Usage:  Depends(check_quota)   on POST /api/signals endpoints.

    Raises HTTP 402 if:
      - the user has exceeded their monthly signal quota, OR
      - the payload contains a new service_name that would exceed the service quota.

    Returns the current_user so callers don't need a second DB lookup.
    """
    if not settings.IS_CLOUD_MODE:
        # Self-hosted: no quotas, return immediately
        return current_user

    plan_tier = current_user.plan_tier or "free"
    quotas = PLAN_QUOTAS.get(plan_tier, PLAN_QUOTAS["free"])

    # ── 1. Check signal quota ─────────────────────────────────────────────────
    signals_quota = quotas["signals"]
    if signals_quota is not None:
        # Fast path: check Redis counter first
        redis_key = f"quota:signals_used:{current_user.id}"
        try:
            redis_val = await redis_client.get(redis_key)
            signals_used = int(redis_val) if redis_val else current_user.signals_used_month
        except Exception:
            signals_used = current_user.signals_used_month

        if signals_used >= signals_quota:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "error": "quota_exceeded",
                    "message": f"Monthly signal quota of {signals_quota:,} reached. Upgrade your plan.",
                    "upgrade_url": "/dashboard/billing",
                    "used": signals_used,
                    "quota": signals_quota,
                },
            )

    # ── 2. Check services quota ───────────────────────────────────────────────
    services_quota = quotas["services"]
    if services_quota is not None:
        # Try to read the incoming service_name from the request body
        try:
            body = await request.json()
            # Single signal endpoint sends {"service_name": "..."}
            # Batch endpoint sends {"signals": [{"service_name": "..."}, ...]}
            if "service_name" in body:
                incoming_services = {body["service_name"]}
            elif "signals" in body:
                incoming_services = {s.get("service_name") for s in body.get("signals", []) if s.get("service_name")}
            else:
                incoming_services = set()
        except Exception:
            incoming_services = set()

        if incoming_services:
            # Get currently registered services
            stmt = select(func.distinct(models.Signal.service_name)).where(
                models.Signal.user_id == current_user.id
            )
            result = await db.execute(stmt)
            existing_services = {row[0] for row in result.all()}

            new_services = incoming_services - existing_services
            # ONLY block if they are trying to add a NEW service AND that addition
            # puts them over their allowed service quota.
            # If they already have 10 existing services on the Free plan (quota 2),
            # let them keep using those 10. Just block the 11th.
            if new_services and (len(existing_services) + len(new_services)) > services_quota:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "service_limit_reached",
                        "message": f"Service limit of {services_quota} reached on your plan. Upgrade to monitor more services.",
                        "upgrade_url": "/dashboard/billing",
                        "registered_services": len(existing_services),
                        "services_quota": services_quota,
                        "new_service_name": list(new_services)[0],
                    },
                )

    return current_user
