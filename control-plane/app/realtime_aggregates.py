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
- 1 minute: Used for real-time rate limiting and traffic spike detection
- 1 hour: Used for caching decisions and circuit breaker logic
- 24 hours: Used for dashboard metrics and trends
"""

import json
import statistics
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from app.cache import redis_client
# from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession



def _get_aggregate_key(user_id: int, service_name: str, endpoint: str, window: str) -> str:
    """Generate Redis key for aggregate storage."""
    return f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:{window}"
    

def _percentile(sorted_data: List[float], p: int) -> float:
    """Compute the p-th percentile from a sorted list of values."""
    if not sorted_data:
        return 0.0
    n = len(sorted_data)
    k = (p / 100) * (n - 1)
    f = int(k)
    c = f + 1 if f + 1 < n else f
    d = k - f
    return sorted_data[f] + d * (sorted_data[c] - sorted_data[f])


async def update_realtime_aggregate(
    user_id: int,
    service_name: str,
    endpoint: str,
    latency_ms: float,
    status: str,
    customer_identifier: str = None,  # NEW: For per-customer rate limiting
    priority: str = 'medium'  # NEW: For queue/shed decisions
):
    """
    Update real-time aggregates for ALL signals (100% coverage).
    
    TWO-TIER TRACKING:
    1. Global aggregates: All customers combined (for queue/shed decisions)
    2. Per-customer aggregates: Individual customer tracking (for rate limiting)
    
    This function is called for EVERY signal, regardless of whether it's
    stored in the database or not. This ensures accurate metrics.
    
    Args:
        user_id: User ID who owns this signal
        service_name: Name of the service
        endpoint: API endpoint path
        latency_ms: Request latency in milliseconds
        status: Status of the request ('success' or 'error')
        customer_identifier: IP or session ID (optional, for per-customer limiting)
        priority: Request priority (critical/high/medium/low)
    """
    # Update aggregates with different strategies based on window
    # 1m: Time-bucketed (one key per minute)
    # 1h, 24h: Accumulating with TTL
    
    import time
    current_timestamp = int(time.time())
    
    for window in ['1m', '1h', '24h']:
        # Get current aggregate or initialize
        try:
            # For 1-minute window, use time-bucketed key to ensure true 60s window
            if window == '1m':
                # Create a key that includes the current minute timestamp
                # This ensures each minute gets its own bucket
                current_minute = current_timestamp // 60  # Unix timestamp divided by 60
                key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:{window}:{current_minute}"
                ttl = 120  # Keep for 2 minutes to allow reads from previous minute
            else:
                # For 1h and 24h, use the standard key
                key = _get_aggregate_key(user_id, service_name, endpoint, window)
                ttl = 3600 if window == '1h' else 86400
            
            data = await redis_client.get(key)  # await async call
            if data:
                agg = json.loads(data)
            else:
                agg = {
                    'count': 0,
                    'sum_latency': 0,
                    'errors': 0,
                    'last_updated': None,
                    'window_start': current_timestamp if window == '1m' else None
                }
            
            # Update counters
            agg['count'] += 1
            agg['sum_latency'] += latency_ms
            if status == 'error':
                agg['errors'] += 1
            agg['last_updated'] = datetime.now().isoformat()
            
            # Save back to Redis with appropriate TTL
            await redis_client.setex(key, ttl, json.dumps(agg))  # await async call
            
            # Track individual latency in sorted set for percentile calculation
            # Use timestamp+random as member to allow duplicate latencies
            latency_key = f"{key}:latencies"
            member = f"{current_timestamp}:{latency_ms}"
            await redis_client.zadd(latency_key, {member: latency_ms})
            # Cap at 1000 samples (remove oldest)
            count = await redis_client.zcard(latency_key)
            if count > 1000:
                await redis_client.zremrangebyrank(latency_key, 0, count - 1001)
            await redis_client.expire(latency_key, ttl)
            
        except Exception as e:
            # Log error but don't fail the signal processing
            print(f"❌ Error updating real-time aggregate: {e}")
    
    # NEW: Per-customer tracking (1-minute window only, for rate limiting)
    if customer_identifier:
        try:
            import time
            current_timestamp = int(time.time())
            current_minute = current_timestamp // 60
            
            # Create per-customer key
            customer_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:customer:{customer_identifier}:1m:{current_minute}"
            
            # Get or initialize per-customer aggregate
            customer_data = await redis_client.get(customer_key)
            if customer_data:
                customer_agg = json.loads(customer_data)
            else:
                customer_agg = {'count': 0, 'last_updated': None}
            
            # Update customer counter
            customer_agg['count'] += 1
            customer_agg['last_updated'] = datetime.now().isoformat()
            
            # Save with 2-minute TTL
            await redis_client.setex(customer_key, 120, json.dumps(customer_agg))
            
        except Exception as e:
            print(f"❌ Error updating per-customer aggregate: {e}")


async def get_realtime_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    window: str = '1h',
    db: AsyncSession = None
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
        Dict with keys: count, sum_latency, errors, avg_latency, error_rate, requests_per_minute
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
            
            # 🔥 FIX: Get ACTUAL current rate from 1-minute aggregate
            # This is more accurate than 1-hour average for detecting traffic spikes
            try:
                import time
                current_timestamp = int(time.time())
                current_minute = current_timestamp // 60
                
                # Try current minute bucket first
                one_min_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:1m:{current_minute}"
                one_min_data = await redis_client.get(one_min_key)
                print(f"One minute data: {one_min_data}")
                
                if one_min_data:
                    one_min_agg = json.loads(one_min_data)
                    # Direct count from 1-minute window = requests per minute!
                    requests_per_minute = one_min_agg.get('count', 0)
                    print(f"Requests per minute: {requests_per_minute}")
                else:
                    # Fallback: use window-based calculation
                    window_minutes = 60 if window == '1h' else 1440
                    requests_per_minute = agg['count'] / window_minutes
            except Exception as e:
                print(f"⚠️ Error getting 1min aggregate, using fallback: {e}")
                window_minutes = 60 if window == '1h' else 1440
                requests_per_minute = agg['count'] / window_minutes
            
            # Calculate p50/p95/p99 from latency sorted set
            p50, p95, p99 = 0, 0, 0
            try:
                latency_key = f"{key}:latencies"
                raw_scores = await redis_client.zrange(latency_key, 0, -1, withscores=True)
                if raw_scores:
                    latencies = sorted([score for _, score in raw_scores])
                    p50 = _percentile(latencies, 50)
                    p95 = _percentile(latencies, 95)
                    p99 = _percentile(latencies, 99)
            except Exception as e:
                print(f"⚠️ Error computing percentiles: {e}")
            
            return {
                'count': agg['count'],
                'sum_latency': agg['sum_latency'],
                'errors': agg['errors'],
                'avg_latency': avg_latency,
                'error_rate': error_rate,
                'requests_per_minute': requests_per_minute,  # NEW: actual 60s rate
                'p50': round(p50, 2),
                'p95': round(p95, 2),
                'p99': round(p99, 2),
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
                # For snapshots, use 1-hour average since we don't have rate limiter data
                window_minutes = 60 if window == '1h' else 1440
                snapshot_metrics['requests_per_minute'] = (
                    snapshot_metrics.get('count', 0) / window_minutes if window_minutes > 0 else 0
                )
                snapshot_metrics['source'] = 'snapshot'
                return snapshot_metrics
        
        # TIER 3: No data available (caller will use sampled DB signals)
        return None
        
    except Exception as e:
        print(f"❌ Error getting real-time metrics: {e}")
        return None



