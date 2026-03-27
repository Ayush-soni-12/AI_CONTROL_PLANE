"""
AI Decision Engine — Enhanced with Trend Detection & Outcome Awareness

IMPROVEMENTS OVER v1:
1. Trend detection: detects RISING latency before it crosses threshold (proactive)
2. Anomaly pre-filter: skips expensive logic on perfectly healthy services
3. Time-aware decisions: weekday 9am spike ≠ 3am Saturday spike
4. Richer decision context: trend direction added to reasoning messages
5. Outcome tracking prep: decision_context stored for feedback loop
"""

import time
from datetime import datetime, timezone
from app.ai_engine.threshold_manager import (
    get_all_thresholds,
    _get_active_override,
    _apply_override,
    DEFAULTS,
)
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional


# ─────────────────────────────────────────────────────────────────────────────
# State Schema
# ─────────────────────────────────────────────────────────────────────────────

class DecisionState(TypedDict):
    service_name: str
    endpoint: str
    avg_latency: float
    error_rate: float
    requests_per_minute: float          # Global traffic (all customers)
    customer_requests_per_minute: float # This customer only
    priority: str                       # critical, high, medium, low

    # NEW: trend data (pass from realtime aggregates)
    p50_latency: float                  # Median latency
    p95_latency: float                  # 95th percentile latency
    p99_latency: float                  # 99th percentile latency
    latency_trend: str                  # 'rising', 'falling', 'stable'
    error_trend: str                    # 'rising', 'falling', 'stable'
    rpm_trend: str                      # 'rising', 'falling', 'stable'

    # NEW: Per-flag performance data (for anomaly attribution)
    # Structure: { "flag_name": { "avg_latency": float, "error_rate": float, "count": int } }
    flag_performance: Optional[dict] = None

    # Outputs
    analysis: str
    decision: dict
    reasoning: str


# ─────────────────────────────────────────────────────────────────────────────
# Trend Detection Helper
# ─────────────────────────────────────────────────────────────────────────────

def _detect_trend(current: float, baseline: float, threshold_pct: float = 0.15) -> str:
    """
    Detect if a metric is trending up, down, or stable.

    Args:
        current: Current value
        baseline: Reference value (e.g. p50 vs avg, or avg vs threshold * 0.5)
        threshold_pct: How much change counts as a trend (default 15%)

    Returns: 'rising', 'falling', or 'stable'
    """
    if baseline <= 0:
        return 'stable'
    change = (current - baseline) / baseline
    if change > threshold_pct:
        return 'rising'
    if change < -threshold_pct:
        return 'falling'
    return 'stable'


def _is_business_hours() -> bool:
    """True if current time is weekday 8am–7pm UTC (approximate business hours)."""
    now = datetime.now(timezone.utc)
    return now.weekday() < 5 and 8 <= now.hour < 19


def _is_anomalous(state: DecisionState, thresholds: dict = None) -> bool:
    """
    Quick anomaly check. Returns False if everything looks perfectly healthy,
    so we can short-circuit and skip deeper analysis.
    """
    if thresholds is None:
        thresholds = DEFAULTS

    latency_ok = state['avg_latency'] < thresholds['cache_latency_ms'] * 0.6
    error_ok = state['error_rate'] < thresholds['circuit_breaker_error_rate'] * 0.3
    rpm_ok = state['requests_per_minute'] < thresholds['queue_deferral_rpm'] * 0.6
    customer_ok = state['customer_requests_per_minute'] < thresholds['rate_limit_customer_rpm'] * 0.6

    # Even if metrics look okay, rising trends should not be ignored
    trend_ok = (
        state.get('latency_trend', 'stable') != 'rising'
        and state.get('error_trend', 'stable') != 'rising'
        and state.get('rpm_trend', 'stable') != 'rising'
    )

    return not (latency_ok and error_ok and rpm_ok and customer_ok and trend_ok)


# ─────────────────────────────────────────────────────────────────────────────
# LangGraph Nodes
# ─────────────────────────────────────────────────────────────────────────────

def analyze_node(state: DecisionState) -> DecisionState:
    """Analyze metrics and identify issues — now includes trend detection."""

    issues = []

    # Current values
    if state['avg_latency'] >= 500:
        issues.append(f"High latency: {state['avg_latency']:.0f}ms")
    elif state.get('latency_trend') == 'rising' and state['avg_latency'] >= 300:
        issues.append(f"Rising latency: {state['avg_latency']:.0f}ms and climbing")

    if state['error_rate'] >= 0.15:
        issues.append(f"High error rate: {state['error_rate']*100:.1f}%")
    elif state.get('error_trend') == 'rising' and state['error_rate'] >= 0.05:
        issues.append(f"Rising errors: {state['error_rate']*100:.1f}% and climbing")

    if state.get('requests_per_minute', 0) >= 80:
        issues.append(f"High traffic: {state['requests_per_minute']:.1f} req/min")
    elif state.get('rpm_trend') == 'rising' and state.get('requests_per_minute', 0) >= 50:
        issues.append(f"Traffic spike building: {state['requests_per_minute']:.1f} req/min")

    if state.get('customer_requests_per_minute', 0) > 15:
        issues.append(f"Customer abuse: {state['customer_requests_per_minute']:.1f} req/min from single IP")

    # Add p95/p99 tail latency warning
    p99 = state.get('p99_latency', 0)
    p50 = state.get('p50_latency', 0)
    if p99 > 0 and p50 > 0 and (p99 / max(p50, 1)) > 5:
        issues.append(f"High tail latency: p99={p99:.0f}ms vs p50={p50:.0f}ms ({p99/p50:.1f}x spread)")

    # Check for problematic feature flags (Anomaly Attribution)
    if state.get('flag_performance'):
        baseline_latency = state['avg_latency']
        baseline_error = state['error_rate']
        
        for flag_name, metrics in state['flag_performance'].items():
            if metrics['count'] < 5: continue # Ignore flags with very low sample size
            
            # If flag latency is 2x baseline and > 400ms
            if metrics['avg_latency'] > baseline_latency * 1.8 and metrics['avg_latency'] > 400:
                issues.append(f"Flag '{flag_name}' is degrading performance (Lat: {metrics['avg_latency']:.0f}ms vs baseline: {baseline_latency:.0f}ms)")
            
            # If flag error rate is 3x baseline and > 10%
            if metrics['error_rate'] > baseline_error * 2.5 and metrics['error_rate'] > 0.1:
                issues.append(f"Flag '{flag_name}' is causing errors ({metrics['error_rate']*100:.1f}% vs baseline: {baseline_error*100:.1f}%)")

    state['analysis'] = ", ".join(issues) if issues else "No issues detected"
    return state


def decide_node(state: DecisionState) -> DecisionState:
    """
    Make decision with TWO-TIER approach + TREND AWARENESS.

    TIER 1: Per-customer rate limiting (individual abuse protection)
    TIER 2: Global capacity management (queue/shed based on priority)
    TIER 3: Latency/error based caching + circuit breaker

    NEW: Trend-based early action — act BEFORE threshold is crossed
    when metrics are rising rapidly.
    """

    priority = state.get('priority', 'medium')
    total_rpm = state.get('requests_per_minute', 0)
    customer_rpm = state.get('customer_requests_per_minute', 0)
    latency_trend = state.get('latency_trend', 'stable')
    error_trend = state.get('error_trend', 'stable')
    rpm_trend = state.get('rpm_trend', 'stable')
    business_hours = _is_business_hours()

    # ── TIER 1: PER-CUSTOMER RATE LIMITING ──────────────────────────────────
    if customer_rpm > 15:
        state['reasoning'] = (
            f"Per-Customer Rate Limit: This IP/session is making {customer_rpm:.1f} req/min "
            f"(limit: 15). Request blocked to prevent abuse."
        )
        state['decision'] = {
            'cache_enabled': False,
            'circuit_breaker': False,
            'rate_limit_customer': True,
            'queue_deferral': False,
            'load_shedding': False,
            'request_coalescing': True, # Coalesce even during rate limiting to protect backend
            'send_alert': False,
        }
        return state

    # ── TIER 2: GLOBAL CAPACITY MANAGEMENT ──────────────────────────────────
    if priority == 'critical':
        pass  # Critical never queued or shed

    elif total_rpm > 150 and priority in ['low', 'medium']:
        state['reasoning'] = (
            f"Load Shedding: Extreme traffic overload ({total_rpm:.1f} req/min). "
            f"Dropping {priority} priority requests to protect critical operations."
        )
        state['decision'] = {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,
            'request_coalescing': True,
            'send_alert': False,
        }
        return state

    elif total_rpm > 120 and priority == 'low':
        state['reasoning'] = (
            f"Load Shedding: High traffic ({total_rpm:.1f} req/min). "
            f"Dropping low priority requests to maintain service quality."
        )
        state['decision'] = {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,
            'request_coalescing': True,
            'send_alert': False,
        }
        return state

    elif 80 < total_rpm <= 120 and priority in ['low', 'medium']:
        state['reasoning'] = (
            f"Queue Deferral: Moderate traffic ({total_rpm:.1f} req/min). "
            f"Queueing {priority} priority requests for later processing."
        )
        state['decision'] = {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': True,
            'load_shedding': False,
            'request_coalescing': True,
            'send_alert': False,
        }
        return state

    # ── TIER 3: LATENCY / ERROR DECISIONS (+ TREND AWARENESS) ───────────────
    actions = []
    reasoning = ""

    # Critical failure — circuit breaker
    if state['error_rate'] >= 0.3:
        actions.append("circuit_breaker")
        actions.append("alert")
        reasoning = (
            f"CRITICAL: Error rate is extremely high ({state['error_rate']*100:.1f}%). "
            "Circuit breaker activated to prevent cascading failures."
        )

    # NEW: Rising errors — pre-emptive cache before errors hit circuit threshold
    elif error_trend == 'rising' and state['error_rate'] >= 0.1:
        actions.append("enable_cache")
        actions.append("alert")
        reasoning = (
            f"Early Warning: Error rate is rising ({state['error_rate']*100:.1f}% and climbing). "
            "Caching enabled pre-emptively to reduce backend load before failures cascade."
        )

    # High latency + errors
    elif state['error_rate'] >= 0.15 and state['avg_latency'] >= 400:
        actions.append("enable_cache")
        reasoning = (
            f"Performance Degradation: High latency ({state['avg_latency']:.0f}ms) "
            f"with elevated errors ({state['error_rate']*100:.1f}%). Caching enabled."
        )

    # High latency only
    elif state['avg_latency'] >= 500:
        actions.append("enable_cache")
        reasoning = (
            f"High Latency: {state['avg_latency']:.0f}ms exceeds 500ms threshold. "
            "Caching enabled to improve response times."
        )

    # NEW: Rising latency — pre-emptive cache before threshold is crossed
    elif latency_trend == 'rising' and state['avg_latency'] >= 300:
        actions.append("enable_cache")
        context_note = " (during business hours — monitor closely)" if business_hours else " (off-hours — possible memory leak or slow query)"
        reasoning = (
            f"Proactive Caching: Latency is rising ({state['avg_latency']:.0f}ms and climbing{context_note}). "
            "Caching enabled pre-emptively before threshold is crossed."
        )

    # NEW: High tail latency (p99 >> p50) — cache even if avg looks okay
    elif state.get('p99_latency', 0) > 0 and state.get('p50_latency', 0) > 0:
        p99 = state['p99_latency']
        p50 = state['p50_latency']
        if p99 / max(p50, 1) > 5 and p99 > 800:
            actions.append("enable_cache")
            reasoning = (
                f"Tail Latency Warning: p99={p99:.0f}ms is {p99/p50:.1f}x p50={p50:.0f}ms. "
                "Some requests are very slow — caching enabled to protect worst-case users."
            )

    # Moderate errors (monitor)
    if not reasoning and state['error_rate'] >= 0.15:
        context_note = " — weekend traffic may be causing unusual patterns" if not business_hours else ""
        reasoning = (
            f"Elevated Error Rate: {state['error_rate']*100:.1f}% above normal{context_note}. Monitoring."
        )

    # Healthy
    if not reasoning:
        trend_note = ""
        if latency_trend == 'rising':
            trend_note = " ⚠️ Latency is rising — watch closely"
        elif rpm_trend == 'rising' and not business_hours:
            trend_note = " ⚠️ Unusual traffic increase for off-hours"
        reasoning = (
            f"Healthy: Latency {state['avg_latency']:.0f}ms, "
            f"Errors {state['error_rate']*100:.1f}%, "
            f"Traffic {total_rpm:.1f} req/min{trend_note}"
        )

    # ── REQUEST COALESCING LOGIC ─────────────────────────────────────────────
    # Should coalesce if:
    # 1. Latency is rising fast (proactive protection)
    # 2. Latency is already near threshold (approaching cache state)
    # 3. Cache is enabled (essential to prevent stampede)
    should_coalesce = (
        'enable_cache' in actions
        or latency_trend == 'rising'
        or state['avg_latency'] >= 350
    )

    state['decision'] = {
        'cache_enabled': 'enable_cache' in actions,
        'circuit_breaker': 'circuit_breaker' in actions,
        'rate_limit_customer': False,
        'queue_deferral': False,
        'load_shedding': False,
        'request_coalescing': should_coalesce,
        'send_alert': 'alert' in actions,
        'disable_flag': False,
        'flag_to_disable': None,
        # Adaptive Timeout: always compute and return the recommended timeout
        # The SDK should use this value as its request timeout.
        # We use the fixed threshold from DEFAULTS.
        'adaptive_timeout': _compute_adaptive_timeout(state),
    }
    # Anomaly Attribution Kill-Switch
    if state.get('flag_performance'):
        for flag_name, metrics in state['flag_performance'].items():
            if metrics['count'] < 5: continue
            # If flag brings 2x latency and > 400ms, or high error rate
            if (metrics['avg_latency'] > state['avg_latency'] * 1.8 and metrics['avg_latency'] > 400) or (metrics['error_rate'] > state['error_rate'] * 2.5 and metrics['error_rate'] > 0.1):
                state['decision']['disable_flag'] = True
                state['decision']['flag_to_disable'] = flag_name
                state['reasoning'] = f"Feature Flag Rollback: Flag '{flag_name}' is identified as the root cause of degradation. Automated kill-switch triggered to protect service stability."
                state['decision']['send_alert'] = True
                break

    state['reasoning'] = reasoning if not state['decision'].get('disable_flag') else state['reasoning']
    return state


def _compute_adaptive_timeout(state: DecisionState) -> dict:
    """
    Compute the recommended adaptive timeout the Edge SDK should enforce.

    Logic:
      1. Use the fixed threshold from DEFAULTS.
      2. An 'active' flag tells the SDK whether the current latency is already
         exceeding the threshold (i.e., connections should fail fast).
    """
    p99 = state.get('p99_latency', 0)
    latency_trend = state.get('latency_trend', 'stable')

    recommended_ms = DEFAULTS.get('adaptive_timeout_latency_ms', 2000)

    # Adaptive timeout is active when:
    # (a) p99 latency already exceeds the recommended limit, OR
    # (b) latency is rising fast and we are already at 70% of the limit
    is_active = (
        p99 > recommended_ms
        or (latency_trend == 'rising' and p99 >= recommended_ms * 0.7)
    )

    return {
        'active': is_active,
        'recommended_timeout_ms': recommended_ms,
        'threshold_ms': recommended_ms,
        'baseline_p99_ms': round(p99, 1),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Graph
# ─────────────────────────────────────────────────────────────────────────────

def create_decision_graph():
    workflow = StateGraph(DecisionState)
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("decide", decide_node)
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "decide")
    workflow.add_edge("decide", END)
    return workflow.compile()


decision_graph = create_decision_graph()


# ─────────────────────────────────────────────────────────────────────────────
# Public API: make_ai_decision (simple, no DB)
# ─────────────────────────────────────────────────────────────────────────────

def make_ai_decision(
    service_name: str,
    endpoint: str,
    avg_latency: float,
    error_rate: float,
    requests_per_minute: float = 0,
    customer_requests_per_minute: float = 0,
    priority: str = 'medium',
    # NEW: optional trend/percentile data
    p50_latency: float = 0,
    p95_latency: float = 0,
    p99_latency: float = 0,
    latency_trend: str = 'stable',
    error_trend: str = 'stable',
    rpm_trend: str = 'stable',
) -> dict:
    """
    Simple rule-based decision. Accepts optional trend/percentile data for
    richer decisions. No DB required.
    """
    initial_state = {
        "service_name": service_name,
        "endpoint": endpoint,
        "avg_latency": avg_latency,
        "error_rate": error_rate,
        "requests_per_minute": requests_per_minute,
        "customer_requests_per_minute": customer_requests_per_minute,
        "priority": priority,
        "p50_latency": p50_latency,
        "p95_latency": p95_latency,
        "p99_latency": p99_latency,
        "latency_trend": latency_trend,
        "error_trend": error_trend,
        "rpm_trend": rpm_trend,
        "flag_performance": None,  # Fix: Default for simple rule-based decisions
        "analysis": "",
        "decision": {},
        "reasoning": "",
    }

    result = decision_graph.invoke(initial_state)

    status = 'healthy'
    if result['decision'].get('circuit_breaker') or result['decision'].get('load_shedding'):
        status = 'down'
    elif result['decision'].get('cache_enabled') or result['decision'].get('queue_deferral') or result['decision'].get('rate_limit_customer'):
        status = 'degraded'

    return {
        "cache_enabled": result['decision']['cache_enabled'],
        "circuit_breaker": result['decision'].get('circuit_breaker', False),
        "rate_limit_customer": result['decision'].get('rate_limit_customer', False),
        "queue_deferral": result['decision'].get('queue_deferral', False),
        "load_shedding": result['decision'].get('load_shedding', False),
        "request_coalescing": result['decision'].get('request_coalescing', False),
        "send_alert": result['decision'].get('send_alert', False),
        "disable_flag": result['decision'].get('disable_flag', False),
        "flag_to_disable": result['decision'].get('flag_to_disable'),
        "adaptive_timeout": result['decision'].get('adaptive_timeout', {'active': False, 'recommended_timeout_ms': 2000, 'baseline_p99_ms': 0}),
        "reasoning": result['reasoning'],
        "analysis": result['analysis'],
        "ai_decision": result['reasoning'].split(':')[0],
        "status": status,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Public API: get_ai_tuned_decision (uses DB thresholds + trends)
# ─────────────────────────────────────────────────────────────────────────────

async def get_ai_tuned_decision(
    service_name: str,
    endpoint: str,
    avg_latency: float,
    error_rate: float,
    requests_per_minute: float = 0,
    customer_requests_per_minute: float = 0,
    priority: str = 'medium',
    user_id: int = None,
    db=None,
    threshold_overrides: dict | None = None,
    flag_performance: dict | None = None,
    # NEW: trend & percentile context (passed from decisionFunction)
    p50_latency: float = 0,
    p95_latency: float = 0,
    p99_latency: float = 0,
    latency_trend: str = 'stable',
    error_trend: str = 'stable',
    rpm_trend: str = 'stable',
    total_count: int = 0,
    total_errors: int = 0,
) -> dict:
    """
    AI-tuned decision using DB thresholds + trend awareness.

    Improvements over v1:
    - Passes trend data into decision logic
    - Pre-emptive caching when trends are rising (act BEFORE threshold crossed)
    - Time-aware context in reasoning messages
    - Anomaly pre-filter: returns 'Healthy' fast when everything is clearly fine
    """

    # Load thresholds
    if db and user_id:
        thresholds = await get_all_thresholds(db, user_id, service_name, endpoint)
    else:
        thresholds = {**DEFAULTS, 'source': 'default'}

    if threshold_overrides is not None:
        for key, val in threshold_overrides.items():
            if val is not None:
                thresholds[key] = val
    elif db and user_id:
        override = await _get_active_override(db, user_id, service_name, endpoint)
        if override is not None:
            thresholds = _apply_override(thresholds, override)

    source = thresholds.get('source', 'default')
    has_override = bool(threshold_overrides)

    if source == 'ai' and has_override:
        prefix = "🧠+✏️ AI+Override"
    elif source == 'ai':
        prefix = "🧠 AI-Tuned"
    elif source == 'default_stale':
        prefix = "⏳ Stale"
    elif has_override:
        prefix = "✏️  Override"
    else:
        prefix = "📏 Default"

    cache_threshold = thresholds['cache_latency_ms']
    cb_threshold = thresholds['circuit_breaker_error_rate']
    queue_threshold = thresholds['queue_deferral_rpm']
    shed_threshold = thresholds['load_shedding_rpm']
    customer_limit = thresholds['rate_limit_customer_rpm']

    # ── ANOMALY PRE-FILTER ────────────────────────────────────────────────────
    # Skip all logic if everything is clearly healthy (60% below all thresholds
    # and no rising trends). Reduces unnecessary computation.
    if (
        avg_latency < cache_threshold * 0.6
        and error_rate < cb_threshold * 0.3
        and requests_per_minute < queue_threshold * 0.6
        and customer_requests_per_minute < customer_limit * 0.6
        and latency_trend != 'rising'
        and error_trend != 'rising'
        and rpm_trend != 'rising'
    ):
        return {
            'cache_enabled': False,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': False,
            'request_coalescing': latency_trend == 'rising' or avg_latency > cache_threshold * 0.7,
            'send_alert': False,
            'reasoning': (
                f"{prefix} Healthy: Latency {avg_latency:.0f}ms, "
                f"Errors {error_rate*100:.1f}%, Traffic {requests_per_minute:.1f} rpm"
            ),
            'analysis': 'All metrics within healthy range',
            'ai_decision': 'Healthy',
            'thresholds_source': source,
            'status': 'healthy',
        }

    # ── TIER 1: PER-CUSTOMER RATE LIMITING ───────────────────────────────────
    if customer_requests_per_minute > customer_limit:
        return {
            'cache_enabled': False,
            'circuit_breaker': False,
            'rate_limit_customer': True,
            'queue_deferral': False,
            'load_shedding': False,
            'request_coalescing': True, # Keep coalescing on for active abusers
            'send_alert': False,
            'reasoning': (
                f"{prefix} Per-Customer Rate Limit: {customer_requests_per_minute:.1f} req/min "
                f"exceeds limit of {customer_limit} req/min."
            ),
            'analysis': f"Customer abuse: {customer_requests_per_minute:.1f} req/min",
            'ai_decision': 'Per-Customer Rate Limit',
            'thresholds_source': source,
            'status': 'degraded',
        }

    # ── TIER 2: GLOBAL CAPACITY MANAGEMENT ───────────────────────────────────
    if priority != 'critical':

        if requests_per_minute > shed_threshold and priority in ['low', 'medium']:
            return {
                'cache_enabled': True,
                'circuit_breaker': False,
                'rate_limit_customer': False,
                'queue_deferral': False,
                'load_shedding': True,
                'request_coalescing': True,
                'send_alert': False,
                'reasoning': (
                    f"{prefix} Load Shedding: Traffic {requests_per_minute:.1f} rpm "
                    f"exceeds threshold {shed_threshold} rpm. Dropping {priority} priority."
                ),
                'analysis': f"Extreme traffic: {requests_per_minute:.1f} rpm",
                'ai_decision': 'Load Shedding',
                'thresholds_source': source,
                'status': 'down',
            }

        elif requests_per_minute > shed_threshold * 0.8 and priority == 'low':
            return {
                'cache_enabled': True,
                'circuit_breaker': False,
                'rate_limit_customer': False,
                'queue_deferral': False,
                'load_shedding': True,
                'request_coalescing': True,
                'send_alert': False,
                'reasoning': (
                    f"{prefix} Load Shedding: Traffic {requests_per_minute:.1f} rpm "
                    f"approaching threshold. Dropping low priority."
                ),
                'analysis': f"High traffic: {requests_per_minute:.1f} rpm",
                'ai_decision': 'Load Shedding',
                'thresholds_source': source,
            }

        elif requests_per_minute > queue_threshold and priority in ['low', 'medium']:
            return {
                'cache_enabled': True,
                'circuit_breaker': False,
                'rate_limit_customer': False,
                'queue_deferral': True,
                'load_shedding': False,
                'request_coalescing': True,
                'send_alert': False,
                'reasoning': (
                    f"{prefix} Queue Deferral: Traffic {requests_per_minute:.1f} rpm "
                    f"exceeds threshold {queue_threshold} rpm. Queueing {priority} priority."
                ),
                'analysis': f"Moderate traffic: {requests_per_minute:.1f} rpm",
                'ai_decision': 'Queue Deferral',
                'thresholds_source': source,
                'status': 'degraded',
            }

        # NEW: RPM trending up fast — pre-emptive queuing for low priority
        elif rpm_trend == 'rising' and requests_per_minute > queue_threshold * 0.7 and priority == 'low':
            return {
                'cache_enabled': True,
                'circuit_breaker': False,
                'rate_limit_customer': False,
                'queue_deferral': True,
                'load_shedding': False,
                'request_coalescing': True,
                'send_alert': False,
                'reasoning': (
                    f"{prefix} Proactive Queue: Traffic at {requests_per_minute:.1f} rpm "
                    f"and rising fast. Queuing low priority requests early."
                ),
                'analysis': f"Rising traffic: {requests_per_minute:.1f} rpm",
                'ai_decision': 'Queue Deferral (Proactive)',
                'thresholds_source': source,
                'status': 'degraded',
            }

    # ── TIER 3: CACHING & CIRCUIT BREAKER ────────────────────────────────────
    actions = []
    business_hours = _is_business_hours()

    # Circuit breaker — hard threshold
    if error_rate >= cb_threshold:
        actions.append("circuit_breaker")
        actions.append("alert")
        reasoning = (
            f"{prefix} CRITICAL: Error rate {error_rate*100:.1f}% exceeds "
            f"threshold {cb_threshold*100:.0f}%. Circuit breaker activated."
        )

    # Rising errors — pre-emptive cache
    elif error_trend == 'rising' and error_rate >= cb_threshold * 0.4:
        actions.append("enable_cache")
        actions.append("alert")
        reasoning = (
            f"{prefix} Early Warning: Error rate {error_rate*100:.1f}% is rising "
            f"(threshold: {cb_threshold*100:.0f}%). Caching pre-emptively to reduce load."
        )

    # High latency + some errors
    elif error_rate >= cb_threshold * 0.5 and avg_latency >= cache_threshold * 0.8:
        actions.append("enable_cache")
        reasoning = (
            f"{prefix} Performance Degradation: Latency {avg_latency:.0f}ms + "
            f"error rate {error_rate*100:.1f}%. Caching enabled."
        )

    # Hard latency threshold
    elif avg_latency >= cache_threshold:
        actions.append("enable_cache")
        reasoning = (
            f"{prefix} High Latency: {avg_latency:.0f}ms exceeds "
            f"threshold {cache_threshold}ms. Caching enabled."
        )

    # NEW: Rising latency — pre-emptive cache
    elif latency_trend == 'rising' and avg_latency >= cache_threshold * 0.6:
        actions.append("enable_cache")
        ctx = "(business hours — monitor)" if business_hours else "(off-hours — possible slow query or leak)"
        reasoning = (
            f"{prefix} Proactive Caching: Latency {avg_latency:.0f}ms is rising {ctx}. "
            f"Caching pre-emptively (threshold: {cache_threshold}ms)."
        )

    # NEW: High tail latency even if avg is ok
    elif p99_latency > 0 and p50_latency > 0 and (p99_latency / max(p50_latency, 1)) > 5 and p99_latency > cache_threshold:
        actions.append("enable_cache")
        reasoning = (
            f"{prefix} Tail Latency: p99={p99_latency:.0f}ms is "
            f"{p99_latency/p50_latency:.1f}x the median ({p50_latency:.0f}ms). "
            f"Caching to protect slow-path users."
        )

    elif error_rate >= cb_threshold * 0.5:
        reasoning = (
            f"{prefix} Elevated Error Rate: {error_rate*100:.1f}% "
            f"(threshold: {cb_threshold*100:.0f}%). Monitoring."
        )

    else:
        trend_note = ""
        if latency_trend == 'rising':
            trend_note = " | ⚠️ latency trending up"
        elif error_trend == 'rising':
            trend_note = " | ⚠️ errors trending up"
        elif rpm_trend == 'rising' and not business_hours:
            trend_note = " | ⚠️ unusual off-hours traffic spike"
        reasoning = (
            f"{prefix} Healthy: Latency {avg_latency:.0f}ms, "
            f"Errors {error_rate*100:.1f}%, Traffic {requests_per_minute:.1f} rpm{trend_note}"
        )

    status = 'healthy'
    if 'circuit_breaker' in actions:
        status = 'down'
    elif 'enable_cache' in actions or error_rate >= cb_threshold * 0.5 or latency_trend == 'rising' or error_trend == 'rising':
        status = 'degraded'

    # ── ADAPTIVE TIMEOUT ─────────────────────────────────────────────────────
    # Use the stable AI-tuned threshold from the database (or the manual override).
    # This prevents the timeout from expanding during an incident if live p99 spikes.
    at_threshold = thresholds.get('adaptive_timeout_latency_ms', 2000)
    recommended_timeout_ms = at_threshold

    adaptive_timeout_active = (
        p99_latency > at_threshold
        or (latency_trend == 'rising' and p99_latency >= at_threshold * 0.7)
    )
    adaptive_timeout = {
        'active': adaptive_timeout_active,
        'recommended_timeout_ms': recommended_timeout_ms,
        'threshold_ms': at_threshold,
        'baseline_p99_ms': round(p99_latency, 1),
    }
    # Manual kill-switch check for tuned decision
    if flag_performance:
        for flag_name, metrics in flag_performance.items():
            if metrics['count'] < 5: continue
            
            # --- IMPROVED HEURISTIC: Corrected Baseline ---
            # Instead of comparing flag to TOTAL average (which is contaminated by the flag itself),
            # we compare it to the 'Clean Baseline' (the latency of requests WITHOUT the flag).
            
            flag_count = metrics['count']
            flag_avg = metrics['avg_latency']
            flag_err = metrics['error_rate']
            
            # Calculate what the performance would be WITHOUT this flag
            if total_count > flag_count:
                # Corrected Latency = (TotalSum - FlagSum) / (TotalCount - FlagCount)
                total_sum = avg_latency * total_count
                corrected_baseline_latency = (total_sum - (flag_avg * flag_count)) / (total_count - flag_count)
                
                # Corrected Errors = (TotalErrors - FlagErrors) / (TotalCount - FlagCount)
                flag_error_count = flag_err * flag_count
                corrected_baseline_errors = (total_errors - flag_error_count) / (total_count - flag_count)
            else:
                # 100% rollout - use healthy thresholds as baseline
                corrected_baseline_latency = thresholds.get('cache_latency_ms', 500)
                corrected_baseline_errors = thresholds.get('circuit_breaker_error_rate', 0.1)

            # Defensive min-bounds for baseline to avoid division by zero or extreme ratios
            corrected_baseline_latency = max(corrected_baseline_latency, 20)
            corrected_baseline_errors = max(corrected_baseline_errors, 0.01)

            # Now compare Flag to the CLEAN baseline
            latency_ratio = flag_avg / corrected_baseline_latency
            error_ratio = flag_err / corrected_baseline_errors

            is_outlier_latency = (latency_ratio > 1.8 and flag_avg > 400)
            is_outlier_errors = (error_ratio > 2.5 and flag_err > 0.1)
            
            # Also keep catastrophic absolute checks
            is_catastrophic_latency = flag_avg > thresholds.get('cache_latency_ms', 500) * 4.0
            is_catastrophic_errors = flag_err > thresholds.get('circuit_breaker_error_rate', 0.3) * 4.0
            
            if is_catastrophic_latency or is_catastrophic_errors or is_outlier_latency or is_outlier_errors:
                return {
                    'cache_enabled': True,
                    'circuit_breaker': False,
                    'rate_limit_customer': False,
                    'queue_deferral': False,
                    'load_shedding': False,
                    'send_alert': True,
                    'disable_flag': True,
                    'flag_to_disable': flag_name,
                    'request_coalescing': True,
                    'adaptive_timeout': adaptive_timeout,
                    'reasoning': f"Feature Flag Rollback: Flag '{flag_name}' is causing significant performance degradation (Ratio: {latency_ratio:.1f}x baseline). AI is triggering automated kill-switch.",
                    'analysis': f"Flag '{flag_name}' metrics: {flag_avg:.0f}ms vs Baseline: {corrected_baseline_latency:.0f}ms. Rollout: {flag_count/total_count*100:.0f}%",
                    'ai_decision': 'Flag Rollback',
                    'thresholds_source': source,
                    'status': 'degraded',
                }
            # --- End Improved Heuristic ---
                return {
                    'cache_enabled': True,
                    'circuit_breaker': False,
                    'rate_limit_customer': False,
                    'queue_deferral': False,
                    'load_shedding': False,
                    'send_alert': True,
                    'disable_flag': True,
                    'flag_to_disable': flag_name,
                    'request_coalescing': True,
                    'adaptive_timeout': adaptive_timeout,
                    'reasoning': f"Feature Flag Rollback: Flag '{flag_name}' is causing significant performance degradation. AI is triggering automated kill-switch.",
                    'analysis': f"Flag '{flag_name}' metrics: {metrics['avg_latency']:.0f}ms / {metrics['error_rate']*100:.1f}% errors",
                    'ai_decision': 'Flag Rollback',
                    'thresholds_source': source,
                    'status': 'degraded',
                }

    return {
        'cache_enabled': 'enable_cache' in actions,
        'circuit_breaker': 'circuit_breaker' in actions,
        'rate_limit_customer': False,
        'queue_deferral': False,
        'load_shedding': False,
        'send_alert': 'alert' in actions,
        'disable_flag': False,
        'flag_to_disable': None,
        'request_coalescing': 'enable_cache' in actions or latency_trend == 'rising' or avg_latency > cache_threshold * 0.7,
        'adaptive_timeout': adaptive_timeout,
        'reasoning': reasoning,
        'analysis': reasoning,
        'ai_decision': reasoning.split(':')[0] if ':' in reasoning else 'Healthy',
        'thresholds_source': source,
        'status': status,
    }