"""
agentic_payments.py — x402 Payment Gate Router
================================================

Three groups of endpoints:

1. INVOICE endpoint  — SDK calls this when a trusted agent hits rate limit.
                        Returns a 402-style payload with wallet + amount.

2. VERIFY endpoint   — The AI Agent calls this after paying on Avalanche.
                        We check the blockchain and grant burst access if valid.

3. SETTINGS endpoints — Dashboard calls these to let the customer save their
                         Avalanche wallet address and configure payment amounts.

4. HISTORY endpoint  — Dashboard calls this to show "Earnings from agents."
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional

from app.database import models
from app.database.database import get_async_db
from app.dependencies import verify_api_key
from app.blockchain.erc8004 import check_agent_reputation, format_reputation_for_response
from app.blockchain.avalanche import verify_payment
from .auth import get_current_user

router = APIRouter(prefix="/api/agentic", tags=["Agentic Payments"])

class InvoiceRequest(BaseModel):
    agent_id: str

@router.post("/invoice/{service_name}/{endpoint:path}")
async def get_or_create_invoice(
    service_name: str,
    endpoint: str,
    payload: InvoiceRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(verify_api_key)
):
    """
    Called by the SDK when an agent hits the rate limit.
    Checks reputation and issues an invoice, OR grants access if they already paid.
    """
    endpoint = endpoint if endpoint.startswith('/') else '/' + endpoint
    now = datetime.now(timezone.utc)

    # 1. Check if the customer has enabled Agentic Payments
    stmt = select(models.UserAgentSettings).where(
        models.UserAgentSettings.user_id == current_user.id
    )
    settings = (await db.execute(stmt)).scalars().first()

    if not settings or not settings.agentic_payments_enabled or not settings.avalanche_wallet:
        # Not enabled, just return 403 so the SDK blocks them with standard 429
        raise HTTPException(status_code=403, detail="Agentic payments disabled by customer")

    # 2. Check Agent Reputation (ERC-8004)
    reputation = check_agent_reputation(payload.agent_id)
    if not reputation["is_trusted"]:
        # Bad/Unknown agent — block them immediately
        raise HTTPException(status_code=403, detail=reputation["description"])

    # 3. Check if they ALREADY paid and have an active burst window
    stmt_active = select(models.AgentPayment).where(
        and_(
            models.AgentPayment.user_id == current_user.id,
            models.AgentPayment.agent_id == payload.agent_id,
            models.AgentPayment.service_name == service_name,
            models.AgentPayment.endpoint == endpoint,
            models.AgentPayment.status == "verified",
            models.AgentPayment.access_granted_until > now
        )
    )
    active_payment = (await db.execute(stmt_active)).scalars().first()

    if active_payment:
        # They already paid! Tell the SDK to let them through (override rate limit)
        return {"status": "authorized", "message": "Active burst window."}

    # 4. Issue a new invoice
    # We create a pending payment record
    payment = models.AgentPayment(
        user_id=current_user.id,
        agent_id=payload.agent_id,
        agent_erc8004_score=reputation["score"],
        service_name=service_name,
        endpoint=endpoint,
        status="pending"
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "status": "payment_required",
        "invoice_id": str(payment.id),
        "pay_to_wallet": settings.avalanche_wallet,
        "amount_wei": settings.payment_amount_wei,
        "reputation": format_reputation_for_response(reputation)
    }


class VerifyRequest(BaseModel):
    invoice_id: str
    tx_hash: str

@router.post("/verify")
async def verify_agent_payment(
    payload: VerifyRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Called directly by the AI Agent after it pays on Avalanche.
    """
    # 1. Find the pending invoice
    stmt = select(models.AgentPayment).where(
        and_(
            models.AgentPayment.id == int(payload.invoice_id),
            models.AgentPayment.status == "pending"
        )
    )
    payment = (await db.execute(stmt)).scalars().first()

    if not payment:
        raise HTTPException(status_code=404, detail="Invoice not found or already verified")

    # 2. Get customer's settings to know what to verify against
    stmt_settings = select(models.UserAgentSettings).where(
        models.UserAgentSettings.user_id == payment.user_id
    )
    settings = (await db.execute(stmt_settings)).scalars().first()

    if not settings:
        raise HTTPException(status_code=500, detail="Customer settings invalid")

    # 3. Call the Avalanche Blockchain!
    verify_result = verify_payment(
        tx_hash=payload.tx_hash,
        expected_recipient=settings.avalanche_wallet,
        min_amount_wei=int(settings.payment_amount_wei)
    )

    if not verify_result["verified"]:
        payment.status = "failed"
        payment.tx_hash = payload.tx_hash
        await db.commit()
        raise HTTPException(status_code=400, detail=verify_result["reason"])

    # 4. Success! Grant access.
    now = datetime.now(timezone.utc)
    payment.status = "verified"
    payment.tx_hash = payload.tx_hash
    payment.amount_paid_wei = str(verify_result["amount_avax"] * 10**18) # convert back to wei
    payment.verified_at = now
    payment.access_granted_until = now + timedelta(minutes=settings.access_duration_minutes)

    await db.commit()

    return {
        "verified": True,
        "message": "Payment confirmed on Avalanche.",
        "expires_in_minutes": settings.access_duration_minutes,
        "access_granted_until": payment.access_granted_until.isoformat()
    }


# ─────────────────────────────────────────────────────────────────────────────
# SETTINGS ENDPOINTS (Dashboard: Settings → Agentic Payments)
# ─────────────────────────────────────────────────────────────────────────────

class AgentSettingsUpdate(BaseModel):
    """
    What the customer submits in the dashboard form.
    All fields are optional — only provided fields are updated (PATCH semantics).
    """
    avalanche_wallet: Optional[str] = None           # Their receiving wallet address
    payment_amount_wei: Optional[str] = None         # How much to charge (in wei)
    access_duration_minutes: Optional[int] = None    # How long access lasts after pay
    agentic_payments_enabled: Optional[bool] = None  # Master on/off switch


@router.get("/settings")
async def get_agent_settings(
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dashboard: Load the customer's current Agentic Payment settings.
    Called when the Settings → Agentic Payments page loads.
    """
    stmt = select(models.UserAgentSettings).where(
        models.UserAgentSettings.user_id == current_user.id
    )
    settings = (await db.execute(stmt)).scalars().first()

    if not settings:
        # Return safe defaults if the customer hasn't configured this yet
        return {
            "avalanche_wallet": None,
            "payment_amount_wei": "10000000000000000",  # 0.01 AVAX
            "access_duration_minutes": 10,
            "agentic_payments_enabled": False,
        }

    return {
        "avalanche_wallet": settings.avalanche_wallet,
        "payment_amount_wei": settings.payment_amount_wei,
        "access_duration_minutes": settings.access_duration_minutes,
        "agentic_payments_enabled": settings.agentic_payments_enabled,
    }


@router.patch("/settings")
async def update_agent_settings(
    payload: AgentSettingsUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dashboard: Save the customer's Agentic Payment settings.
    Called when the customer hits "Save" in the Settings → Agentic Payments form.

    IMPORTANT: This is where the customer enters their Avalanche wallet address.
    That wallet is what agents will send money to directly.
    """
    stmt = select(models.UserAgentSettings).where(
        models.UserAgentSettings.user_id == current_user.id
    )
    settings = (await db.execute(stmt)).scalars().first()

    if not settings:
        # First time setup — create the settings row
        settings = models.UserAgentSettings(user_id=current_user.id)
        db.add(settings)

    # Apply only the fields that were provided (PATCH semantics)
    if payload.avalanche_wallet is not None:
        settings.avalanche_wallet = payload.avalanche_wallet
    if payload.payment_amount_wei is not None:
        settings.payment_amount_wei = payload.payment_amount_wei
    if payload.access_duration_minutes is not None:
        settings.access_duration_minutes = payload.access_duration_minutes
    if payload.agentic_payments_enabled is not None:
        settings.agentic_payments_enabled = payload.agentic_payments_enabled

    settings.updated_at = datetime.now(timezone.utc)
    await db.commit()

    return {"success": True, "message": "Agentic payment settings saved."}


# ─────────────────────────────────────────────────────────────────────────────
# HISTORY ENDPOINT (Dashboard: Payment History table)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/history")
async def get_payment_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Dashboard: Fetch the most recent agent payments for this customer.
    Powers the "Earnings from Agents" table in the dashboard.

    Returns payments sorted newest-first. Limit defaults to 50.
    """
    stmt = (
        select(models.AgentPayment)
        .where(models.AgentPayment.user_id == current_user.id)
        .order_by(desc(models.AgentPayment.created_at))
        .limit(limit)
    )
    payments = (await db.execute(stmt)).scalars().all()

    return {
        "payments": [
            {
                "id": p.id,
                "agent_id": p.agent_id,
                "agent_reputation_score": p.agent_erc8004_score,
                "service_name": p.service_name,
                "endpoint": p.endpoint,
                "status": p.status,
                "tx_hash": p.tx_hash,
                # Convert wei to AVAX for display (1 AVAX = 10^18 wei)
                "amount_avax": (
                    round(float(p.amount_paid_wei) / 10**18, 6)
                    if p.amount_paid_wei else None
                ),
                "access_granted_until": (
                    p.access_granted_until.isoformat()
                    if p.access_granted_until else None
                ),
                "created_at": p.created_at.isoformat(),
                # Snowtrace link so the customer can verify on-chain themselves
                "explorer_url": (
                    f"https://testnet.snowtrace.io/tx/{p.tx_hash}"
                    if p.tx_hash else None
                ),
            }
            for p in payments
        ],
        "total": len(payments),
    }
