"""
Traces Router — Distributed Tracing Collector

Endpoints:
  POST /api/traces/spans          — receive span batch from SDK
  GET  /api/traces/{trace_id}     — fetch all spans for a trace, structured as tree

Design notes:
- POST is fire-and-forget via asyncio.create_task (never blocks SDK response)
- GET returns spans ordered by start_time with depth computed from parent_span_id
- Follows the same async SQLAlchemy session pattern used throughout this codebase
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pydantic import BaseModel, Field
from typing import Optional
from app.database import models
from app.database.database import get_async_db, AsyncSessionLocal
from app.router.token import get_current_user
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/traces",
    tags=["Distributed Tracing"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class SpanIn(BaseModel):
    span_id:        str
    parent_span_id: Optional[str] = None
    operation:      str
    start_time:     str            # ISO-8601 from SDK
    end_time:       Optional[str] = None
    duration_ms:    Optional[float] = None
    attributes:     Optional[dict] = None


class SpanBatchIn(BaseModel):
    trace_id:     str = Field(..., min_length=32, max_length=32)
    service_name: str
    tenant_id:    Optional[str] = None
    spans:        list[SpanIn] = Field(..., min_length=1, max_length=500)


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_tree(spans: list[dict]) -> list[dict]:
    """
    Build a flat list annotated with 'depth' based on parent_span_id.
    Ordered by start_time, roots first (depth=0), children indented.
    """
    span_map = {s["span_id"]: s for s in spans}

    def _depth(span_id: str, visited: set) -> int:
        if span_id in visited:
            return 0  # Break cycles
        visited.add(span_id)
        span = span_map.get(span_id)
        if not span or not span.get("parent_span_id"):
            return 0
        return 1 + _depth(span["parent_span_id"], visited)

    for span in spans:
        span["depth"] = _depth(span["span_id"], set())

    # Sort: root spans first, then by start_time
    return sorted(spans, key=lambda s: (s["depth"], s.get("start_time", "")))


async def _persist_spans(batch: SpanBatchIn, user_id: Optional[int]):
    """
    Bulk-insert spans into the database.
    Runs as a fire-and-forget background task.
    """
    try:
        async with AsyncSessionLocal() as session:
            for s in batch.spans:
                # Parse times — be forgiving of slightly malformed ISO strings
                try:
                    start = datetime.fromisoformat(s.start_time.replace("Z", "+00:00"))
                except Exception:
                    start = datetime.now(timezone.utc)

                end = None
                if s.end_time:
                    try:
                        end = datetime.fromisoformat(s.end_time.replace("Z", "+00:00"))
                    except Exception:
                        pass

                session.add(models.Span(
                    trace_id=batch.trace_id,
                    span_id=s.span_id,
                    parent_span_id=s.parent_span_id,
                    operation=s.operation,
                    service_name=batch.service_name,
                    tenant_id=batch.tenant_id,
                    user_id=user_id,
                    start_time=start,
                    end_time=end,
                    duration_ms=s.duration_ms,
                    attributes=s.attributes or {},
                ))

            await session.commit()
            logger.debug(
                f"[Traces] Stored {len(batch.spans)} spans for trace {batch.trace_id[:8]}..."
            )

    except Exception as e:
        logger.warning(f"[Traces] Failed to persist spans for {batch.trace_id}: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/traces/spans
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/spans", status_code=202)
async def ingest_spans(
    payload: SpanBatchIn,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Receive a batch of spans from the neuralcontrol SDK.

    Authenticated via Bearer token (same as all other SDK endpoints).
    Returns 202 immediately — persistence happens in a background task
    so the SDK is never blocked waiting for DB writes.
    """
    # Authenticate
    try:
        current_user = await get_current_user(request, db)
        user_id = current_user.id
    except Exception:
        user_id = None  # Accept unauthenticated spans (tenant-id backed flows)

    # Fire-and-forget — never block the SDK's flush loop
    asyncio.create_task(_persist_spans(payload, user_id))

    return {"accepted": True, "span_count": len(payload.spans), "trace_id": payload.trace_id}


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/traces/{trace_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{trace_id}")
async def get_trace(
    trace_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Fetch all spans for a trace, returned as a depth-annotated flat list
    ordered by start_time (roots before children).

    Used by the dashboard 'View trace' button to render the waterfall diagram.
    """
    current_user = await get_current_user(request, db)

    stmt = (
        select(models.Span)
        .where(
            models.Span.trace_id == trace_id,
            models.Span.user_id == current_user.id,
        )
        .order_by(models.Span.start_time)
    )

    result = await db.execute(stmt)
    spans = result.scalars().all()

    if not spans:
        raise HTTPException(status_code=404, detail=f"No spans found for trace {trace_id}")

    spans_raw = [
        {
            "span_id":        s.span_id,
            "parent_span_id": s.parent_span_id,
            "operation":      s.operation,
            "service_name":   s.service_name,
            "start_time":     s.start_time.isoformat() if s.start_time else None,
            "end_time":       s.end_time.isoformat() if s.end_time else None,
            "duration_ms":    s.duration_ms,
            "attributes":     s.attributes or {},
            "is_slow":        (s.duration_ms or 0) > 500,  # pre-computed for UI
        }
        for s in spans
    ]

    tree = _build_tree(spans_raw)

    # Compute total trace duration from first start → last end
    total_duration_ms = 0
    if spans_raw:
        # If the first span is root, its duration represents the entire request
        if spans_raw[0].get("parent_span_id") is None and spans_raw[0].get("duration_ms"):
            total_duration_ms = spans_raw[0]["duration_ms"]
        else:
            # Fallback: largest duration or naive max-min
            durations = [s["duration_ms"] for s in spans_raw if s["duration_ms"] is not None]
            total_duration_ms = max(durations) if durations else 0

    return {
        "trace_id":     trace_id,
        "span_count":   len(tree),
        "duration_ms":  round(total_duration_ms, 2),
        "spans":        tree,
    }
