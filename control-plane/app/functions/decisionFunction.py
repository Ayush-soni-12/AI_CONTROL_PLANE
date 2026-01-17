from ..database import get_db
from  ..import models
from fastapi import Depends
from sqlalchemy.orm import Session
from  ...ai_engine import ai_engine

make_ai_decision = ai_engine.make_ai_decision




def make_decision(service_name, endpoint, db:Session = Depends(get_db)):
    """
    Decide if cache should be enabled for this endpoint
    
    Rule: If average latency > 500ms, enable cache
    
    Returns: dictionary with decision
    """


    signals = db.query(models.Signal).filter(
        models.Signal.service_name == service_name,
        models.Signal.endpoint == endpoint
    ).order_by(models.Signal.timestamp.desc()).limit(10).all()

    print(f"fetch signals for {service_name}{endpoint} : {signals}")

    if len(signals) < 3:
        return {
            'cache_enabled': False,
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
