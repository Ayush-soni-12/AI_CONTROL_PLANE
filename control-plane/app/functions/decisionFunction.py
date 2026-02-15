from ..database import get_async_db
from  ..import models
from fastapi import Depends
from ..realtime_aggregates import get_realtime_metrics
from ..customer_metrics import get_customer_metrics
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..ai_engine import ai_engine
make_ai_decision = ai_engine.make_ai_decision
get_ai_tuned_decision = ai_engine.get_ai_tuned_decision




async def make_decision(
    service_name, 
    endpoint, 
    tenant_id=None,
    db: AsyncSession = None, 
    user_id: int = None,
    customer_identifier: str = None,  # NEW: For per-customer rate limiting
    priority: str = 'medium'  # NEW: For queue/shed decisions
):
    """
    Make AI decision using TWO-TIER APPROACH:
    1. Per-customer rate limiting (individual abuse protection)
    2. Global capacity management (queue/shed based on priority)
    
    PHASE 3 OPTIMIZATION: Uses real-time aggregates from Redis for accurate metrics.
    This ensures decisions are based on 100% of signals, not just sampled data.
    
    PHASE 4: Uses AI-tuned thresholds from background Gemini analysis
    when available, falling back to hardcoded defaults.
    
    Args:
        service_name: Name of the service
        endpoint: API endpoint path
        tenant_id: Optional tenant identifier for multi-tenant filtering
        db: Database session (used as fallback)
        user_id: User ID (required for real-time aggregates)
        customer_identifier: IP or session ID (for per-customer rate limiting)
        priority: Request priority (critical/high/medium/low)
    
    Returns: dictionary with decision
    """

    
    # Get global metrics (all customers combined)
    metrics = None
    if user_id:
        metrics = await get_realtime_metrics(user_id, service_name, endpoint, window='1h', db=db)
    
    # Get per-customer metrics (this customer only)
    customer_rpm = 0
    if user_id and customer_identifier:
        customer_metrics = await get_customer_metrics(
            user_id, service_name, endpoint, customer_identifier
        )
        customer_rpm = customer_metrics.get('requests_per_minute', 0)
        print(f"👤 Customer {customer_identifier[:15]}... making {customer_rpm:.1f} req/min")
    
    # Use real-time aggregates if available
    if metrics and metrics['count'] >= 3:
        avg_latency = metrics['avg_latency']
        error_rate = metrics['error_rate']
        total_rpm = metrics.get('requests_per_minute', 0)  # Global traffic
        
        print(f"✅ Using real-time aggregates: {service_name}{endpoint} - "
              f"Avg: {avg_latency:.1f}ms, Error: {error_rate*100:.1f}%, "
              f"Count: {metrics['count']} (ALL signals), Total RPM: {total_rpm:.1f}, "
              f"p50: {metrics.get('p50', 0):.1f}ms, p95: {metrics.get('p95', 0):.1f}ms, p99: {metrics.get('p99', 0):.1f}ms")
        
        # Use AI-tuned decision (reads thresholds from DB) when db+user_id available
        if db and user_id:
            ai_decision = await get_ai_tuned_decision(
                service_name,
                endpoint,
                avg_latency,
                error_rate,
                requests_per_minute=total_rpm,
                customer_requests_per_minute=customer_rpm,
                priority=priority,
                user_id=user_id,
                db=db
            )
        else:
            # Fallback to hardcoded thresholds
            ai_decision = make_ai_decision(
                service_name, 
                endpoint, 
                avg_latency, 
                error_rate,
                requests_per_minute=total_rpm,
                customer_requests_per_minute=customer_rpm,
                priority=priority
            )
        
        print(f"🤖 AI Decision: {ai_decision['reasoning']}")
        
        # Add status logging
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
            
            return {
                "cache_enabled": ai_decision["cache_enabled"],
                "circuit_breaker": ai_decision.get("circuit_breaker", False),
                "rate_limit_customer": ai_decision.get("rate_limit_customer", False),  # NEW
                "queue_deferral": ai_decision.get("queue_deferral", False),  # NEW
                "load_shedding": ai_decision.get("load_shedding", False),  # NEW
                "reason": ai_decision["reasoning"],
                "send_alert": True,
                "metrics": {
                    "avg_latency": avg_latency,
                    "error_rate": error_rate,
                    "requests_per_minute": total_rpm,
                    "customer_requests_per_minute": customer_rpm,  # NEW
                },
                "ai_decision": ai_decision,
            }
        
        return {
            'cache_enabled': ai_decision['cache_enabled'],
            'circuit_breaker': ai_decision.get('circuit_breaker', False),
            'rate_limit_customer': ai_decision.get('rate_limit_customer', False),  # NEW
            'queue_deferral': ai_decision.get('queue_deferral', False),  # NEW
            'load_shedding': ai_decision.get('load_shedding', False),  # NEW
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
        'rate_limit_enabled': ai_decision.get('rate_limit_enabled', False),  # NEW
        'reason': ai_decision['reasoning'],
        "send_alert": False,
    }

