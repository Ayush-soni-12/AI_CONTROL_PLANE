"""
Incident Tracker

Called by decisionFunction.py every time a protection action fires.
Handles:
  - Opening a new incident when first serious event detected
  - Logging each event to the timeline (circuit breaker, load shedding, etc.)
  - Detecting recovery and auto-resolving the incident
  - Triggering AI root cause analysis after resolution

This is the ONLY place incidents are created/updated — keeps logic centralized.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.database.models import (
    Incident, IncidentEvent,
    STATUS_OPEN, STATUS_RESOLVED,
    SEVERITY_INFO, SEVERITY_WARNING, SEVERITY_CRITICAL,
    EVENT_LATENCY_SPIKE, EVENT_ERROR_SPIKE, EVENT_TRAFFIC_SPIKE,
    EVENT_CACHE_ENABLED, EVENT_CIRCUIT_BREAKER, EVENT_LOAD_SHEDDING,
    EVENT_QUEUE_DEFERRAL, EVENT_RATE_LIMITED, EVENT_RECOVERY_DETECTED,
    EVENT_INCIDENT_OPENED, EVENT_INCIDENT_RESOLVED, EVENT_AI_ROOT_CAUSE,
)

logger = logging.getLogger(__name__)

# How many consecutive healthy checks before auto-resolving
HEALTHY_CHECKS_TO_RESOLVE = 2


# ─── Event type config ─────────────────────────────────────────────────────────
# Maps decision flags → (event_type, title, plain-English description, severity)

EVENT_CONFIG = {
    "circuit_breaker": (
        EVENT_CIRCUIT_BREAKER,
        "🔴 Emergency stop activated",
        "The error rate got so high the system temporarily stopped accepting requests to prevent things from getting worse.",
        SEVERITY_CRITICAL,
    ),
    "load_shedding": (
        EVENT_LOAD_SHEDDING,
        "⚠️ Requests being dropped",
        "Traffic was too high so the system started dropping low-priority requests to keep the app running for critical users.",
        SEVERITY_WARNING,
    ),
    "queue_deferral": (
        EVENT_QUEUE_DEFERRAL,
        "🕐 Requests put in waiting line",
        "Traffic was getting busy so lower-priority requests were put in a queue to be processed when things calm down.",
        SEVERITY_INFO,
    ),
    "cache_enabled": (
        EVENT_CACHE_ENABLED,
        "💾 Caching turned on",
        "Response times were getting slow so the system turned on caching to serve repeated requests faster.",
        SEVERITY_WARNING,
    ),
    "rate_limit_customer": (
        EVENT_RATE_LIMITED,
        "🚫 A user was rate limited",
        "One IP address was sending too many requests per minute and was temporarily blocked.",
        SEVERITY_INFO,
    ),
}

# Metric thresholds that open an incident (even without an action firing)
LATENCY_INCIDENT_MS  = 600   # avg latency above this opens incident
ERROR_INCIDENT_RATE  = 0.10  # error rate above this opens incident
RPM_INCIDENT_LEVEL   = 100   # rpm above this opens incident


async def process_decision_for_incident(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
    decision: dict,
    metrics: dict,
    thresholds: dict = None,
    trace_id: str = None,  # Distributed tracing — links this decision to the request trace
) -> Optional[Incident]:
    """
    Called by decisionFunction.py after every decision is made.
    
    This function:
    1. Checks if any action fired or metrics crossed incident thresholds
    2. Opens a new incident (if none open) or finds the existing open one
    3. Logs the appropriate event(s) to the timeline
    4. If everything looks healthy, increments healthy_checks_count
    5. Resolves the incident when healthy long enough

    Args:
        db:           Async DB session
        user_id:      Owner of the service
        service_name: e.g. "payment-service"
        endpoint:     e.g. "/api/charge"
        decision:     Dict from make_decision() — contains cache_enabled, circuit_breaker, etc.
        metrics:      Dict with avg_latency, error_rate, rpm

    Returns:
        The incident object if one is open, else None
    """

    avg_latency = metrics.get("avg_latency", 0)
    error_rate  = metrics.get("error_rate", 0)
    rpm         = metrics.get("rpm", 0)
    reasoning   = decision.get("reasoning", "")

    # ─── Determine what fired ───────────────────────────────────────────────
    fired_actions = {
        key for key in ("circuit_breaker", "load_shedding", "queue_deferral",
                        "cache_enabled", "rate_limit_customer")
        if decision.get(key)
    }

    # Only block resolution if critical actions fired
    critical_actions = {
        key for key in ("circuit_breaker", "load_shedding", "queue_deferral", "cache_enabled")
        if key in fired_actions
    }

    # Use dynamic thresholds if priovided, else fallback to hardcoded defaults
    t_latency = thresholds.get("cache_latency_ms", LATENCY_INCIDENT_MS) if thresholds else LATENCY_INCIDENT_MS
    t_errors = thresholds.get("circuit_breaker_error_rate", ERROR_INCIDENT_RATE) if thresholds else ERROR_INCIDENT_RATE

    # Metric-based triggers (even if no action)
    metric_issues = []
    if avg_latency >= t_latency:
        metric_issues.append("latency")
    if error_rate >= t_errors:
        metric_issues.append("errors")

    is_problematic = bool(critical_actions) or bool(metric_issues)
    is_healthy = (
        not is_problematic
        and avg_latency < t_latency
        and error_rate < t_errors
    )

    # ─── Find existing open incident ────────────────────────────────────────
    result = await db.execute(
        select(Incident).where(
            and_(
                Incident.user_id == user_id,
                Incident.service_name == service_name,
                Incident.endpoint == endpoint,
                Incident.status == STATUS_OPEN,
            )
        ).order_by(desc(Incident.started_at)).limit(1)
    )
    incident: Optional[Incident] = result.scalar_one_or_none()

    # ─── CASE 1: Everything healthy, no open incident → nothing to do ────────
    if is_healthy and not incident:
        return None

    # ─── CASE 2: Healthy but incident is open → increment recovery counter ───
    if (not is_problematic) and incident:
        # We increment health checks as long as there are no critical actions and we're below the threshold
        incident.healthy_checks_count += 1
        if incident.healthy_checks_count >= HEALTHY_CHECKS_TO_RESOLVE:
            await _resolve_incident(db, incident, metrics)
        await db.commit()
        return incident

    # ─── CASE 3: Problematic, no open incident → open one ───────────────────
    if is_problematic and not incident:
        incident = await _open_incident(db, user_id, service_name, endpoint, metrics, fired_actions, trace_id=trace_id)

    # ─── CASE 4: Problematic with open incident → reset recovery counter ─────
    elif is_problematic and incident:
        incident.healthy_checks_count = 0
        # Update peak metrics
        if avg_latency > incident.peak_latency_ms:
            incident.peak_latency_ms = avg_latency
        if error_rate > incident.peak_error_rate:
            incident.peak_error_rate = error_rate
        if rpm > incident.peak_rpm:
            incident.peak_rpm = rpm

    # ─── Log events for each fired action ───────────────────────────────────
    for action_key, (event_type, title, description, _severity) in EVENT_CONFIG.items():
        if action_key in fired_actions:
            await _log_event(
                db, incident,
                event_type=event_type,
                title=title,
                description=description,
                latency_ms=avg_latency,
                error_rate=error_rate,
                rpm=rpm,
                event_metadata={"reasoning": reasoning, "action": action_key},
                trace_id=trace_id,
            )

    # Log raw metric spikes (even without an action firing)
    if "latency" in metric_issues and "cache_enabled" not in fired_actions:
        await _log_event(
            db, incident,
            event_type=EVENT_LATENCY_SPIKE,
            title=f"🐢 Response time spiked to {avg_latency:.0f}ms",
            description=f"The app took {avg_latency:.0f}ms on average to respond — significantly slower than normal.",
            latency_ms=avg_latency, error_rate=error_rate, rpm=rpm,
            trace_id=trace_id,
        )

    if "errors" in metric_issues and "circuit_breaker" not in fired_actions:
        await _log_event(
            db, incident,
            event_type=EVENT_ERROR_SPIKE,
            title=f"❗ {error_rate*100:.1f}% of requests are failing",
            description=f"About {error_rate*100:.1f}% of requests failed — that means roughly 1 in {max(1, int(1/error_rate))} users saw an error.",
            latency_ms=avg_latency, error_rate=error_rate, rpm=rpm,
            trace_id=trace_id,
        )

    # Escalate severity if circuit breaker fired
    if "circuit_breaker" in fired_actions and incident.severity != SEVERITY_CRITICAL:
        incident.severity = SEVERITY_CRITICAL

    await db.commit()
    await db.refresh(incident)
    return incident


async def _open_incident(
    db: AsyncSession,
    user_id: int,
    service_name: str,
    endpoint: str,
    metrics: dict,
    fired_actions: set,
    trace_id: str = None,
) -> Incident:
    """Create a new incident and log the opening event."""

    avg_latency = metrics.get("avg_latency", 0)
    error_rate  = metrics.get("error_rate", 0)
    rpm         = metrics.get("rpm", 0)

    # Pick severity based on what fired
    if "circuit_breaker" in fired_actions or error_rate >= 0.30:
        severity = SEVERITY_CRITICAL
        title = f"🔴 Critical: {service_name}{endpoint} is failing"
    elif "load_shedding" in fired_actions or avg_latency >= LATENCY_INCIDENT_MS:
        severity = SEVERITY_WARNING
        title = f"⚠️ Degraded: {service_name}{endpoint} is running slowly"
    else:
        severity = SEVERITY_INFO
        title = f"ℹ️ Notice: {service_name}{endpoint} needs attention"

    incident = Incident(
        user_id=user_id,
        service_name=service_name,
        endpoint=endpoint,
        title=title,
        severity=severity,
        status=STATUS_OPEN,
        peak_latency_ms=avg_latency,
        peak_error_rate=error_rate,
        peak_rpm=rpm,
        started_at=datetime.now(timezone.utc),
        trace_id=trace_id,  # Link to the trace that opened this incident
    )
    db.add(incident)
    await db.flush()   # get ID before adding events

    # Log the "incident opened" event
    await _log_event(
        db, incident,
        event_type=EVENT_INCIDENT_OPENED,
        title="🚨 Incident started",
        description=f"The system detected a problem with {service_name}{endpoint}. "
                    f"Response time: {avg_latency:.0f}ms | Failures: {error_rate*100:.1f}% | "
                    f"Traffic: {rpm:.1f} requests/minute.",
        latency_ms=avg_latency,
        error_rate=error_rate,
        rpm=rpm,
        event_metadata={"triggered_by": list(fired_actions)},
    )

    logger.info(f"🚨 Incident opened: {title} (user_id={user_id})")
    return incident


async def _resolve_incident(
    db: AsyncSession,
    incident: Incident,
    metrics: dict,
) -> None:
    """Mark incident as resolved and log the recovery event."""

    now = datetime.now(timezone.utc)
    duration_secs = int((now - incident.started_at).total_seconds())

    incident.status = STATUS_RESOLVED
    incident.resolved_at = now
    incident.duration_secs = duration_secs

    avg_latency = metrics.get("avg_latency", 0)
    error_rate  = metrics.get("error_rate", 0)
    rpm         = metrics.get("rpm", 0)

    mins = duration_secs // 60
    secs = duration_secs % 60
    duration_str = f"{mins}m {secs}s" if mins else f"{secs}s"

    await _log_event(
        db, incident,
        event_type=EVENT_INCIDENT_RESOLVED,
        title=f"✅ Incident resolved — lasted {duration_str}",
        description=f"The app is back to normal. "
                    f"The issue lasted {duration_str}. "
                    f"Response time is now {avg_latency:.0f}ms with {error_rate*100:.1f}% failures.",
        latency_ms=avg_latency,
        error_rate=error_rate,
        rpm=rpm,
        event_metadata={"duration_secs": duration_secs},
    )

    logger.info(
        f"✅ Incident resolved: {incident.title} "
        f"(id={incident.id}, duration={duration_str})"
    )


async def _log_event(
    db: AsyncSession,
    incident: Incident,
    event_type: str,
    title: str,
    description: str = None,
    latency_ms: float = 0,
    error_rate: float = 0,
    rpm: float = 0,
    event_metadata: dict = None,
    trace_id: str = None,  # Optional trace link for this specific event
) -> IncidentEvent:
    """Add a single event row to the incident timeline, avoiding spam."""
    now = datetime.now(timezone.utc)

    # Debounce spam: check if we recorded this exact event type in the last 5 minutes
    result = await db.execute(
        select(IncidentEvent).where(
            and_(
                IncidentEvent.incident_id == incident.id,
                IncidentEvent.event_type == event_type
            )
        ).order_by(desc(IncidentEvent.occurred_at)).limit(1)
    )
    last_event = result.scalar_one_or_none()

    if last_event:
        # If it was logged less than 5 minutes ago, skip insertion
        if (now - last_event.occurred_at).total_seconds() < 300:
            return last_event

    event = IncidentEvent(
        incident_id=incident.id,
        event_type=event_type,
        title=title,
        description=description,
        latency_ms=latency_ms,
        error_rate=error_rate,
        rpm=rpm,
        event_metadata=event_metadata,
        trace_id=trace_id,  # Link this event to its specific trace
        occurred_at=datetime.now(timezone.utc),
    )
    db.add(event)
    return event


async def add_ai_root_cause(
    db: AsyncSession,
    incident_id: int,
    summary: str,
    confidence: str = "medium",
) -> None:
    """
    Called by the LLM analyzer after it finishes root cause analysis.
    Updates the incident and logs the analysis as a timeline event.
    """
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        logger.warning(f"add_ai_root_cause: incident {incident_id} not found")
        return

    incident.root_cause_summary = summary
    incident.ai_confidence = confidence

    await _log_event(
        db, incident,
        event_type=EVENT_AI_ROOT_CAUSE,
        title="🤖 AI root cause analysis",
        description=summary,
        event_metadata={"confidence": confidence},
    )

    await db.commit()
    logger.info(f"🤖 AI root cause added to incident {incident_id} (confidence={confidence})")


async def get_incidents(
    db: AsyncSession,
    user_id: int,
    service_name: str = None,
    status: str = None,
    limit: int = 20,
) -> list[Incident]:
    """Fetch incidents for a user, optionally filtered by service or status."""
    query = select(Incident).where(Incident.user_id == user_id)
    if service_name:
        query = query.where(Incident.service_name == service_name)
    if status:
        query = query.where(Incident.status == status)
    query = query.order_by(desc(Incident.started_at)).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


async def get_incident_with_events(
    db: AsyncSession,
    incident_id: int,
    user_id: int,
) -> Optional[Incident]:
    """Fetch a single incident with all its timeline events loaded."""
    result = await db.execute(
        select(Incident).where(
            and_(Incident.id == incident_id, Incident.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()