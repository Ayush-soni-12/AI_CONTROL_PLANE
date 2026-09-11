"""
Real-Time Aggregate Tracking for Signals
Provides Redis-based real-time metric aggregation for ALL incoming signals
with multi-tenant key namespacing and outage resilience.

ARCHITECTURE:
1. ALL signals update Redis counters (100% coverage)
2. SAMPLED signals get stored in PostgreSQL (10% success, 100% errors)
3. Metrics for decisions come from Redis (accurate) with snapshot and DB fallback
4. Keys are strictly namespaced by tenant: nc:tenant:{tenant_id}:service:{service_name}:...
"""

import json
import logging
import statistics
import time
import uuid
from typing import Optional, Dict, List, Union
from datetime import datetime, timezone
from app.redis.cache import redis_client, get_tenant_key
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

logger = logging.getLogger(__name__)


def _get_aggregate_key(
    user_id: int,
    service_name: str,
    endpoint: str,
    window: str,
    tenant_id: Optional[Union[str, int]] = None
) -> str:
    """Generate standardized multi-tenant Redis key for aggregate storage."""
    tid = tenant_id if tenant_id is not None else user_id
    return get_tenant_key(tid, service_name, "endpoint", endpoint, window)


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
    customer_identifier: str = None,
    priority: str = 'medium',
    action_taken: str = 'none',
    flag_name: str = None,
    tenant_id: Optional[Union[str, int]] = None
):
    """
    Update real-time aggregates for ALL signals (100% coverage).
    
    Args:
        user_id: User ID who owns this signal
        service_name: Name of the service
        endpoint: API endpoint path
        latency_ms: Request latency in milliseconds
        status: Status of the request ('success' or 'error')
        customer_identifier: IP or session ID (optional, for per-customer limiting)
        priority: Request priority (critical/high/medium/low)
        action_taken: Action taken by control plane
        flag_name: Optional feature flag name
        tenant_id: Optional tenant ID override (defaults to user_id)
    """
    tid = tenant_id if tenant_id is not None else user_id
    current_timestamp = int(time.time())
    
    for window in ['1m', '1h', '24h']:
        try:
            if window == '1m':
                current_minute = current_timestamp // 60
                key = get_tenant_key(tid, service_name, "endpoint", endpoint, f"1m:{current_minute}")
                ttl = 120  # Keep for 2 minutes to allow reads from previous minute
            else:
                key = _get_aggregate_key(user_id, service_name, endpoint, window, tenant_id=tid)
                ttl = 3600 if window == '1h' else 86400

            data = await redis_client.get(key)
            if data:
                agg = json.loads(data)
            else:
                agg = {
                    'count': 0,
                    'sum_latency': 0.0,
                    'errors': 0,
                    'rate_limit_enabled': False,
                    'last_updated': None,
                    'window_start': current_timestamp if window == '1m' else None
                }

            agg['count'] += 1
            agg['sum_latency'] += latency_ms
            if status == 'error':
                agg['errors'] += 1
            if action_taken == 'rate_limited':
                agg['rate_limit_enabled'] = True
            else:
                agg['rate_limit_enabled'] = False
            agg['last_updated'] = datetime.now(timezone.utc).isoformat()

            await redis_client.setex(key, ttl, json.dumps(agg))

            # Feature flag tracking
            if flag_name:
                flag_key = get_tenant_key(tid, service_name, "endpoint", endpoint, "flag", flag_name, window)
                flag_list_key = get_tenant_key(tid, service_name, "endpoint", endpoint, "active_flags")
                await redis_client.sadd(flag_list_key, flag_name)
                await redis_client.expire(flag_list_key, 3600)

                flag_data = await redis_client.get(flag_key)
                f_agg = json.loads(flag_data) if flag_data else {
                    'count': 0, 'sum_latency': 0.0, 'errors': 0, 'last_updated': None
                }
                f_agg['count'] += 1
                f_agg['sum_latency'] += latency_ms
                if status == 'error':
                    f_agg['errors'] += 1
                f_agg['last_updated'] = datetime.now(timezone.utc).isoformat()
                await redis_client.setex(flag_key, ttl, json.dumps(f_agg))

            # Track latency in sorted set for percentiles
            latency_key = f"{key}:latencies"
            unique_id = uuid.uuid4().hex[:8]
            member = f"{current_timestamp}:{unique_id}:{latency_ms}"
            await redis_client.zadd(latency_key, {member: latency_ms})
            count = await redis_client.zcard(latency_key)
            if count > 1000:
                await redis_client.zremrangebyrank(latency_key, 0, count - 1001)
            await redis_client.expire(latency_key, ttl)

        except Exception as e:
            # Redis failure should not crash signal processing
            logger.debug(f"Redis aggregate update failed gracefully: {e}")

    # Per-customer tracking (1-minute window only)
    if customer_identifier:
        try:
            current_minute = current_timestamp // 60
            customer_key = get_tenant_key(
                tid, service_name, "endpoint", endpoint, "customer", customer_identifier, f"1m:{current_minute}"
            )
            customer_data = await redis_client.get(customer_key)
            if customer_data:
                customer_agg = json.loads(customer_data)
            else:
                customer_agg = {'count': 0, 'last_updated': None}

            customer_agg['count'] += 1
            customer_agg['last_updated'] = datetime.now(timezone.utc).isoformat()
            await redis_client.setex(customer_key, 120, json.dumps(customer_agg))
        except Exception as e:
            logger.debug(f"Per-customer aggregate update failed gracefully: {e}")


async def get_realtime_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    window: str = '1h',
    db: AsyncSession = None,
    flag_name: str = None,
    tenant_id: Optional[Union[str, int]] = None
) -> Optional[Dict]:
    """
    Get real-time metrics with three-tier fallback:
    1. PRIMARY: Redis real-time aggregates
    2. FALLBACK: PostgreSQL snapshots
    3. LAST RESORT: Raw sampled DB signals
    """
    tid = tenant_id if tenant_id is not None else user_id
    if flag_name:
        key = get_tenant_key(tid, service_name, "endpoint", endpoint, "flag", flag_name, window)
        legacy_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:flag:{flag_name}:{window}"
    else:
        key = _get_aggregate_key(user_id, service_name, endpoint, window, tenant_id=tid)
        legacy_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:{window}"

    try:
        # TIER 1: Try Redis first
        data = await redis_client.get(key)
        if not data:
            # Check legacy key during migration
            data = await redis_client.get(legacy_key)

        if data:
            agg = json.loads(data)
            avg_latency = agg['sum_latency'] / agg['count'] if agg['count'] > 0 else 0
            error_rate = agg['errors'] / agg['count'] if agg['count'] > 0 else 0

            # Traffic rate from current minute bucket
            requests_per_minute = 0
            try:
                current_timestamp = int(time.time())
                current_minute = current_timestamp // 60
                one_min_key = get_tenant_key(tid, service_name, "endpoint", endpoint, f"1m:{current_minute}")
                one_min_data = await redis_client.get(one_min_key)
                if not one_min_data:
                    # Check legacy minute bucket
                    one_min_data = await redis_client.get(
                        f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:1m:{current_minute}"
                    )

                if one_min_data:
                    one_min_agg = json.loads(one_min_data)
                    requests_per_minute = one_min_agg.get('count', 0)
                else:
                    prev_min_key = get_tenant_key(tid, service_name, "endpoint", endpoint, f"1m:{current_minute - 1}")
                    prev_min_data = await redis_client.get(prev_min_key)
                    if prev_min_data:
                        prev_min_agg = json.loads(prev_min_data)
                        requests_per_minute = prev_min_agg.get('count', 0)
                    else:
                        window_minutes = 60 if window == '1h' else 1440
                        requests_per_minute = agg['count'] / window_minutes
            except Exception:
                window_minutes = 60 if window == '1h' else 1440
                requests_per_minute = agg['count'] / window_minutes

            # Calculate p50/p95/p99 from sorted set
            p50, p95, p99 = 0.0, 0.0, 0.0
            try:
                latency_key = f"{key}:latencies"
                raw_scores = await redis_client.zrange(latency_key, 0, -1, withscores=True)
                if not raw_scores:
                    raw_scores = await redis_client.zrange(f"{legacy_key}:latencies", 0, -1, withscores=True)
                if raw_scores:
                    latencies = sorted([score for _, score in raw_scores])
                    p50 = _percentile(latencies, 50)
                    p95 = _percentile(latencies, 95)
                    p99 = _percentile(latencies, 99)
            except Exception as e:
                logger.debug(f"Could not compute percentiles from Redis: {e}")

            return {
                'count': agg['count'],
                'sum_latency': agg['sum_latency'],
                'errors': agg['errors'],
                'avg_latency': avg_latency,
                'error_rate': error_rate,
                'requests_per_minute': requests_per_minute,
                'rate_limit_enabled': agg.get('rate_limit_enabled', False),
                'p50': round(p50, 2),
                'p95': round(p95, 2),
                'p99': round(p99, 2),
                'last_updated': agg.get('last_updated'),
                'source': 'redis'
            }

    except Exception as e:
        logger.debug(f"Redis get_realtime_metrics error: {e}")

    # TIER 2: Fallback to PostgreSQL snapshots
    if db is not None:
        try:
            from app.redis.aggregate_persistence import get_snapshot_metrics
            snapshot_metrics = await get_snapshot_metrics(
                user_id=user_id,
                service_name=service_name,
                endpoint=endpoint,
                window=window,
                db=db
            )
            if snapshot_metrics:
                window_minutes = 60 if window == '1h' else 1440
                snapshot_metrics['requests_per_minute'] = (
                    snapshot_metrics.get('count', 0) / window_minutes if window_minutes > 0 else 0
                )
                snapshot_metrics['source'] = 'snapshot'
                return snapshot_metrics
        except Exception as e:
            logger.debug(f"Snapshot fallback error: {e}")

    # TIER 3: Fallback to evaluating raw sampled DB signals
    if db is not None:
        try:
            from app.database import models
            stmt = select(models.Signal).filter(
                and_(
                    models.Signal.user_id == user_id,
                    models.Signal.service_name == service_name,
                    models.Signal.endpoint == endpoint
                )
            ).order_by(models.Signal.timestamp.desc())

            result = await db.execute(stmt)
            signals = result.scalars().all()

            if signals:
                count = len(signals)
                sum_latency = sum(s.latency_ms for s in signals)
                errors = sum(1 for s in signals if s.status == 'error')
                avg_latency = sum_latency / count if count > 0 else 0
                error_rate = errors / count if count > 0 else 0
                latencies = sorted([s.latency_ms for s in signals])
                p50 = _percentile(latencies, 50)
                p95 = _percentile(latencies, 95)
                p99 = _percentile(latencies, 99)

                return {
                    'count': count,
                    'sum_latency': sum_latency,
                    'errors': errors,
                    'avg_latency': avg_latency,
                    'error_rate': error_rate,
                    'requests_per_minute': 0,
                    'rate_limit_enabled': False,
                    'p50': p50,
                    'p95': p95,
                    'p99': p99,
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'source': 'database'
                }
        except Exception as e:
            logger.debug(f"Database fallback error: {e}")

    return None


async def get_active_flags_for_endpoint(
    user_id: int,
    service_name: str,
    endpoint: str,
    tenant_id: Optional[Union[str, int]] = None
) -> List[str]:
    """Get list of feature flags that have sent signals in the last hour."""
    tid = tenant_id if tenant_id is not None else user_id
    key = get_tenant_key(tid, service_name, "endpoint", endpoint, "active_flags")
    try:
        flags = await redis_client.smembers(key)
        if not flags:
            legacy_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:active_flags"
            flags = await redis_client.smembers(legacy_key)
        return [f.decode('utf-8') if isinstance(f, bytes) else str(f) for f in flags]
    except Exception:
        return []
