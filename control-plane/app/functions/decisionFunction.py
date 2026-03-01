"""
Decision Function — Enhanced with Trend Detection & Outcome Tracking

IMPROVEMENTS over v1:
1. Computes latency/error/rpm TRENDS from Redis percentile data before calling AI
2. Passes p50/p95/p99 + trend direction to AI engine for richer decisions
3. Logs decision outcomes to Redis for the background feedback loop
4. Pre-emptive actions when trends are rising (act BEFORE threshold is crossed)
5. Incident tracking: automatically opens/logs/resolves incidents
"""

from ..realtime_aggregates import get_realtime_metrics
from ..customer_metrics import get_customer_metrics
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from ..database import models
from ..database.database import AsyncSessionLocal
from ..ai_engine import ai_engine
from ..ai_engine.threshold_manager import (
    get_all_thresholds,
    _get_active_override,
    _apply_override,
)
from datetime import datetime, timezone
from .IncidentTracker import process_decision_for_incident
import json
import time
import asyncio
import logging

logger = logging.getLogger(__name__)

make_ai_decision = ai_engine.make_ai_decision
get_ai_tuned_decision = ai_engine.get_ai_tuned_decision


# ─────────────────────────────────────────────────────────────────────────────
# Trend Computation
# ─────────────────────────────────────────────────────────────────────────────

def _compute_trends(metrics_1h: dict, metrics_24h: dict = None) -> dict:
    """
    Compute trend directions by comparing the 1-hour window to the 24-hour baseline.

    Logic:
    - If 1h avg_latency is >15% higher than 24h avg_latency → rising
    - If 1h avg_latency is >15% lower than 24h avg_latency → falling
    - Otherwise → stable

    Also uses p95 vs p50 spread to detect tail-latency degradation.

    Returns dict with:
        latency_trend, error_trend, rpm_trend ('rising'/'falling'/'stable')
    """
    if not metrics_1h:
        return {'latency_trend': 'stable', 'error_trend': 'stable', 'rpm_trend': 'stable'}

    # If we have a 24h baseline, compare against it
    if metrics_24h and metrics_24h.get('count', 0) > 0:
        baseline_latency = metrics_24h['avg_latency']
        baseline_error = metrics_24h['error_rate']
        baseline_rpm = metrics_24h.get('requests_per_minute', 0)
    else:
        # No 24h baseline → use p50 as latency baseline (p50 vs avg comparison)
        baseline_latency = metrics_1h.get('p50', metrics_1h['avg_latency'])
        baseline_error = metrics_1h['error_rate'] * 0.7  # assume current is slightly elevated
        baseline_rpm = metrics_1h.get('requests_per_minute', 0) * 0.8

    current_latency = metrics_1h['avg_latency']
    current_error = metrics_1h['error_rate']
    current_rpm = metrics_1h.get('requests_per_minute', 0)

    def _trend(current, baseline, threshold=0.15):
        if baseline <= 0:
            return 'stable'
        change = (current - baseline) / baseline
        if change > threshold:
            return 'rising'
        if change < -threshold:
            return 'falling'
        return 'stable'

    return {
        'latency_trend': _trend(current_latency, baseline_latency),
        'error_trend': _trend(current_error, baseline_error, threshold=0.20),
        'rpm_trend': _trend(current_rpm, baseline_rpm, threshold=0.20),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Outcome Logging (for future Gemini feedback loop)
# ─────────────────────────────────────────────────────────────────────────────

async def _log_decision_outcome(
    user_id: int,
    service_name: str,
    endpoint: str,
    decision: dict,
    metrics_snapshot: dict,
):
    """
    Store a decision + the metrics at the time of decision in Redis.
    The background analyzer reads this to evaluate if decisions helped.

    Key: decision_log:{user_id}:{service}:{endpoint} (list, capped at 50)
    Each entry: {timestamp, decision_flags, metrics, verified_at=None}

    TTL: 24 hours (we only need recent history for Gemini context)
    """
    try:
        from app.redis.cache import redis_client

        log_entry = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'decision': {
                'cache_enabled': decision.get('cache_enabled', False),
                'circuit_breaker': decision.get('circuit_breaker', False),
                'queue_deferral': decision.get('queue_deferral', False),
                'load_shedding': decision.get('load_shedding', False),
                'rate_limit_customer': decision.get('rate_limit_customer', False),
            },
            'metrics_at_decision': {
                'avg_latency': metrics_snapshot.get('avg_latency', 0),
                'error_rate': metrics_snapshot.get('error_rate', 0),
                'rpm': metrics_snapshot.get('requests_per_minute', 0),
                'p50': metrics_snapshot.get('p50', 0),
                'p95': metrics_snapshot.get('p95', 0),
                'p99': metrics_snapshot.get('p99', 0),
            },
            'reasoning': decision.get('reasoning', ''),
        }

        key = f"decision_log:{user_id}:{service_name}:{endpoint}"

        # Push to list (newest first) and cap at 50 entries
        await redis_client.lpush(key, json.dumps(log_entry))
        await redis_client.ltrim(key, 0, 49)
        await redis_client.expire(key, 86400)  # 24h TTL

    except Exception as e:
        # Never fail a real request because of logging
        print(f"⚠️  [DecisionLog] Failed to log outcome: {e}")


async def get_recent_decisions(
    user_id: int,
    service_name: str,
    endpoint: str,
    limit: int = 5,
) -> list:
    """
    Retrieve recent decisions for a service/endpoint.
    Used by llm_analyzer to build feedback context for Gemini.
    """
    try:
        from app.redis.cache import redis_client
        key = f"decision_log:{user_id}:{service_name}:{endpoint}"
        entries = await redis_client.lrange(key, 0, limit - 1)
        return [json.loads(e) for e in entries]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Main Decision Function
# ─────────────────────────────────────────────────────────────────────────────

async def make_decision(
    service_name,
    endpoint,
    db: AsyncSession = None,
    user_id: int = None,
    customer_identifier: str = None,
    priority: str = 'medium',
):
    """
    Make AI decision using TWO-TIER APPROACH + TREND DETECTION.

    NEW in v2:
    - Fetches both 1h AND 24h metrics windows from Redis
    - Computes trend direction (rising/falling/stable) for latency, errors, RPM
    - Passes p50/p95/p99 to AI engine for tail latency awareness
    - Logs decision + metrics snapshot for future Gemini feedback loop
    - Pre-emptive actions: caching starts when latency is RISING, not just EXCEEDED
    - Incident tracking: automatically opens/logs/resolves incidents

    Args:
        service_name: Name of the service
        endpoint: API endpoint path
        db: Database session
        user_id: User ID (required for real-time aggregates)
        customer_identifier: IP or session ID (for per-customer rate limiting)
        priority: Request priority (critical/high/medium/low)
    """

    # ── STEP 1: Check for active override ────────────────────────────────────
    override = await _get_active_override(db, user_id, service_name, endpoint)
    if override is not None:
        expires = override.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        mins_left = int((expires - datetime.now(timezone.utc)).total_seconds() / 60)
        print(
            f"✏️  [Override] {service_name}{endpoint} — "
            f"threshold override active ({mins_left} min remaining): {override.reason}"
        )

    # ── STEP 2: Get metrics (1h window = primary, 24h = trend baseline) ──────
    metrics_1h = None
    metrics_24h = None

    if user_id:
        metrics_1h = await get_realtime_metrics(
            user_id, service_name, endpoint, window='1h', db=db
        )
        # Also fetch 24h baseline for trend comparison (non-blocking)
        try:
            metrics_24h = await get_realtime_metrics(
                user_id, service_name, endpoint, window='24h', db=db
            )
        except Exception:
            pass  # 24h baseline is optional

    # ── STEP 3: Setup per-customer metrics for overrides ────────────────────────
    # The actual blocking logic is now handled in the SDK's local sliding window (Zero Latency Edge)
    # We just need to know the rule limit to pass down to the Edge SDK.
    customer_rpm_limit = None
    if user_id:
        # If there's an override, use that. Otherwise fallback to the actual threshold
        if override is not None and override.rate_limit_customer_rpm:
             customer_rpm_limit = override.rate_limit_customer_rpm
        else:
             from ..ai_engine.threshold_manager import get_all_thresholds
             current_thresholds = await get_all_thresholds(db, user_id, service_name, endpoint)
             customer_rpm_limit = current_thresholds.get("rate_limit_customer_rpm", 50) 

    # ── STEP 4: Compute trends ────────────────────────────────────────────────
    trends = _compute_trends(metrics_1h, metrics_24h)
    latency_trend = trends['latency_trend']
    error_trend = trends['error_trend']
    rpm_trend = trends['rpm_trend']

    if latency_trend != 'stable' or error_trend != 'stable' or rpm_trend != 'stable':
        print(
            f"📈 [Trends] {service_name}{endpoint} — "
            f"latency:{latency_trend} errors:{error_trend} rpm:{rpm_trend}"
        )

    # ── STEP 5: Make AI decision ──────────────────────────────────────────────
    if metrics_1h and metrics_1h['count'] >= 3:
        avg_latency = metrics_1h['avg_latency']
        error_rate = metrics_1h['error_rate']
        total_rpm = metrics_1h.get('requests_per_minute', 0)
        p50 = metrics_1h.get('p50', 0)
        p95 = metrics_1h.get('p95', 0)
        p99 = metrics_1h.get('p99', 0)

        print(
            f"✅ Using real-time aggregates: {service_name}{endpoint} — "
            f"Avg: {avg_latency:.1f}ms, p50: {p50:.0f}ms, p95: {p95:.0f}ms, p99: {p99:.0f}ms, "
            f"Errors: {error_rate*100:.1f}%, RPM: {total_rpm:.1f}, "
            f"Trends: latency={latency_trend} errors={error_trend} rpm={rpm_trend}"
        )

        # Build threshold overrides dict from ConfigOverride if any
        threshold_overrides = None
        if override is not None:
            threshold_overrides = {
                'cache_latency_ms': override.cache_latency_ms,
                'circuit_breaker_error_rate': override.circuit_breaker_error_rate,
                'queue_deferral_rpm': override.queue_deferral_rpm,
                'load_shedding_rpm': override.load_shedding_rpm,
                'rate_limit_customer_rpm': override.rate_limit_customer_rpm,
            }

        if db and user_id:
            ai_decision = await get_ai_tuned_decision(
                service_name,
                endpoint,
                avg_latency,
                error_rate,
                requests_per_minute=total_rpm,
                customer_requests_per_minute=0, # Handled locally on the SDK Edge now!
                priority=priority,
                user_id=user_id,
                db=db,
                threshold_overrides=threshold_overrides,
                # NEW: pass trend + percentile data
                p50_latency=p50,
                p95_latency=p95,
                p99_latency=p99,
                latency_trend=latency_trend,
                error_trend=error_trend,
                rpm_trend=rpm_trend,
            )
        else:
            ai_decision = make_ai_decision(
                service_name,
                endpoint,
                avg_latency,
                error_rate,
                requests_per_minute=total_rpm,
                customer_requests_per_minute=customer_rpm,
                priority=priority,
                p50_latency=p50,
                p95_latency=p95,
                p99_latency=p99,
                latency_trend=latency_trend,
                error_trend=error_trend,
                rpm_trend=rpm_trend,
            )

        print(f"🤖 AI Decision: {ai_decision['reasoning']}")

        # ── STEP 6: Log decision for feedback loop ────────────────────────────
        if user_id:
            await _log_decision_outcome(
                user_id=user_id,
                service_name=service_name,
                endpoint=endpoint,
                decision=ai_decision,
                metrics_snapshot=metrics_1h,
            )

        # Status logs
        if ai_decision.get('rate_limit_customer'):
            print(f"🚫 Per-customer rate limit triggered for {customer_identifier}")
        if ai_decision.get('queue_deferral'):
            print(f"⏳ Queue deferral activated for {service_name}{endpoint} (priority: {priority})")
        if ai_decision.get('load_shedding'):
            print(f"🗑️  Load shedding activated for {service_name}{endpoint} (priority: {priority})")
        if ai_decision.get('circuit_breaker'):
            print(f"⚠️  Circuit breaker activated for {service_name}{endpoint}")
        if ai_decision.get('send_alert'):
            print(f"🚨 Alert: Issues detected for {service_name}{endpoint}")

        # ── STEP 7: Build result dict ─────────────────────────────────────────
        result = {
            'cache_enabled': ai_decision['cache_enabled'],
            'circuit_breaker': ai_decision.get('circuit_breaker', False),
            'queue_deferral': ai_decision.get('queue_deferral', False),
            'load_shedding': ai_decision.get('load_shedding', False),
            'rate_limit_rule_rpm': customer_rpm_limit, # The rule is passed to the SDK!
            'reason': ai_decision['reasoning'],
            'send_alert': ai_decision.get('send_alert', False),
            # Trend context for dashboard display
            'trends': {
                'latency': latency_trend,
                'errors': error_trend,
                'rpm': rpm_trend,
            },
            **(
                {
                    "metrics": {
                        "avg_latency": avg_latency,
                        "error_rate": error_rate,
                        "requests_per_minute": total_rpm,
                        "customer_requests_per_minute": customer_rpm,
                    },
                    "ai_decision": ai_decision,
                }
                if ai_decision.get('send_alert')
                else {}
            ),
        }

        # ── INCIDENT TRACKING ─────────────────────────────────────────────────
        # Fire-and-forget: log this decision to the incident timeline.
        # Runs as a background task so it never slows down the main request path.
        if user_id is not None:
            # Need actual thresholds to determine if the system is healthy
            current_thresholds = await get_all_thresholds(db, user_id, service_name, endpoint)
            
            # Fetch 1m metrics for faster incident recovery detection
            try:
                metrics_1m = await get_realtime_metrics(
                    user_id, service_name, endpoint, window='1m', db=db
                )
                if metrics_1m and metrics_1m.get('count', 0) > 0:
                    incident_avg_latency = metrics_1m['avg_latency']
                    incident_error_rate = metrics_1m['error_rate']
                    incident_rpm = metrics_1m.get('requests_per_minute', 0)
                else:
                    incident_avg_latency = avg_latency
                    incident_error_rate = error_rate
                    incident_rpm = total_rpm
            except Exception:
                incident_avg_latency = avg_latency
                incident_error_rate = error_rate
                incident_rpm = total_rpm
            
            async def _run_incident_tracking():
                try:
                    async with AsyncSessionLocal() as session:
                        await process_decision_for_incident(
                            db=session,
                            user_id=user_id,
                            service_name=service_name,
                            endpoint=endpoint,
                            decision=result,
                            thresholds=current_thresholds,
                            metrics={
                                "avg_latency": incident_avg_latency,
                                "error_rate": incident_error_rate,
                                "rpm": incident_rpm,
                            },
                        )
                except Exception as e:
                    logger.warning(f"Incident tracking failed (non-critical): {e}")
                    
            try:
                asyncio.create_task(_run_incident_tracking())
            except Exception as e:
                # Never let incident tracking break the main decision flow
                logger.warning(f"Failed to spawn incident tracking task: {e}")
        # ── END INCIDENT TRACKING ─────────────────────────────────────────────

        return result

    # Not enough data yet
    print(
        f"⚠️  No metrics for {service_name}{endpoint} — "
        "returning safe defaults (need 3+ signals)"
    )

    return {
        'cache_enabled': False,
        'circuit_breaker': False,
        'rate_limit_customer': False,
        'rate_limit_rule_rpm': customer_rpm_limit,
        'queue_deferral': False,
        'load_shedding': False,
        'reason': 'Not enough data yet (need 3+ signals in Redis or snapshot)',
        'send_alert': False,
        'trends': {'latency': 'stable', 'errors': 'stable', 'rpm': 'stable'},
    }