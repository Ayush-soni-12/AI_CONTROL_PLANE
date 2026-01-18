from ..database import get_db
from  ..import models
from fastapi import Depends
from sqlalchemy.orm import Session
from ..ai_engine import ai_engine

make_ai_decision = ai_engine.make_ai_decision




def make_decision(service_name, endpoint, tenant_id=None, db: Session = None):
    """
    Decide if cache should be enabled for this endpoint
    
    Rule: If average latency > 500ms, enable cache
    
    Args:
        service_name: Name of the service
        endpoint: API endpoint path
        tenant_id: Optional tenant identifier for multi-tenant filtering
        db: Database session
    
    Returns: dictionary with decision
    """

    # Build query with service_name and endpoint filters
    query = db.query(models.Signal).filter(
        models.Signal.service_name == service_name,
        models.Signal.endpoint == endpoint
    )
    
    # Add tenant_id filter if provided
    if tenant_id:
        query = query.filter(models.Signal.tenant_id == tenant_id)
    
    signals = query.order_by(models.Signal.timestamp.desc()).limit(10).all()

    print(f"fetch signals for {service_name}{endpoint} (tenant: {tenant_id or 'all'}): {signals}")

    if len(signals) < 3:
        return {
            'cache_enabled': False,
            'circuit_breaker': False,
            'reason': 'Not enough data yet (need 3+ signals)'
        }
    
    # Calculate metrics
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
    
    return {
        'cache_enabled': ai_decision['cache_enabled'],
        'circuit_breaker': ai_decision.get('circuit_breaker', False),
        'reason': ai_decision['reasoning']
    }

