"""
Incidents Router — API endpoints for the Incident Timeline feature

Endpoints:
  GET  /api/incidents                         — list all incidents for the user
  GET  /api/incidents/open                    — only open/active incidents
  GET  /api/incidents/service/{service_name}  — incidents for a specific service
  GET  /api/incidents/{incident_id}           — single incident with full timeline
  POST /api/incidents/{incident_id}/analyze   — trigger AI root cause analysis

Mount in main.py:
    from app.router.IncidentTracker import router as incident_router
    app.include_router(incident_router)
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.database.database import get_async_db
from app.router.token import get_current_user
from app.database.models import Incident, IncidentEvent, Span, STATUS_OPEN
from app.functions.IncidentTracker import (
    get_incidents,
    get_incident_with_events,
    add_ai_root_cause,
)
from app.ai_engine.llm_analyzer import analyze_incident_root_cause

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ─── Response Schemas ─────────────────────────────────────────────────────────

class IncidentEventOut(BaseModel):
    id: int
    event_type: str
    title: str
    description: Optional[str] = None
    latency_ms: float
    error_rate: float
    rpm: float
    event_metadata: Optional[dict] = None
    occurred_at: datetime
    trace_id: Optional[str] = None  # Populated when SDK has tracing: true

    class Config:
        from_attributes = True


class IncidentOut(BaseModel):
    id: int
    service_name: str
    endpoint: str
    title: str
    severity: str
    status: str
    peak_latency_ms: float
    peak_error_rate: float
    peak_rpm: float
    root_cause_summary: Optional[str] = None
    ai_confidence: Optional[str] = None
    started_at: datetime
    resolved_at: Optional[datetime] = None
    duration_secs: Optional[int] = None
    duration_display: str
    events: List[IncidentEventOut] = []

    class Config:
        from_attributes = True


class IncidentListOut(BaseModel):
    id: int
    service_name: str
    endpoint: str
    title: str
    severity: str
    status: str
    peak_latency_ms: float
    peak_error_rate: float
    started_at: datetime
    resolved_at: Optional[datetime] = None
    duration_secs: Optional[int] = None
    duration_display: str
    event_count: int = 0

    class Config:
        from_attributes = True


# ─── Helper: get db session from request ──────────────────────────────────────

async def _get_db_and_user(request: Request, db: AsyncSession):
    """
    Shared helper that authenticates the user using the provided DB session.
    Keeps all endpoints consistent with the existing manual-auth pattern.
    """
    user = await get_current_user(request, db)
    return db, user


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=List[IncidentListOut])
async def list_incidents(
    request: Request,
    service_name: Optional[str] = Query(None, description="Filter by service name"),
    status: Optional[str] = Query(None, description="Filter by status: open | resolved"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
):
    """
    List all incidents for the current user.
    Optionally filter by service name or status (open/resolved).
    """
    db, current_user = await _get_db_and_user(request, db)

    incidents = await get_incidents(
        db,
        user_id=current_user.id,
        service_name=service_name,
        status=status,
        limit=limit,
    )

    result = []
    for incident in incidents:
        event_count_result = await db.execute(
            select(IncidentEvent).where(IncidentEvent.incident_id == incident.id)
        )
        event_count = len(event_count_result.scalars().all())

        result.append(IncidentListOut(
            id=incident.id,
            service_name=incident.service_name,
            endpoint=incident.endpoint,
            title=incident.title,
            severity=incident.severity,
            status=incident.status,
            peak_latency_ms=incident.peak_latency_ms,
            peak_error_rate=incident.peak_error_rate,
            started_at=incident.started_at,
            resolved_at=incident.resolved_at,
            duration_secs=incident.duration_secs,
            duration_display=incident.duration_display(),
            event_count=event_count,
        ))

    return result


@router.get("/open", response_model=List[IncidentListOut])
async def list_open_incidents(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_async_db),
):
    """Get all currently open incidents — useful for dashboard alert badges."""
    db, current_user = await _get_db_and_user(request, db)

    incidents = await get_incidents(
        db,
        user_id=current_user.id,
        status=STATUS_OPEN,
        limit=limit,
    )

    result = []
    for incident in incidents:
        event_count_result = await db.execute(
            select(IncidentEvent).where(IncidentEvent.incident_id == incident.id)
        )
        event_count = len(event_count_result.scalars().all())

        result.append(IncidentListOut(
            id=incident.id,
            service_name=incident.service_name,
            endpoint=incident.endpoint,
            title=incident.title,
            severity=incident.severity,
            status=incident.status,
            peak_latency_ms=incident.peak_latency_ms,
            peak_error_rate=incident.peak_error_rate,
            started_at=incident.started_at,
            resolved_at=incident.resolved_at,
            duration_secs=incident.duration_secs,
            duration_display=incident.duration_display(),
            event_count=event_count,
        ))

    return result


@router.get("/service/{service_name}", response_model=List[IncidentListOut])
async def list_incidents_by_service(
    request: Request,
    service_name: str,
    status: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_async_db),
):
    """Get incidents for a specific service."""
    db, current_user = await _get_db_and_user(request, db)

    incidents = await get_incidents(
        db,
        user_id=current_user.id,
        service_name=service_name,
        status=status,
        limit=limit,
    )

    result = []
    for incident in incidents:
        event_count_result = await db.execute(
            select(IncidentEvent).where(IncidentEvent.incident_id == incident.id)
        )
        event_count = len(event_count_result.scalars().all())

        result.append(IncidentListOut(
            id=incident.id,
            service_name=incident.service_name,
            endpoint=incident.endpoint,
            title=incident.title,
            severity=incident.severity,
            status=incident.status,
            peak_latency_ms=incident.peak_latency_ms,
            peak_error_rate=incident.peak_error_rate,
            started_at=incident.started_at,
            resolved_at=incident.resolved_at,
            duration_secs=incident.duration_secs,
            duration_display=incident.duration_display(),
            event_count=event_count,
        ))

    return result


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    request: Request,
    incident_id: int,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get a single incident with its full timeline of events.
    This is what powers the visual timeline view.
    """
    db, current_user = await _get_db_and_user(request, db)

    incident = await get_incident_with_events(
        db, incident_id=incident_id, user_id=current_user.id
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events_result = await db.execute(
        select(IncidentEvent)
        .where(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.occurred_at)
    )
    events = events_result.scalars().all()

    return IncidentOut(
        id=incident.id,
        service_name=incident.service_name,
        endpoint=incident.endpoint,
        title=incident.title,
        severity=incident.severity,
        status=incident.status,
        peak_latency_ms=incident.peak_latency_ms,
        peak_error_rate=incident.peak_error_rate,
        peak_rpm=incident.peak_rpm,
        root_cause_summary=incident.root_cause_summary,
        ai_confidence=incident.ai_confidence,
        started_at=incident.started_at,
        resolved_at=incident.resolved_at,
        duration_secs=incident.duration_secs,
        duration_display=incident.duration_display(),
        events=[IncidentEventOut.model_validate(e) for e in events],
    )


@router.post("/{incident_id}/analyze", response_model=dict)
async def trigger_root_cause_analysis(
    request: Request,
    incident_id: int,
    timezone_offset: int = Query(0, description="Browser timezone offset in minutes"),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Trigger AI root cause analysis for an incident on demand.
    Can be called even if analysis already ran — will update with fresh analysis.
    """
    db, current_user = await _get_db_and_user(request, db)

    incident = await get_incident_with_events(
        db, incident_id=incident_id, user_id=current_user.id
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events_result = await db.execute(
        select(IncidentEvent)
        .where(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.occurred_at)
    )
    events = events_result.scalars().all()

    event_dicts = [
        {
            "event_type": e.event_type,
            "title": e.title,
            "description": e.description,
            "latency_ms": e.latency_ms,
            "error_rate": e.error_rate,
            "rpm": e.rpm,
            "occurred_at": (e.occurred_at - timedelta(minutes=timezone_offset)).isoformat() if timezone_offset else e.occurred_at.isoformat(),
        }
        for e in events
    ]

    try:
        # Build event list for LLM context
        event_dicts = [
            {
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "latency_ms": e.latency_ms,
                "error_rate": e.error_rate,
                "rpm": e.rpm,
                "occurred_at": (e.occurred_at - timedelta(minutes=timezone_offset)).isoformat() if timezone_offset else e.occurred_at.isoformat(),
            }
            for e in events
        ]

        # Fetch spans for this incident's trace_id (enables trace-backed root cause analysis)
        spans_data = []
        if incident.trace_id:
            spans_result = await db.execute(
                select(Span)
                .where(Span.trace_id == incident.trace_id)
                .order_by(Span.start_time)
            )
            incident_spans = spans_result.scalars().all()
            spans_data = [
                {
                    "operation": s.operation,
                    "duration_ms": s.duration_ms,
                    "is_slow": (s.duration_ms or 0) > 500,
                    "attributes": s.attributes or {},
                }
                for s in incident_spans
            ]

        analysis = await analyze_incident_root_cause(
            service_name=incident.service_name,
            endpoint=incident.endpoint,
            incident_title=incident.title,
            peak_latency_ms=incident.peak_latency_ms,
            peak_error_rate=incident.peak_error_rate,
            duration_secs=incident.duration_secs,
            events=event_dicts,
            spans=spans_data or None,  # None if tracing not enabled for this incident
        )

        if analysis:
            await add_ai_root_cause(
                db,
                incident_id=incident_id,
                summary=analysis.get("summary", "Analysis unavailable"),
                confidence=analysis.get("confidence", "low"),
            )
            return {
                "status": "ok",
                "summary": analysis.get("summary"),
                "confidence": analysis.get("confidence"),
            }
        else:
            raise HTTPException(status_code=500, detail="AI analysis returned no result")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Root cause analysis failed for incident {incident_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")