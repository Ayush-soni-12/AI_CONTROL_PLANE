import asyncio
import json
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sse_starlette.sse import EventSourceResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import models
from app.database.database import get_async_db
from app.router.token import get_current_user

router = APIRouter(prefix="/api/flags", tags=["Feature Flags"])

# ─── DTOs ──────────────────────────────────────────────────────────────────────

class FlagCreate(BaseModel):
    name: str
    service_name: str
    rollout_percent: int
    status: str = "disabled"

class FlagUpdate(BaseModel):
    rollout_percent: Optional[int] = None
    status: Optional[str] = None
    reason: Optional[str] = None

# Internal DTO for the AI bridge
class FlagDisable(BaseModel):
    reason: str
    trace_id: Optional[str] = None

# ─── SSE Broadcast State ───────────────────────────────────────────────────────
active_connections: Dict[str, List[asyncio.Queue]] = {}

def _broadcast_flag_update(service_name: str, flag_data: dict):
    if service_name in active_connections:
        for queue in active_connections[service_name]:
            asyncio.create_task(queue.put({
                "event": "flag_update",
                "data": json.dumps(flag_data)
            }))

# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/stream/{service_name}")
async def stream_flags(service_name: str, request: Request):
    """
    SSE stream for the React Dashboard or Node SDK to receive real-time flag updates.
    """
    queue = asyncio.Queue()
    
    if service_name not in active_connections:
        active_connections[service_name] = []
    active_connections[service_name].append(queue)
    
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                
                # Wait for next event
                message = await queue.get()
                yield message
        except asyncio.CancelledError:
            pass
        finally:
            active_connections[service_name].remove(queue)
            if not active_connections[service_name]:
                del active_connections[service_name]

    return EventSourceResponse(event_generator())

@router.get("/{service_name}")
async def list_flags(service_name: str, db: AsyncSession = Depends(get_async_db)):
    """Fetch all flags for a service (used by SDK initialization or dashboard)."""
    stmt = select(models.FeatureFlag).where(models.FeatureFlag.service_name == service_name)
    result = await db.execute(stmt)
    flags = result.scalars().all()
    
    output = []
    for f in flags:
        fd = {k: v for k, v in f.__dict__.items() if k != '_sa_instance_state'}
        if "created_at" in fd and fd["created_at"]: fd["created_at"] = fd["created_at"].isoformat()
        if "updated_at" in fd and fd["updated_at"]: fd["updated_at"] = fd["updated_at"].isoformat()
        output.append(fd)
        
    return {"flags": output}

@router.get("/{service_name}/audit")
async def get_audit_log(service_name: str, flag_name: Optional[str] = None, db: AsyncSession = Depends(get_async_db)):
    """Fetch the audit log for all flags in a service. Optional filter by flag_name."""
    stmt = select(models.FlagAuditLog).where(
        models.FlagAuditLog.service_name == service_name
    ).order_by(models.FlagAuditLog.created_at.desc()).limit(100)
    
    if flag_name:
        stmt = stmt.where(models.FlagAuditLog.flag_name == flag_name)
    
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    output = []
    for log in logs:
        ld = {k: v for k, v in log.__dict__.items() if k != '_sa_instance_state'}
        if "created_at" in ld and ld["created_at"]: ld["created_at"] = ld["created_at"].isoformat()
        output.append(ld)

    return {"logs": output}


@router.post("")
async def create_flag(payload: FlagCreate, db: AsyncSession = Depends(get_async_db), user: models.User = Depends(get_current_user)):
    """Create a new feature flag (Called by dashboard) - Upsert behavior"""
    # Check if flag exists
    stmt = select(models.FeatureFlag).where(
        models.FeatureFlag.name == payload.name, 
        models.FeatureFlag.service_name == payload.service_name
    )
    res = await db.execute(stmt)
    existing_flag = res.scalar_one_or_none()
    
    if existing_flag:
        # Update existing flag (Upsert)
        old_rollout = existing_flag.rollout_percent
        existing_flag.rollout_percent = payload.rollout_percent
        existing_flag.status = "enabled" if payload.rollout_percent > 0 else "disabled"
        existing_flag.updated_by = user.email
        
        # Audit log for update
        audit = models.FlagAuditLog(
            flag_name=payload.name,
            service_name=payload.service_name,
            old_rollout=old_rollout,
            new_rollout=payload.rollout_percent,
            changed_by=user.email,
            reason="Flag re-activated/updated via dashboard"
        )
        db.add(audit)
        await db.commit()
        await db.refresh(existing_flag)
        
        flag_dict = {k: v for k, v in existing_flag.__dict__.items() if k != '_sa_instance_state'}
        if "updated_at" in flag_dict and flag_dict["updated_at"]: flag_dict['updated_at'] = flag_dict['updated_at'].isoformat()
        if "created_at" in flag_dict and flag_dict["created_at"]: flag_dict['created_at'] = flag_dict['created_at'].isoformat()
        _broadcast_flag_update(payload.service_name, flag_dict)
        return flag_dict
        
    # Create new flag
    flag = models.FeatureFlag(
        name=payload.name,
        service_name=payload.service_name,
        tenant_id=str(user.id),
        rollout_percent=payload.rollout_percent,
        status="enabled" if payload.rollout_percent > 0 else "disabled",
        updated_by=user.email
    )
    db.add(flag)
    
    # Audit log
    audit = models.FlagAuditLog(
        flag_name=payload.name,
        service_name=payload.service_name,
        old_rollout=0,
        new_rollout=payload.rollout_percent,
        changed_by=user.email,
        reason="Initial creation"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(flag)
    
    flag_dict = {k: v for k, v in flag.__dict__.items() if k != '_sa_instance_state'}
    if "updated_at" in flag_dict and flag_dict["updated_at"]: flag_dict['updated_at'] = flag_dict['updated_at'].isoformat()
    if "created_at" in flag_dict and flag_dict["created_at"]: flag_dict['created_at'] = flag_dict['created_at'].isoformat()
    _broadcast_flag_update(payload.service_name, flag_dict)
    
    return flag_dict

@router.delete("/{service_name}/{name}")
async def delete_flag(service_name: str, name: str, db: AsyncSession = Depends(get_async_db), user: models.User = Depends(get_current_user)):
    """Permanently delete a feature flag and its audit logs."""
    stmt = select(models.FeatureFlag).where(
        models.FeatureFlag.name == name,
        models.FeatureFlag.service_name == service_name
    )
    res = await db.execute(stmt)
    flag = res.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
        
    # Delete audit logs first
    from sqlalchemy import delete
    await db.execute(
        delete(models.FlagAuditLog).where(
            models.FlagAuditLog.flag_name == name,
            models.FlagAuditLog.service_name == service_name
        )
    )
    
    # Delete the flag
    await db.delete(flag)
    await db.commit()
    
    # Broadcast a "deleted" event so the SDK/UI can remove it
    _broadcast_flag_update(service_name, {"name": name, "service_name": service_name, "status": "deleted"})
    
    return {"message": f"Flag '{name}' deleted successfully"}

@router.patch("/{service_name}/{name}")
async def update_flag(service_name: str, name: str, payload: FlagUpdate, db: AsyncSession = Depends(get_async_db), user: models.User = Depends(get_current_user)):
    """Update flag rollout percent manually (Called by dashboard)"""
    stmt = select(models.FeatureFlag).where(
        models.FeatureFlag.name == name,
        models.FeatureFlag.service_name == service_name
    )
    res = await db.execute(stmt)
    flag = res.scalar_one_or_none()
    
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
        
    old_rollout = flag.rollout_percent
    
    if payload.rollout_percent is not None:
        flag.rollout_percent = payload.rollout_percent
    if payload.status:
        flag.status = payload.status
        
    flag.updated_by = user.email
    
    audit = models.FlagAuditLog(
        flag_name=name,
        service_name=service_name,
        old_rollout=old_rollout,
        new_rollout=flag.rollout_percent,
        changed_by=user.email,
        reason=payload.reason or "Manual dashboard update"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(flag)
    
    flag_dict = {k: v for k, v in flag.__dict__.items() if k != '_sa_instance_state'}
    flag_dict['updated_at'] = flag_dict['updated_at'].isoformat()
    flag_dict['created_at'] = flag_dict['created_at'].isoformat()
    _broadcast_flag_update(service_name, flag_dict)
    
    return flag_dict

async def service_auto_disable_flag(
    service_name: str, 
    name: str, 
    reason: str, 
    trace_id: Optional[str], 
    db: AsyncSession
) -> Optional[dict]:
    """Core logic to disable a flag, used by both API and AI engine."""
    stmt = select(models.FeatureFlag).where(
        models.FeatureFlag.name == name,
        models.FeatureFlag.service_name == service_name
    )
    res = await db.execute(stmt)
    flag = res.scalar_one_or_none()
    
    if not flag:
        return None
        
    if flag.rollout_percent == 0 and flag.status == "auto-disabled":
        return {"status": "already disabled"}

    old_rollout = flag.rollout_percent
    flag.rollout_percent = 0
    flag.status = "auto-disabled"
    flag.updated_by = "NeuralControl AI"
    
    audit = models.FlagAuditLog(
        flag_name=name,
        service_name=service_name,
        old_rollout=old_rollout,
        new_rollout=0,
        changed_by="NeuralControl AI",
        reason=reason,
        trace_id=trace_id
    )
    db.add(audit)
    await db.commit()
    await db.refresh(flag)
    
    flag_dict = {k: v for k, v in flag.__dict__.items() if k != '_sa_instance_state'}
    if "updated_at" in flag_dict and flag_dict["updated_at"]: flag_dict['updated_at'] = flag_dict['updated_at'].isoformat()
    if "created_at" in flag_dict and flag_dict["created_at"]: flag_dict['created_at'] = flag_dict['created_at'].isoformat()
    
    _broadcast_flag_update(service_name, flag_dict)
    return flag_dict

@router.post("/{service_name}/{name}/disable")
async def auto_disable_flag(service_name: str, name: str, payload: FlagDisable, db: AsyncSession = Depends(get_async_db)):
    """
    Emergency kill-switch.
    Unlike other endpoints, this might be called INTERNALLY by the Decision Engine
    without a specific `User` dependency token attached, because background RabbitMQ
    workers do not carry user OAuth tokens.
    """
    result = await service_auto_disable_flag(
        service_name=service_name,
        name=name,
        reason=payload.reason,
        trace_id=payload.trace_id,
        db=db
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Flag not found")
    return result
