from ..database import get_async_db
from  ..import models
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..ai_engine import ai_engine
make_ai_decision = ai_engine.make_ai_decision




async def make_decision(service_name, endpoint, tenant_id=None, db: AsyncSession = None, user_id: int = None):
    """
    Decide if cache should be enabled for this endpoint
    
    PHASE 3 OPTIMIZATION: Uses real-time aggregates from Redis for accurate metrics.
    This ensures decisions are based on 100% of signals, not just sampled data.
    
    Args:
        service_name: Name of the service
        endpoint: API endpoint path
        tenant_id: Optional tenant identifier for multi-tenant filtering
        db: Database session (used as fallback)
        user_id: User ID (required for real-time aggregates)
    
    Returns: dictionary with decision
    """
    from ..realtime_aggregates import get_realtime_metrics
    
    # Try to get metrics from real-time aggregates first (accurate, all signals)
    if user_id:
        metrics = await get_realtime_metrics(user_id, service_name, endpoint, window='1h', db=db)
        
        if metrics and metrics['count'] >= 3:
            avg_latency = metrics['avg_latency']
            error_rate = metrics['error_rate']
            
            print(f"✅ Using real-time aggregates: {service_name}{endpoint} - "
                  f"Avg: {avg_latency:.1f}ms, Error: {error_rate*100:.1f}%, "
                  f"Count: {metrics['count']} (ALL signals)")
            
            # Use AI decision with accurate metrics
            ai_decision = make_ai_decision(service_name, endpoint, avg_latency, error_rate)
            
            print(f"🤖 AI Decision: {ai_decision['reasoning']}")
            
            # Add circuit breaker status
            if ai_decision.get('circuit_breaker'):
                print(f"⚠️  Circuit breaker activated for {service_name}{endpoint}")
            
            if ai_decision.get('alert'):
                print(f"🚨 Alert: Issues detected for {service_name}{endpoint}")
                
                return {
                    "cache_enabled": ai_decision["cache_enabled"],
                    "circuit_breaker": ai_decision.get("circuit_breaker", False),
                    "reason": ai_decision["reasoning"],
                    "send_alert": True,
                    "metrics": {
                        "avg_latency": avg_latency,
                        "error_rate": error_rate,
                    },
                    "ai_decision": ai_decision,
                }
            
            return {
                'cache_enabled': ai_decision['cache_enabled'],
                'circuit_breaker': ai_decision.get('circuit_breaker', False),
                'reason': ai_decision['reasoning'],
                "send_alert": False,
            }
    
    # FALLBACK: Use database if no real-time data available
    print(f"⚠️  No real-time aggregates found, falling back to database query")

    # Build query with service_name and endpoint filters (async pattern)
    stmt = select(models.Signal).filter(
        models.Signal.service_name == service_name,
        models.Signal.endpoint == endpoint
    )
    
    # Add tenant_id filter if provided
    if tenant_id:
        stmt = stmt.filter(models.Signal.tenant_id == tenant_id)
    
    stmt = stmt.order_by(models.Signal.timestamp.desc()).limit(20)
    result = await db.execute(stmt)
    signals = result.scalars().all()

    print(f"fetch signals for {service_name}{endpoint} (tenant: {tenant_id or 'all'}): {signals}")

    if len(signals) < 3:
        return {
            'cache_enabled': False,
            'circuit_breaker': False,
            'reason': 'Not enough data yet (need 3+ signals)'
        }
    
    # Calculate metrics from database (may be inaccurate due to sampling)
    avg_latency = sum(s.latency_ms for s in signals) / len(signals)
    error_count = sum(1 for s in signals if s.status == 'error')
    error_rate = error_count / len(signals)

    
    
    ai_decision = make_ai_decision(service_name, endpoint, avg_latency, error_rate)
    
    print(f"🤖 AI Decision: {ai_decision['reasoning']}")
    
    # Add circuit breaker status
    if ai_decision.get('circuit_breaker'):
        print(f"⚠️  Circuit breaker activated for {service_name}{endpoint}")
    
    if ai_decision.get('alert'):
        print(f"🚨 Alert: Issues detected for {service_name}{endpoint}")
        
        subject = f"🚨 Alert: Issue Detected in {service_name}"

        return {
            "cache_enabled": ai_decision["cache_enabled"],
            "circuit_breaker": ai_decision.get("circuit_breaker", False),
            "reason": ai_decision["reasoning"],
            "send_alert": True,
            "metrics": {
                "avg_latency": avg_latency,
                "error_rate": error_rate,
            },
            "ai_decision": ai_decision,
        }
    
    return {
        'cache_enabled': ai_decision['cache_enabled'],
        'circuit_breaker': ai_decision.get('circuit_breaker', False),
        'reason': ai_decision['reasoning'],
        "send_alert": False,
    }

