"""
Billing router — Razorpay Order-based subscription management.

Uses one-time Orders (not Subscriptions) so:
  - Any card/UPI works (no RBI e-mandate required)
  - Users pay manually each month (no autopay)
  - plan_expires_at = now + 30 days after each payment

Flow:
  1. POST /create-order  → backend creates Razorpay Order, returns {order_id, key_id}
  2. Frontend opens checkout.js modal with order_id
  3. User pays → frontend gets {payment_id, order_id, signature}
  4. POST /verify-payment → backend verifies HMAC, extends plan 30 days
  5. Repeat monthly when user clicks "Renew"
"""

import hmac
import hashlib
import razorpay

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import models
from app.database.database import get_async_db
from app.router.token import get_current_user
from app.config import settings
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api/billing", tags=["Billing"])

# ── Plan definitions ───────────────────────────────────────────────────────────

PLANS = {
    "free": {
        "name": "Free",
        "amount_inr": 0,
        "amount_paise": 0,
        "signals_quota": 50_000,
        "services_quota": 2,
        "seats": 1,
    },
    "pro": {
        "name": "Pro",
        "amount_inr": 2400,
        "amount_paise": 240000,   # ₹2,400 in paise
        "signals_quota": 500_000,
        "services_quota": 10,
        "seats": 5,
    },
    "business": {
        "name": "Business",
        "amount_inr": 8200,
        "amount_paise": 820000,   # ₹8,200 in paise
        "signals_quota": None,    # Unlimited
        "services_quota": None,   # Unlimited
        "seats": 20,
    },
}

SELF_HOSTED_RESPONSE = {"message": "Billing not enabled in self-hosted mode."}


def _razorpay_client() -> razorpay.Client:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Razorpay is not configured on this server.",
        )
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def _is_plan_active(user: models.User) -> bool:
    """Check if the user's paid plan is still within its 30-day window."""
    if not user.plan_expires_at:
        return False
    return datetime.now(timezone.utc) < user.plan_expires_at


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    return {"cloud_mode": settings.IS_CLOUD_MODE, "plans": PLANS}


@router.get("/status")
async def get_billing_status(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    from app.redis.cache import redis_client

    if not settings.IS_CLOUD_MODE:
        return SELF_HOSTED_RESPONSE

    current_user = await get_current_user(request, db)

    # Auto-expire plan if the 30-day window has passed
    plan_tier = current_user.plan_tier or "free"
    if plan_tier != "free" and not _is_plan_active(current_user):
        current_user.plan_tier = "free"
        current_user.subscription_status = "expired"
        await db.commit()
        plan_tier = "free"

    plan = PLANS.get(plan_tier, PLANS["free"])

    stmt = select(func.count(func.distinct(models.Signal.service_name))).where(
        models.Signal.user_id == current_user.id
    )
    result = await db.execute(stmt)
    services_count = result.scalar_one() or 0

    # Read live signal usage from Redis instead of waiting for 100-batch PostgreSQL sync
    redis_key = f"quota:signals_used:{current_user.id}"
    try:
        redis_val = await redis_client.get(redis_key)
        signals_used = int(redis_val) if redis_val else current_user.signals_used_month
    except Exception:
        signals_used = current_user.signals_used_month

    return {
        "plan": plan_tier,
        "plan_name": plan["name"],
        "subscription_status": current_user.subscription_status or "active",
        "billing_period_start": current_user.billing_period_start,
        "plan_expires_at": current_user.plan_expires_at,
        "signals_used_month": signals_used,
        "signals_quota": plan["signals_quota"],
        "services_count": services_count,
        "services_quota": plan["services_quota"],
        "seats": plan["seats"],
    }


@router.post("/create-order")
async def create_order(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Create a one-time Razorpay Order for manual monthly payment.
    Returns {order_id, key_id, amount} for the frontend checkout modal.
    """
    if not settings.IS_CLOUD_MODE:
        return SELF_HOSTED_RESPONSE

    body = await request.json()
    plan_tier = body.get("plan", "pro")

    if plan_tier not in PLANS or plan_tier == "free":
        raise HTTPException(status_code=400, detail="Invalid plan tier.")

    target_plan = PLANS[plan_tier]
    client = _razorpay_client()
    current_user = await get_current_user(request, db)

    order = client.order.create({
        "amount": target_plan["amount_paise"],
        "currency": "INR",
        "notes": {
            "user_id": str(current_user.id),
            "user_email": current_user.email,
            "plan_tier": plan_tier,
        },
    })

    return {
        "order_id": order["id"],
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": target_plan["amount_paise"],
        "amount_inr": target_plan["amount_inr"],
        "plan_tier": plan_tier,
        "plan_name": target_plan["name"],
        "currency": "INR",
    }


@router.post("/verify-payment")
async def verify_payment(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Verify the Razorpay payment after the checkout modal completes.
    On success, activates the user's plan for 30 days.
    """
    if not settings.IS_CLOUD_MODE:
        return SELF_HOSTED_RESPONSE

    body = await request.json()
    payment_id = body.get("razorpay_payment_id", "")
    order_id = body.get("razorpay_order_id", "")
    signature = body.get("razorpay_signature", "")
    plan_tier = body.get("plan_tier", "pro")

    if not all([payment_id, order_id, signature]):
        raise HTTPException(status_code=400, detail="Missing payment fields.")

    if not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured.")

    # ── Verify HMAC-SHA256: message = order_id|payment_id ────────────────────
    message = f"{order_id}|{payment_id}"
    expected_sig = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature.")

    # ── Activate plan for 30 days ─────────────────────────────────────────────
    current_user = await get_current_user(request, db)
    now = datetime.now(timezone.utc)

    current_user.subscription_id = order_id
    current_user.subscription_status = "active"
    current_user.plan_tier = plan_tier
    current_user.billing_period_start = now
    current_user.plan_expires_at = now + timedelta(days=30)
    # Reset signal counter on each new billing period payment
    current_user.signals_used_month = 0
    await db.commit()

    print(f"✅ Payment verified: user={current_user.email} plan={plan_tier} expires={current_user.plan_expires_at}")
    return {
        "success": True,
        "plan": plan_tier,
        "expires_at": current_user.plan_expires_at.isoformat(),
    }





@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Handle Razorpay webhook events (optional with Orders — used for payment failure alerts).
    """
    if not settings.IS_CLOUD_MODE:
        return {"received": True}

    payload = await request.body()
    sig_header = request.headers.get("x-razorpay-signature", "")

    if settings.RAZORPAY_WEBHOOK_SECRET:
        expected_sig = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, sig_header):
            raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    import json
    event = json.loads(payload)
    event_type = event.get("event", "")
    print(f"📩 Razorpay webhook: {event_type}")

    # The payload structure depends on the event, usually under event["payload"]["payment"]["entity"]
    # We will safely extract the order_id to find the user.
    try:
        payment_entity = event.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        notes = payment_entity.get("notes", {})
        user_email = notes.get("user_email")
        plan_tier = notes.get("plan_tier", "pro")
    except Exception as e:
        print(f"⚠️ Webhook parsing error: {e}")
        return {"received": True}

    if not order_id and not user_email:
        return {"received": True}

    # Handle successful payment capture
    if event_type == "payment.captured":
        # Find user by email (we packed this into the Razorpay order notes)
        if user_email:
            stmt = select(models.User).where(models.User.email == user_email)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                # If they already activated via verify-payment, we don't need to double-extend.
                # Check if this order_id is already their current active subscription.
                if user.subscription_id != order_id:
                    now = datetime.now(timezone.utc)
                    user.subscription_id = order_id
                    user.subscription_status = "active"
                    user.plan_tier = plan_tier
                    user.billing_period_start = now
                    user.plan_expires_at = now + timedelta(days=30)
                    user.signals_used_month = 0
                    await db.commit()
                    print(f"✅ Webhook upgraded user: {user.email} to {plan_tier}")

    # Handle refunds
    elif event_type in ("refund.created", "refund.processed", "payment.refunded"):
        if user_email:
            stmt = select(models.User).where(models.User.email == user_email)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                user.subscription_status = "cancelled"
                user.plan_tier = "free"
                user.plan_expires_at = None
                await db.commit()
                print(f"⚠️ Webhook downgraded user due to refund: {user.email}")

    return {"received": True}
