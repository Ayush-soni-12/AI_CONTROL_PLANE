"""
Real-Time Aggregate Tracking for Signals

This module provides Redis-based real-time metric aggregation for ALL incoming signals.
It solves the problem of accurate metrics calculation when using signal sampling.

WHY THIS IS NEEDED:
- Without this: If we sample 10% of signals for storage, metrics would be inaccurate
- With this: We track 100% of signals in Redis (accurate) while storing only 10% (efficient)

ARCHITECTURE:
1. ALL signals update Redis counters (100% coverage)
2. SAMPLED signals get stored in PostgreSQL (10% success, 100% errors)
3. Metrics for decisions come from Redis (accurate)
4. Historical analysis uses PostgreSQL (efficient)

TIME WINDOWS:
- 1 hour: Used for caching decisions and circuit breaker logic
- 24 hours: Used for dashboard metrics and trends
"""

import json
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.cache import redis_client
from sqlalchemy.orm import Session



def _get_aggregate_key(user_id: int, service_name: str, endpoint: str, window: str) -> str:
    """Generate Redis key for aggregate storage."""
    return f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:{window}"


async def update_realtime_aggregate(
    user_id: int,
    service_name: str,
    endpoint: str,
    latency_ms: float,
    status: str
):
    """
    Update real-time aggregates for ALL signals (100% coverage).
    
    This function is called for EVERY signal, regardless of whether it's
    stored in the database or not. This ensures accurate metrics.
    
    Args:
        user_id: User ID who owns this signal
        service_name: Name of the service
        endpoint: API endpoint path
        latency_ms: Request latency in milliseconds
        status: Status of the request ('success' or 'error')
    """
    # Update both 1-hour and 24-hour windows
    for window in ['1h', '24h']:
        key = _get_aggregate_key(user_id, service_name, endpoint, window)
        
        # Get current aggregate or initialize
        try:
            data = await redis_client.get(key)  # await async call
            if data:
                agg = json.loads(data)
            else:
                agg = {
                    'count': 0,
                    'sum_latency': 0,
                    'errors': 0,
                    'last_updated': None
                }
            
            # Update counters
            agg['count'] += 1
            agg['sum_latency'] += latency_ms
            if status == 'error':
                agg['errors'] += 1
            agg['last_updated'] = datetime.now().isoformat()
            
            # Set TTL based on window
            ttl = 3600 if window == '1h' else 86400  # 1 hour or 24 hours
            
            # Save back to Redis
            await redis_client.setex(key, ttl, json.dumps(agg))  # await async call
            
        except Exception as e:
            # Log error but don't fail the signal processing
            print(f"❌ Error updating real-time aggregate: {e}")


async def get_realtime_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    window: str = '1h',
    db: Session = None
) -> Optional[Dict]:
    """
    Get real-time metrics with THREE-TIER FALLBACK:
    
    1. PRIMARY: Redis real-time aggregates (accurate, fast)
    2. FALLBACK: PostgreSQL snapshots (accurate, slightly stale)
    3. LAST RESORT: None (caller uses sampled database signals)
    
    Returns accurate metrics calculated from ALL signals (100% coverage),
    not just the sampled signals in the database.
    
    Args:
        user_id: User ID
        service_name: Name of the service
        endpoint: API endpoint path
        window: Time window ('1h' or '24h')
        db: Database session (optional, for snapshot fallback)
    
    Returns:
        Dict with keys: count, sum_latency, errors, avg_latency, error_rate
        Returns None if no data exists in Redis or snapshots
    """
    key = _get_aggregate_key(user_id, service_name, endpoint, window)
    
    try:
        # TIER 1: Try Redis first (most up-to-date)
        data = await redis_client.get(key)  # await async call
        if data:
            agg = json.loads(data)
            
            # Calculate derived metrics
            avg_latency = agg['sum_latency'] / agg['count'] if agg['count'] > 0 else 0
            error_rate = agg['errors'] / agg['count'] if agg['count'] > 0 else 0
            
            return {
                'count': agg['count'],
                'sum_latency': agg['sum_latency'],
                'errors': agg['errors'],
                'avg_latency': avg_latency,
                'error_rate': error_rate,
                'last_updated': agg.get('last_updated'),
                'source': 'redis'
            }
        
        # TIER 2: Fallback to PostgreSQL snapshots (accurate but slightly stale)
        if db is not None:
            from app.aggregate_persistence import get_snapshot_metrics
            
            snapshot_metrics = await get_snapshot_metrics(
                user_id=user_id,
                service_name=service_name,
                endpoint=endpoint,
                window=window,
                db=db
            )
            
            if snapshot_metrics:
                snapshot_metrics['source'] = 'snapshot'
                return snapshot_metrics
        
        # TIER 3: No data available (caller will use sampled DB signals)
        return None
        
    except Exception as e:
        print(f"❌ Error getting real-time metrics: {e}")
        return None



def get_service_metrics(user_id: int, service_name: str, window: str = '24h') -> Dict:
    """
    Get aggregated metrics for all endpoints of a service.
    
    Useful for dashboard service-level metrics.
    
    Args:
        user_id: User ID
        service_name: Name of the service
        window: Time window ('1h' or '24h')
    
    Returns:
        Dict with aggregated metrics across all endpoints
    """
    # This would require scanning Redis keys, which is expensive
    # For now, return None and let the caller aggregate from individual endpoints
    # In production, consider maintaining a separate service-level aggregate
    return {}


def cleanup_old_aggregates():
    """
    Cleanup job to remove stale aggregates.
    
    This is handled automatically by Redis TTL, but this function
    can be used for manual cleanup if needed.
    """
    # Redis TTL handles this automatically
    # 1h window expires after 1 hour
    # 24h window expires after 24 hours
    pass
