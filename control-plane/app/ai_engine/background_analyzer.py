"""
Background AI Analyzer — Enhanced with Feedback Loop & Trend Context

IMPROVEMENTS over v1:
1. Passes recent decision history to Gemini (feedback loop)
2. Passes trend directions (rising/falling/stable) for smarter threshold tuning
3. Fixed: scheduler is now uncommented in main.py (see note below)
4. Fetches both 1h and 24h windows to compute trends

NOTE: Remember to uncomment in main.py:
    scheduler.add_job(
        analyze_all_services,
        trigger=CronTrigger(minute='*/5'),
        id="ai_background_analysis",
        ...
    )
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.realtime_aggregates import get_realtime_metrics
from app.ai_engine.llm_analyzer import analyze_service_thresholds, analyze_service_patterns
from app.ai_engine.threshold_manager import get_all_thresholds, update_thresholds
from app.database import models
from app.config import settings

logger = logging.getLogger(__name__)


def _confidence_to_float(confidence: str) -> float:
    return {'low': 0.5, 'medium': 0.7, 'high': 1.0}.get(confidence, 0.5)


def _compute_trends_from_windows(metrics_1h: dict, metrics_24h: dict) -> dict:
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


async def analyze_all_services():
    """
    Background job: Analyze all services and update AI thresholds.
    
    Runs every 5 minutes via APScheduler. For each user's service/endpoint:
    1. Fetch 1h + 24h real-time metrics from Redis
    2. Compute trend directions (latency/error/rpm)
    3. Fetch recent decision history from Redis (feedback loop)
    4. Call Gemini for threshold recommendations (WITH trends + decision history)
    5. Update thresholds if confidence >= medium
    6. Call Gemini for pattern analysis (WITH trends + decision history)
    7. Store insights for dashboard
    """
    if not settings.GEMINI_API_KEY:
        print("⚠️  GEMINI_API_KEY not set — skipping AI analysis")
        return

    print("\n" + "=" * 60)
    print("🤖 Starting AI background analysis job (v2 — with feedback loop)...")
    print("=" * 60)

    async_session = AsyncSessionLocal()

    try:
        users_result = await async_session.execute(select(models.User))
        users = users_result.scalars().all()

        total_analyzed = 0
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
                        continue  # Not enough data

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

                    # 3. Compute trends
                    trends = _compute_trends_from_windows(metrics_1h, metrics_24h)
                    latency_trend = trends['latency_trend']
                    error_trend = trends['error_trend']
                    rpm_trend = trends['rpm_trend']

                    if any(t != 'stable' for t in trends.values()):
                        print(
                            f"📈 [Trends] {service_name}{endpoint} — "
                            f"latency:{latency_trend} errors:{error_trend} rpm:{rpm_trend}"
                        )

                    # 4. Fetch recent decision history (NEW: feedback loop)
                    recent_decisions = []
                    try:
                        from app.functions.decisionFunction import get_recent_decisions
                        recent_decisions = await get_recent_decisions(
                            user_id=user.id,
                            service_name=service_name,
                            endpoint=endpoint,
                            limit=5,
                        )
                    except Exception as e:
                        print(f"⚠️  Could not fetch decision history: {e}")

                    # 5. Get current thresholds
                    current = await get_all_thresholds(
                        async_session, user.id, service_name, endpoint
                    )

                    # 6. Call Gemini for threshold recommendations (WITH trends + history)
                    recommendation = await analyze_service_thresholds(
                        service_name,
                        endpoint,
                        metrics_1h,
                        current,
                        recent_decisions=recent_decisions,   # NEW
                        trends=trends,                        # NEW
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
                        print(
                            f"   Cache: {recommendation.cache_latency_ms}ms | "
                            f"CB: {recommendation.circuit_breaker_error_rate:.0%} | "
                            f"Queue: {recommendation.queue_deferral_rpm} rpm | "
                            f"Shed: {recommendation.load_shedding_rpm} rpm | "
                            f"Rate: {recommendation.rate_limit_customer_rpm} rpm/customer"
                        )
                        print(f"   Reasoning: {recommendation.reasoning}")
                    elif recommendation:
                        print(f"⏭️  Low confidence for {service_name}{endpoint}, skipping update")

                    # 7. Pattern detection + store insights (WITH trends + history)
                    patterns = await analyze_service_patterns(
                        service_name,
                        metrics_1h,
                        recent_decisions=recent_decisions,   # NEW
                        trends=trends,                        # NEW
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
        print(f"   - Services analyzed: {total_analyzed}")
        print(f"   - Thresholds updated: {total_updated}")
        print(f"   - Insights generated: {total_insights}")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"❌ Fatal error in AI analysis job: {e}")
        await async_session.rollback()
    finally:
        await async_session.close()