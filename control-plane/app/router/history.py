"""
Historical data API endpoints
Serves aggregated data for time ranges beyond 7 days
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from app import models, Schema
from app.database import get_db
from app.router.auth import get_current_user
from fastapi import Request

router = APIRouter(prefix="/api/history", tags=["history"])


def determine_data_source(start_date: datetime, end_date: datetime) -> str:
    """
    Determine which data source to use based on date range
    
    Returns: "raw", "hourly", or "daily"
    """
    # Use timezone-aware datetime to match query parameters
    now = datetime.now(timezone.utc)
    days_ago = (now - start_date).days
    
    if days_ago <= 7:
        return "raw"
    elif days_ago <= 90:
        return "hourly"
    else:
        return "daily"


@router.get("/services", response_model=Schema.HistoricalServicesResponse)
async def get_historical_services(
    request: Request,
    start_date: datetime = Query(..., description="Start date (ISO format)"),
    end_date: datetime = Query(..., description="End date (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Get service metrics for a historical time range
    
    Data source selection:
    - Last 7 days: Raw signals (most granular)
    - 7-90 days: Hourly aggregates
    - 90+ days: Daily aggregates
    """
    current_user = get_current_user(request, db)
    
    # Determine data source
    print(f"Start date",start_date ,"End date", end_date)
    data_source = determine_data_source(start_date, end_date)
    
    print(f"📊 Historical data request: {start_date} to {end_date}")
    print(f"   Data source: {data_source}")
    
    services = []
    total_records = 0
    
    if data_source == "raw":
        # Use raw signals
        services, total_records = _get_services_from_raw(db, current_user.id, start_date, end_date)
    elif data_source == "hourly":
        # Use hourly aggregates
        services, total_records = _get_services_from_hourly(db, current_user.id, start_date, end_date)
    else:
        # Use daily aggregates
        services, total_records = _get_services_from_daily(db, current_user.id, start_date, end_date)
    
    # Calculate overall metrics
    if services:
        total_requests = sum(s.total_signals for s in services)
        weighted_latency = sum(s.avg_latency * s.total_signals for s in services) / total_requests if total_requests > 0 else 0
        total_errors = sum(s.error_rate * s.total_signals / 100 for s in services)
        
        overall = {
            "total_signals": total_requests,
            "avg_latency": round(weighted_latency, 2),
            "error_rate": round((total_errors / total_requests) * 100, 2) if total_requests > 0 else 0,
            "active_services": len(services)
        }
    else:
        overall = {
            "total_signals": 0,
            "avg_latency": 0,
            "error_rate": 0,
            "active_services": 0
        }
    
    metadata = {
        "data_source": data_source,
        "time_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": (end_date - start_date).days
        },
        "total_records": total_records
    }
    
    return {
        "services": services,
        "overall": overall,
        "metadata": metadata
    }


def _get_services_from_raw(db: Session, user_id: int, start_date: datetime, end_date: datetime):
    """Get services from raw signals"""
    signals = db.query(models.Signal).filter(
        and_(
            models.Signal.user_id == user_id,
            models.Signal.timestamp >= start_date,
            models.Signal.timestamp < end_date
        )
    ).all()
    
    # Group by service
    service_data = {}
    for signal in signals:
        key = signal.service_name
        if key not in service_data:
            service_data[key] = {
                'signals': [],
                'endpoints': {}
            }
        
        service_data[key]['signals'].append(signal)
        
        # Group by endpoint
        ep_key = signal.endpoint
        if ep_key not in service_data[key]['endpoints']:
            service_data[key]['endpoints'][ep_key] = []
        service_data[key]['endpoints'][ep_key].append(signal)
    
    # Build service metrics
    services = []
    for service_name, data in service_data.items():
        all_signals = data['signals']
        latencies = [s.latency_ms for s in all_signals]
        errors = [s for s in all_signals if s.status.startswith(('4', '5'))]
        
        endpoints = []
        for ep_name, ep_signals in data['endpoints'].items():
            ep_latencies = [s.latency_ms for s in ep_signals]
            ep_errors = [s for s in ep_signals if s.status.startswith(('4', '5'))]
            
            endpoints.append({
                'path': ep_name,
                'avg_latency': sum(ep_latencies) / len(ep_latencies) if ep_latencies else 0,
                'error_rate': (len(ep_errors) / len(ep_signals)) * 100 if ep_signals else 0,
                'signal_count': len(ep_signals),
                'tenant_id': ep_signals[0].tenant_id if ep_signals else None,
                'cache_enabled': False,
                'circuit_breaker': False,
                'reasoning': f'Historical data ({len(ep_signals)} signals)'
            })
        
        services.append(Schema.ServiceMetrics(
            name=service_name,
            endpoints=endpoints,
            total_signals=len(all_signals),
            avg_latency=sum(latencies) / len(latencies) if latencies else 0,
            error_rate=(len(errors) / len(all_signals)) * 100 if all_signals else 0,
            last_signal=max(s.timestamp for s in all_signals),
            status='healthy' if (len(errors) / len(all_signals)) < 0.05 else 'degraded'
        ))
    
    return services, len(signals)


def _get_services_from_hourly(db: Session, user_id: int, start_date: datetime, end_date: datetime):
    """Get services from hourly aggregates"""
    aggregates = db.query(models.SignalAggregateHourly).filter(
        and_(
            models.SignalAggregateHourly.user_id == user_id,
            models.SignalAggregateHourly.hour_bucket >= start_date,
            models.SignalAggregateHourly.hour_bucket < end_date
        )
    ).all()
    
    return _build_services_from_aggregates(aggregates, 'hourly')


def _get_services_from_daily(db: Session, user_id: int, start_date: datetime, end_date: datetime):
    """Get services from daily aggregates"""
    aggregates = db.query(models.SignalAggregateDaily).filter(
        and_(
            models.SignalAggregateDaily.user_id == user_id,
            models.SignalAggregateDaily.day_bucket >= start_date,
            models.SignalAggregateDaily.day_bucket < end_date
        )
    ).all()
    
    return _build_services_from_aggregates(aggregates, 'daily')


def _build_services_from_aggregates(aggregates, granularity):
    """Build service metrics from aggregates (hourly or daily)"""
    service_data = {}
    
    for agg in aggregates:
        key = agg.service_name
        if key not in service_data:
            service_data[key] = {
                'aggregates': [],
                'endpoints': {}
            }
        
        service_data[key]['aggregates'].append(agg)
        
        # Group by endpoint
        ep_key = agg.endpoint
        if ep_key not in service_data[key]['endpoints']:
            service_data[key]['endpoints'][ep_key] = []
        service_data[key]['endpoints'][ep_key].append(agg)
    
    # Build service metrics
    services = []
    for service_name, data in service_data.items():
        all_aggs = data['aggregates']
        
        # Weighted average for service
        total_requests = sum(a.total_requests for a in all_aggs)
        weighted_latency = sum(a.avg_latency_ms * a.total_requests for a in all_aggs) / total_requests if total_requests > 0 else 0
        total_errors = sum(a.error_count for a in all_aggs)
        
        endpoints = []
        for ep_name, ep_aggs in data['endpoints'].items():
            ep_total = sum(a.total_requests for a in ep_aggs)
            ep_weighted_latency = sum(a.avg_latency_ms * a.total_requests for a in ep_aggs) / ep_total if ep_total > 0 else 0
            ep_errors = sum(a.error_count for a in ep_aggs)
            
            endpoints.append({
                'path': ep_name,
                'avg_latency': ep_weighted_latency,
                'error_rate': (ep_errors / ep_total) if ep_total > 0 else 0,
                'signal_count': ep_total,
                'tenant_id': ep_aggs[0].tenant_id if ep_aggs else None,
                'cache_enabled': False,
                'circuit_breaker': False,
                'reasoning': f'Aggregated {granularity} data ({len(ep_aggs)} {granularity} buckets)'
            })
        
        # Get latest bucket for last_signal
        latest_bucket = max(a.hour_bucket if hasattr(a, 'hour_bucket') else a.day_bucket for a in all_aggs)
        
        services.append(Schema.ServiceMetrics(
            name=service_name,
            endpoints=endpoints,
            total_signals=total_requests,
            avg_latency=weighted_latency,
            error_rate=(total_errors / total_requests) if total_requests > 0 else 0,
            last_signal=latest_bucket,
            status='healthy' if (total_errors / total_requests) < 0.05 else 'degraded'
        ))
    
    return services, len(aggregates)
