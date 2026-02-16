"""
Analytics Router

Provides endpoints for advanced analytics:
- /api/analytics/traffic-patterns - Get traffic distribution by hour and day (UTC)
- /api/analytics/percentiles - Get per-endpoint p50/p95/p99 latency trends
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from ..database import get_async_db
from ..models import Signal, AggregateSnapshot
from ..router.token import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# Helper function for percentile calculation (from realtime_aggregates.py)
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


# Response Models
class TrafficPatternItem(BaseModel):
    hour: int
    day_of_week: int
    request_count: int
    avg_latency: float


class TrafficPatternsResponse(BaseModel):
    patterns: list[TrafficPatternItem]


class EndpointPercentile(BaseModel):
    endpoint: str
    p50: float
    p95: float
    p99: float


class PercentileDataPoint(BaseModel):
    timestamp: str
    service_name: str
    endpoints: list[EndpointPercentile]


class PercentilesResponse(BaseModel):
    data: list[PercentileDataPoint]
    source: str  # 'snapshots' or 'raw_signals'


@router.get("/traffic-patterns")
async def get_traffic_patterns(
    request: Request,
    days: int = 7,
    db: AsyncSession = Depends(get_async_db)
) -> TrafficPatternsResponse:
    """
    Get traffic distribution by hour of day and day of week (UTC)
    Returns a grid of data for heatmap visualization
    
    Filtered by authenticated user.
    
    Args:
        days: Number of days to analyze (default: 7)
    """
    try:
        # Get authenticated user
        current_user = await get_current_user(request, db)
        
        # Calculate the cutoff date in UTC
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # Query raw signals and calculate hour/day in Python (not SQL) for correct timezone
        query = select(Signal.timestamp, Signal.latency_ms).where(
            and_(
                Signal.user_id == current_user.id,
                Signal.timestamp >= cutoff_date
            )
        )
        
        result = await db.execute(query)
        signals = result.all()
        
        # Group by hour and day of week in Python
        from collections import defaultdict
        pattern_data = defaultdict(lambda: {'count': 0, 'latency_sum': 0})
        
        for signal in signals:
            # signal.timestamp is UTC - keep it, frontend will convert
            hour = signal.timestamp.hour
            day_of_week = signal.timestamp.weekday()  # Monday=0, Sunday=6
            
            key = (hour, day_of_week)
            pattern_data[key]['count'] += 1
            pattern_data[key]['latency_sum'] += signal.latency_ms
        
        # Convert to response format
        patterns = [
            TrafficPatternItem(
                hour=hour,
                day_of_week=day,
                request_count=data['count'],
                avg_latency=data['latency_sum'] / data['count'] if data['count'] > 0 else 0
            )
            for (hour, day), data in pattern_data.items()
        ]
        
        return TrafficPatternsResponse(patterns=patterns)
        
    except Exception as e:
        print(f"Error fetching traffic patterns: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/percentiles")
async def get_percentiles(
    request: Request,
    days: int = 7,
    service_name: Optional[str] = None,
    db: AsyncSession = Depends(get_async_db)
) -> PercentilesResponse:
    """
    Get p50/p95/p99 latency percentiles PER ENDPOINT with 2-TIER FALLBACK.
    
    Fallback Strategy (in order):
    1. AggregateSnapshot - Redis snapshots with percentiles (fast, updated every 30min)
    2. Raw Signals - Calculate from raw data using proper percentile function
    
    Returns separate percentiles for each endpoint, not mixed!
    
    Filtered by authenticated user.
    
    Args:
        days: Number of days to analyze (default: 7)
        service_name: Optional service name to filter by
    """
    try:
        # Get authenticated user
        current_user = await get_current_user(request, db)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        # ==================================================================
        # TIER 1: Try Redis snapshots (fast, has percentiles)
        # ==================================================================
        snapshot_query = select(
            AggregateSnapshot.snapshot_at,
            AggregateSnapshot.service_name,
            AggregateSnapshot.endpoint,
            AggregateSnapshot.p50,
            AggregateSnapshot.p95,
            AggregateSnapshot.p99,
            AggregateSnapshot.window
        ).where(
            and_(
                AggregateSnapshot.user_id == current_user.id,
                AggregateSnapshot.snapshot_at >= cutoff_date,
                AggregateSnapshot.window == '24h'  # Use 1h window for hourly granularity
            )
        )
        
        if service_name:
            snapshot_query = snapshot_query.where(AggregateSnapshot.service_name == service_name)
        
        snapshot_query = snapshot_query.order_by(
            AggregateSnapshot.snapshot_at,
            AggregateSnapshot.service_name,
            AggregateSnapshot.endpoint
        )
        
        result = await db.execute(snapshot_query)
        snapshot_rows = result.all()
        
        if snapshot_rows and len(snapshot_rows) > 0:
            from collections import defaultdict
            
            # Group by (hour_bucket, service_name) -> List of endpoints
            time_service_endpoints = defaultdict(lambda: defaultdict(lambda: {
                'p50': 0, 'p95': 0, 'p99': 0
            }))
            
            for row in snapshot_rows:
                # Round to nearest hour for grouping
                hour_bucket = row.snapshot_at.replace(minute=0, second=0, microsecond=0)
                key = (hour_bucket, row.service_name)
                
                # Store per-endpoint data (not mixed!)
                time_service_endpoints[key][row.endpoint] = {
                    'p50': row.p50 or 0,
                    'p95': row.p95 or 0,
                    'p99': row.p99 or 0
                }
            
            # Convert to response format
            data = []
            for (hour_bucket, svc_name), endpoints_data in sorted(time_service_endpoints.items()):
                endpoint_list = [
                    EndpointPercentile(
                        endpoint=endpoint,
                        p50=float(metrics['p50']),
                        p95=float(metrics['p95']),
                        p99=float(metrics['p99'])
                    )
                    for endpoint, metrics in sorted(endpoints_data.items())
                ]
                
                data.append(PercentileDataPoint(
                    timestamp=hour_bucket.isoformat(),
                    service_name=svc_name,
                    endpoints=endpoint_list
                ))
            
            print(f"✅ Using Redis snapshots for percentiles ({len(data)} data points)")
            return PercentilesResponse(data=data, source='snapshots')
        
        # ==================================================================
        # TIER 2: Calculate from raw signals (proper percentile calculation)
        # ==================================================================
        print(f"⚠️  No snapshots found, calculating from raw signals...")
        
        base_query = select(
            Signal.timestamp,
            Signal.service_name,
            Signal.endpoint,
            Signal.latency_ms
        ).where(
            and_(
                Signal.user_id == current_user.id,
                Signal.timestamp >= cutoff_date
            )
        )
        
        if service_name:
            base_query = base_query.where(Signal.service_name == service_name)
        
        base_query = base_query.order_by(Signal.timestamp)
        
        result = await db.execute(base_query)
        signals = result.all()
        
        if not signals or len(signals) == 0:
            return PercentilesResponse(data=[], source='raw_signals')
        
        # Group signals by (hour, service, endpoint)
        from collections import defaultdict
        hourly_endpoint_latencies = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
        
        for signal in signals:
            hour_bucket = signal.timestamp.replace(minute=0, second=0, microsecond=0)
            hourly_endpoint_latencies[hour_bucket][signal.service_name][signal.endpoint].append(signal.latency_ms)
        
        # Calculate percentiles for each endpoint using proper percentile function
        data = []
        for hour_bucket in sorted(hourly_endpoint_latencies.keys()):
            for svc_name in sorted(hourly_endpoint_latencies[hour_bucket].keys()):
                endpoint_list = []
                
                for endpoint, latencies in sorted(hourly_endpoint_latencies[hour_bucket][svc_name].items()):
                    if len(latencies) > 0:
                        sorted_latencies = sorted(latencies)
                        
                        # Use proper percentile calculation (from realtime_aggregates.py)
                        endpoint_list.append(EndpointPercentile(
                            endpoint=endpoint,
                            p50=float(_percentile(sorted_latencies, 50)),
                            p95=float(_percentile(sorted_latencies, 95)),
                            p99=float(_percentile(sorted_latencies, 99))
                        ))
                
                if endpoint_list:
                    data.append(PercentileDataPoint(
                        timestamp=hour_bucket.isoformat(),
                        service_name=svc_name,
                        endpoints=endpoint_list
                    ))
        
        print(f"✅ Calculated percentiles from raw signals ({len(data)} data points)")
        return PercentilesResponse(data=data, source='raw_signals')
        
    except Exception as e:
        print(f"Error fetching percentiles: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


