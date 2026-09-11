"""
Background AI Analyzer — Enhanced with Feedback Loop, Trend Context & Anomaly Pre-Filtering

IMPROVEMENTS:
1. Anomaly Pre-Filtering Gate (AC-1): Skips expensive Gemini LLM invocations when endpoints are healthy.
2. 1h vs 24h Trend Context (AC-2): Proactively detects rising latency/error/traffic trends before outages.
3. Feature Flag Auto-Rollback: Integrates proactive protection checks to disable faulty flags.
4. Span Aggregation: Passes trace telemetry to Gemini for granular root cause analysis.
"""

import logging
from typing import Optional, Dict
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.realtime_aggregates import get_realtime_metrics
from app.ai_engine.llm_analyzer import analyze_service_thresholds, analyze_service_patterns
from app.ai_engine.threshold_manager import get_all_thresholds, update_thresholds, DEFAULTS
from app.database import models
from app.config import settings

logger = logging.getLogger(__name__)


def _confidence_to_float(confidence: str) -> float:
    return {'low': 0.5, 'medium': 0.7, 'high': 1.0}.get(confidence, 0.5)


def _compute_trends_from_windows(metrics_1h: dict, metrics_24h: Optional[dict]) -> dict:
    """
    Compare 1h window to 24h window to compute trend directions.
    Returns dict with latency_trend, error_trend, rpm_trend.
    """
    if not metrics_1h or not metrics_24h or metrics_24h.get('count', 0) < 10:
        return {'latency_trend': 'stable', 'error_trend': 'stable', 'rpm_trend': 'stable'}

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
        'latency_trend': _trend(metrics_1h['avg_latency'], metrics_24h['avg_latency']),
        'error_trend': _trend(metrics_1h['error_rate'], metrics_24h['error_rate'], threshold=0.20),
        'rpm_trend': _trend(
            metrics_1h.get('requests_per_minute', 0),
            metrics_24h.get('requests_per_minute', 0),
            threshold=0.20,
        ),
    }


def is_endpoint_anomalous_or_trending(
    metrics_1h: dict,
    trends: dict,
    current_thresholds: dict
) -> bool:
    """
    Multi-signal anomaly pre-filtering gate (AC-1).
    Returns True if an anomaly or rising trend is present and requires Gemini LLM analysis.
    Returns False if the endpoint is running normally and can skip expensive LLM calls.
    """
    error_rate = metrics_1h.get('error_rate', 0.0)
    avg_latency = metrics_1h.get('avg_latency', 0.0)
    p95_latency = metrics_1h.get('p95', 0.0) or avg_latency
    rpm = metrics_1h.get('requests_per_minute', 0.0)

    cb_error_rate = current_thresholds.get('circuit_breaker_error_rate', DEFAULTS['circuit_breaker_error_rate'])
    cache_latency = current_thresholds.get('cache_latency_ms', DEFAULTS['cache_latency_ms'])
    queue_rpm = current_thresholds.get('queue_deferral_rpm', DEFAULTS['queue_deferral_rpm'])

    # 1. Error rate check: > 3% or > 30% of circuit breaker threshold
    if error_rate >= 0.03 or error_rate >= (cb_error_rate * 0.3):
        return True

    # 2. Latency check: average > 60% of cache threshold or p95 > threshold
    if avg_latency >= (cache_latency * 0.6) or p95_latency >= cache_latency:
        return True

    # 3. Traffic surge check: > 70% of queue deferral threshold
    if rpm >= (queue_rpm * 0.7):
        return True

    # 4. Proactive trend check: rising latency, error, or traffic
    if (
        trends.get('latency_trend') == 'rising'
        or trends.get('error_trend') == 'rising'
        or trends.get('rpm_trend') == 'rising'
    ):
        return True

    return False


async def analyze_all_services():
    """
    Background job: Analyze all services and update AI thresholds.
    Runs every 5 minutes via APScheduler.
    """
    if not settings.GEMINI_API_KEY:
        print("⚠️  GEMINI_API_KEY not set — skipping AI analysis")
        return

    print("\n" + "=" * 60)
    print("🤖 Starting AI background analysis job (v2 — optimized with anomaly pre-filter)...")
    print("=" * 60)

    async_session = AsyncSessionLocal()

    try:
        users_result = await async_session.execute(select(models.User))
        users = users_result.scalars().all()

        total_analyzed = 0
        total_skipped_healthy = 0
        total_updated = 0
        total_insights = 0

        for user in users:
            stmt = select(
                models.Signal.service_name,
                models.Signal.endpoint,
            ).filter(
                models.Signal.user_id == user.id
            ).distinct()

            endpoints_result = await async_session.execute(stmt)
            endpoints = endpoints_result.all()

            for service_name, endpoint in endpoints:
                try:
                    # 1. Fetch 1h metrics (primary)
                    metrics_1h = await get_realtime_metrics(
                        user_id=user.id,
                        service_name=service_name,
                        endpoint=endpoint,
                        window='1h',
                        db=async_session,
                    )

                    if not metrics_1h or metrics_1h.get('count', 0) < 10:
                        continue  # Not enough data for meaningful analysis

                    total_analyzed += 1

                    # 2. Fetch 24h baseline for trend comparison
                    metrics_24h = None
                    try:
                        metrics_24h = await get_realtime_metrics(
                            user_id=user.id,
                            service_name=service_name,
                            endpoint=endpoint,
                            window='24h',
                            db=async_session,
                        )
                    except Exception:
                        pass

                    # 3. Compute 1h vs 24h trends (AC-2)
                    trends = _compute_trends_from_windows(metrics_1h, metrics_24h)
                    latency_trend = trends['latency_trend']
                    error_trend = trends['error_trend']
                    rpm_trend = trends['rpm_trend']

                    if any(t != 'stable' for t in trends.values()):
                        print(
                            f"📈 [Trends] {service_name}{endpoint} — "
                            f"latency:{latency_trend} errors:{error_trend} rpm:{rpm_trend}"
                        )

                    # 4. Proactive Protection & Feature Flag Rollback Check
                    try:
                        from app.functions.decisionFunction import make_decision
                        await make_decision(
                            service_name=service_name,
                            endpoint=endpoint,
                            db=async_session,
                            user_id=user.id
                        )
                    except Exception as e:
                        print(f"⚠️  Proactive check error for {service_name}{endpoint}: {e}")

                    # 5. Fetch current thresholds
                    current = await get_all_thresholds(
                        async_session, user.id, service_name, endpoint
                    )

                    # 6. Anomaly Pre-Filtering Gate (AC-1)
                    # Skip expensive Gemini calls if endpoint is completely healthy
                    if not is_endpoint_anomalous_or_trending(metrics_1h, trends, current):
                        total_skipped_healthy += 1
                        print(
                            f"⚡ [AnomalyGate] {service_name}{endpoint} is healthy "
                            f"(lat={metrics_1h.get('avg_latency', 0):.0f}ms, "
                            f"errors={metrics_1h.get('error_rate', 0)*100:.1f}%, trends stable) "
                            f"— skipping Gemini LLM analysis."
                        )
                        continue

                    # 7. Fetch recent decision history for feedback loop
                    from app.functions.decisionFunction import get_recent_decisions
                    recent_decisions = await get_recent_decisions(
                        user.id, service_name, endpoint
                    )

                    # 8. Call Gemini for threshold recommendations (WITH trends + history)
                    print(f"🧠 [Gemini] Anomaly detected on {service_name}{endpoint} — invoking AI threshold analysis...")
                    recommendation = await analyze_service_thresholds(
                        service_name,
                        endpoint,
                        metrics_1h,
                        current,
                        recent_decisions=recent_decisions,
                        trends=trends,
                    )

                    if recommendation and recommendation.confidence in ['medium', 'high']:
                        await update_thresholds(
                            async_session,
                            user.id,
                            service_name,
                            endpoint,
                            {
                                'cache_latency_ms': recommendation.cache_latency_ms,
                                'circuit_breaker_error_rate': recommendation.circuit_breaker_error_rate,
                                'queue_deferral_rpm': recommendation.queue_deferral_rpm,
                                'load_shedding_rpm': recommendation.load_shedding_rpm,
                                'rate_limit_customer_rpm': recommendation.rate_limit_customer_rpm,
                                'adaptive_timeout_latency_ms': recommendation.adaptive_timeout_latency_ms,
                            },
                            recommendation.reasoning,
                            _confidence_to_float(recommendation.confidence),
                        )
                        total_updated += 1

                        trend_summary = f"L:{latency_trend[0]} E:{error_trend[0]} R:{rpm_trend[0]}"
                        print(
                            f"✅ Updated thresholds for {service_name}{endpoint} "
                            f"(confidence: {recommendation.confidence}, trends: {trend_summary})"
                        )
                    elif recommendation:
                        print(f"⏭️  Low confidence for {service_name}{endpoint}, skipping update")

                    # 9. Span aggregation
                    span_stats = []
                    try:
                        from sqlalchemy import text as sql_text
                        span_query_result = await async_session.execute(
                            sql_text("""
                                SELECT
                                    operation,
                                    ROUND(AVG(duration_ms)::numeric, 1)  AS avg_ms,
                                    ROUND(MAX(duration_ms)::numeric, 1)  AS max_ms,
                                    COUNT(*)                              AS count
                                FROM spans
                                WHERE service_name = :service
                                  AND created_at > NOW() - INTERVAL '1 hour'
                                GROUP BY operation
                                ORDER BY AVG(duration_ms) DESC
                                LIMIT 10
                            """),
                            {"service": service_name},
                        )
                        span_stats = [
                            {
                                "operation": row.operation,
                                "avg_ms": float(row.avg_ms or 0),
                                "max_ms": float(row.max_ms or 0),
                                "count": int(row.count or 0),
                            }
                            for row in span_query_result
                        ]
                    except Exception as span_err:
                        pass

                    # 10. Pattern detection + store insights
                    patterns = await analyze_service_patterns(
                        service_name,
                        metrics_1h,
                        recent_decisions=recent_decisions,
                        trends=trends,
                        span_stats=span_stats or None,
                    )

                    if patterns:
                        now = datetime.now(timezone.utc)

                        if patterns.patterns:
                            pattern_parts = []
                            avg_confidence = 0.0
                            for pattern in patterns.patterns:
                                pattern_parts.append(
                                    f"• {pattern.pattern_type}: {pattern.description}. "
                                    f"Recommendation: {pattern.recommendation}"
                                )
                                avg_confidence += _confidence_to_float(pattern.confidence)
                            avg_confidence /= len(patterns.patterns)

                            async_session.add(models.AIInsight(
                                user_id=user.id,
                                service_name=service_name,
                                insight_type='pattern',
                                description="\n".join(pattern_parts),
                                confidence=round(avg_confidence, 2),
                                created_at=now,
                            ))
                            total_insights += 1

                        anomaly_desc = (
                            "\n".join(
                                f"• [{a.severity.upper()}] {a.description}"
                                for a in patterns.anomalies
                            )
                            if patterns.anomalies
                            else "No anomalies detected. Service is operating within normal parameters."
                        )

                        async_session.add(models.AIInsight(
                            user_id=user.id,
                            service_name=service_name,
                            insight_type='anomaly',
                            description=anomaly_desc,
                            confidence=None,
                            created_at=now,
                        ))
                        total_insights += 1

                        if patterns.summary:
                            async_session.add(models.AIInsight(
                                user_id=user.id,
                                service_name=service_name,
                                insight_type='recommendation',
                                description=patterns.summary,
                                confidence=None,
                                created_at=now,
                            ))
                            total_insights += 1

                except Exception as e:
                    print(f"❌ Error analyzing {service_name}{endpoint}: {e}")
                    continue

        await async_session.commit()

        print("=" * 60)
        print(f"🤖 AI analysis job complete!")
        print(f"   - Endpoints evaluated: {total_analyzed}")
        print(f"   - Healthy (LLM skipped): {total_skipped_healthy}")
        print(f"   - Thresholds updated: {total_updated}")
        print(f"   - Insights generated: {total_insights}")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"❌ Fatal error in AI analysis job: {e}")
        await async_session.rollback()
    finally:
        await async_session.close()