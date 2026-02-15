"""
Background AI Analyzer — Runs every 5 minutes.

Fetches metrics for all services, calls Gemini for threshold
recommendations and pattern detection, updates AI thresholds in DB.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy import select, distinct, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.realtime_aggregates import get_realtime_metrics
from app.ai_engine.llm_analyzer import analyze_service_thresholds, analyze_service_patterns
from app.ai_engine.threshold_manager import get_all_thresholds, update_thresholds
from app import models
from app.config import settings

logger = logging.getLogger(__name__)


def _confidence_to_float(confidence: str) -> float:
    """Convert string confidence level to numeric value."""
    confidence_map = {
        'low': 0.5,
        'medium': 0.7,
        'high': 1.0
    }
    return confidence_map.get(confidence, 0.5)


async def analyze_all_services():
    """
    Background job: Analyze all services and update AI thresholds.
    
    Runs every 5 minutes via APScheduler. For each user's service/endpoint:
    1. Fetch real-time metrics (with p50/p95/p99)
    2. Get current AI thresholds (or defaults)
    3. Call Gemini for threshold recommendations
    4. Update thresholds if confidence >= 0.7
    5. Store insights for dashboardount', 0)
                    print(f"Requests per minute: {requests_per_minute}")
                else:
                    # Fallback: use window-based calculation
                    window_minutes = 60 if window == '1h' else 1440
                    requests_per_minute = agg['count'] / window_
    """
    # Check if Gemini API key is configured
    if not settings.GEMINI_API_KEY:
        print("⚠️  GEMINI_API_KEY not set — skipping AI analysis")
        return
    
    print("\n" + "=" * 60)
    print("🤖 Starting AI background analysis job...")
    print("=" * 60)
    
    async_session = AsyncSessionLocal()
    
    try:
        # Get all users
        users_result = await async_session.execute(select(models.User))
        users = users_result.scalars().all()
        
        total_analyzed = 0
        total_updated = 0
        total_insights = 0
        
        for user in users:
            # Get distinct service/endpoint combinations for this user
            stmt = select(
                models.Signal.service_name,
                models.Signal.endpoint
            ).filter(
                models.Signal.user_id == user.id
            ).distinct()
            
            endpoints_result = await async_session.execute(stmt)
            endpoints = endpoints_result.all()
            
            for service_name, endpoint in endpoints:
                try:
                    # 1. Fetch real-time metrics (includes p50/p95/p99)
                    metrics = await get_realtime_metrics(
                        user_id=user.id,
                        service_name=service_name,
                        endpoint=endpoint,
                        window='1h',
                        db=async_session
                    )
                    
                    if not metrics or metrics.get('count', 0) < 10:
                        continue  # Skip if not enough data
                    
                    total_analyzed += 1
                    
                    # 2. Get current thresholds
                    current = await get_all_thresholds(
                        async_session, user.id, service_name, endpoint
                    )
                    
                    # 3. Call Gemini for threshold recommendations
                    recommendation = await analyze_service_thresholds(
                        service_name, endpoint, metrics, current
                    )
                    
                    # Only update if confidence is medium or high (not low)
                    if recommendation and recommendation.confidence in ['medium', 'high']:
                        # 4. Update thresholds
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
                            _confidence_to_float(recommendation.confidence)
                        )
                        total_updated += 1
                        
                        print(f"✅ Updated thresholds for {service_name}{endpoint} (confidence: {recommendation.confidence})")
                        print(f"   Cache: {recommendation.cache_latency_ms}ms | "
                              f"CB: {recommendation.circuit_breaker_error_rate:.0%} | "
                              f"Queue: {recommendation.queue_deferral_rpm} rpm | "
                              f"Shed: {recommendation.load_shedding_rpm} rpm | "
                              f"Rate: {recommendation.rate_limit_customer_rpm} rpm/customer")
                        print(f"   Reasoning: {recommendation.reasoning}")
                    elif recommendation:
                        print(f"⏭️  Low confidence for {service_name}{endpoint}, skipping update")
                    
                    # 5. Pattern detection + store insights
                    patterns = await analyze_service_patterns(service_name, metrics)
                    
                    if patterns:
                        now = datetime.now(timezone.utc)
                        
                        # 1. Consolidate all patterns into ONE insight row
                        if patterns.patterns:
                            pattern_parts = []
                            avg_confidence = 0.0
                            for pattern in patterns.patterns:
                                pattern_parts.append(
                                    f"• {pattern.pattern_type}: {pattern.description}. Recommendation: {pattern.recommendation}"
                                )
                                avg_confidence += _confidence_to_float(pattern.confidence)
                            avg_confidence /= len(patterns.patterns)
                            
                            async_session.add(models.AIInsight(
                                user_id=user.id,
                                service_name=service_name,
                                insight_type='pattern',
                                description="\n".join(pattern_parts),
                                confidence=round(avg_confidence, 2),
                                created_at=now
                            ))
                            total_insights += 1
                        
                        # 2. Always store ONE anomaly row
                        if patterns.anomalies:
                            anomaly_parts = [
                                f"• [{a.severity.upper()}] {a.description}" 
                                for a in patterns.anomalies
                            ]
                            anomaly_desc = "\n".join(anomaly_parts)
                        else:
                            anomaly_desc = "No anomalies detected. The service is operating within normal parameters."
                        
                        async_session.add(models.AIInsight(
                            user_id=user.id,
                            service_name=service_name,
                            insight_type='anomaly',
                            description=anomaly_desc,
                            confidence=None,
                            created_at=now
                        ))
                        total_insights += 1
                        
                        # 3. Store ONE recommendation/summary
                        if patterns.summary:
                            async_session.add(models.AIInsight(
                                user_id=user.id,
                                service_name=service_name,
                                insight_type='recommendation',
                                description=patterns.summary,
                                confidence=None,
                                created_at=now
                            ))
                            total_insights += 1
                    
                except Exception as e:
                    print(f"❌ Error analyzing {service_name}{endpoint}: {e}")
                    continue
        
        # Commit all changes
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
