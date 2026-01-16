from ..database import get_db
from  ..import models
from fastapi import Depends
from sqlalchemy.orm import Session






def calculate_average_latency(service_name, endpoint, db:Session = Depends(get_db)):
    """
    Calculate average latency for a specific endpoint
    
    Returns: average latency in ms, or None if not enough data
    """
    
    signals = db.query(models.Signal).filter(
        models.Signal.service_name == service_name,
        models.Signal.endpoint == endpoint
    ).order_by(models.Signal.timestamp.desc()).limit(10).all()

    print(f"fetch signals for {service_name}{endpoint} : {signals}")
    
    
    
    if len(signals) < 3:
        return None
    
    total = sum(s.latency_ms for s in signals)
    return total / len(signals)


def make_decision(service_name, endpoint):
    """
    Decide if cache should be enabled for this endpoint
    
    Rule: If average latency > 500ms, enable cache
    
    Returns: dictionary with decision
    """
    
    # Calculate average
    avg_latency = calculate_average_latency(service_name, endpoint)
    
    # Not enough data yet
    if avg_latency is None:
        return {
            'cache_enabled': False,
            'reason': 'Not enough data yet (need 3+ signals)'
        }
    
    # Decision logic
    if avg_latency > 500:
        print(f"🧠 Decision: Enable cache for {service_name}{endpoint} (avg: {avg_latency:.0f}ms)")
        return {
            'cache_enabled': True,
            'reason': f'Average latency is {avg_latency:.0f}ms (threshold: 500ms)'
        }
    else:
        return {
            'cache_enabled': False,
            'reason': f'Performance is good ({avg_latency:.0f}ms)'
        }
