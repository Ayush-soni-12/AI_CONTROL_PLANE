from fastapi import APIRouter, Depends, Response, status, HTTPException, Request
from sqlalchemy.orm import Session
from .. import models, Schema
from ..database import get_db
from ..dependencies import verify_api_key
from ..functions.decisionFunction import make_decision
from ..ai_engine.ai_engine import make_ai_decision
from ..router.token import get_current_user


router = APIRouter(
    prefix="/api",
    tags=['Signals']
)




@router.post("/signals")
async def receive_signal(
    signals: Schema.SignalSend, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(verify_api_key)
):
    """
    Receive performance signals from services.
    
    Requires API key authentication via Authorization header.
    The signal will be associated with the user who owns the API key.
    """
    
    print(f"Signals received: {signals}")
    print(f"User: {current_user.email} (ID: {current_user.id})")

    # Create signal with user_id
    signal_data = signals.model_dump()
    signal_data['user_id'] = current_user.id
    
    signal = models.Signal(**signal_data)
    db.add(signal)
    db.commit()
    db.refresh(signal)
    
    return Response(status_code=status.HTTP_201_CREATED)



@router.get("/signals", response_model=Schema.SignalsResponse)
async def get_all_signals(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get all signals for the currently authenticated user.
    
    Requires authentication via cookie (from dashboard login).
    Returns only signals that belong to the logged-in user.
    """

    
    # Get the current authenticated user from cookie
    current_user = get_current_user(request, db)
    
    # Query signals filtered by user_id
    signals = db.query(models.Signal).filter(
        models.Signal.user_id == current_user.id
    ).order_by(models.Signal.timestamp.desc()).all()

    if not signals:
        # Return empty list instead of 404 for better UX
        return {"signals": []}

    print(f"Fetched {len(signals)} signals for user: {current_user.email} (ID: {current_user.id})")

    return {"signals": signals}
@router.get("/config/{service_name}/{endpoint:path}")
async def get_config(service_name: str, endpoint: str, tenant_id: str = None, db: Session = Depends(get_db)):
    """
    Services request their runtime configuration
    
    Example: GET /api/config/demo-service/login?tenant_id=tenant123
    
    Returns the decision (cache enabled or not)
    """
    
    # Make sure endpoint starts with /
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint
    
    # Get decision with tenant_id
    decision = make_decision(service_name, endpoint, tenant_id, db)
    
    # Return config
    return {
        'service_name': service_name,
        'endpoint': endpoint,
        'tenant_id': tenant_id,
        'cache_enabled': decision['cache_enabled'],
        'circuit_breaker': decision['circuit_breaker'],
        'reason': decision['reason']
    }

# This is the fixed version - copy the get_services function to signals.py

@router.get("/services", response_model=Schema.ServicesResponse)
async def get_services(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Get aggregated service metrics with all calculations done on backend.
    
    Uses only the last 20 signals per endpoint for recent performance metrics.
    """
    
    # Get the current authenticated user from cookie
    current_user = get_current_user(request, db)
    
    # Query signals filtered by user_id
    signals = db.query(models.Signal).filter(
        models.Signal.user_id == current_user.id
    ).order_by(models.Signal.timestamp.desc()).all()

    if not signals:
        return {"services": [], "overall": {"total_signals": 0, "avg_latency": 0, "error_rate": 0, "active_services": 0}}

    # Group signals by service and endpoint
    from collections import defaultdict
    service_map = defaultdict(lambda: {
        'endpoints': defaultdict(list),
        'all_signals': []
    })
    
    for signal in signals:
        service_map[signal.service_name]['all_signals'].append(signal)
        service_map[signal.service_name]['endpoints'][signal.endpoint].append(signal)
    
    # Build service metrics
    services = []
    
    for service_name, data in service_map.items():
        # Build endpoint metrics (using last 20 signals per endpoint)
        endpoints = []
        service_total_signals = 0  # Actual total count from all signals
        service_weighted_latency = 0  # Weighted by recent signals
        service_weighted_errors = 0  # Weighted by recent signals
        total_recent_signals_for_service = 0  # Sum of recent counts for weighting
        
        for endpoint_path, endpoint_signals in data['endpoints'].items():
            # Get actual total count for this endpoint (all signals)
            actual_endpoint_count = len(endpoint_signals)
            
            # Use only the last 20 signals for metrics calculation (most recent data)
            recent_signals = sorted(endpoint_signals, key=lambda s: s.timestamp, reverse=True)[:20]
            
            if not recent_signals:
                continue
            
            # Calculate metrics from recent signals only
            recent_count = len(recent_signals)
            endpoint_avg_latency = sum(s.latency_ms for s in recent_signals) / recent_count
            endpoint_error_count = sum(1 for s in recent_signals if s.status == 'error')
            endpoint_error_rate = endpoint_error_count / recent_count
            
            # Get most recent signal's tenant_id
            most_recent = recent_signals[0]  # Already sorted by timestamp desc
            tenant_id = most_recent.tenant_id
            
            # Get AI decision directly using already calculated metrics (no redundant DB queries!)
            endpoint_normalized = endpoint_path if endpoint_path.startswith('/') else '/' + endpoint_path
            ai_decision = make_ai_decision(service_name, endpoint_normalized, endpoint_avg_latency, endpoint_error_rate)
            
            endpoints.append(Schema.EndpointMetrics(
                path=endpoint_path,
                avg_latency=endpoint_avg_latency,
                error_rate=endpoint_error_rate,
                signal_count=actual_endpoint_count,  # Show actual total count
                tenant_id=tenant_id,
                cache_enabled=ai_decision['cache_enabled'],
                circuit_breaker=ai_decision['circuit_breaker'],
                reasoning=ai_decision['reasoning']  # Pass AI reasoning to frontend
            ))
            
            # Accumulate for service-level metrics
            # Use actual count for total, but weight metrics by recent count for accuracy
            service_total_signals += actual_endpoint_count
            # service_weighted_latency += endpoint_avg_latency * recent_count
            # service_weighted_errors += endpoint_error_rate * recent_count
            # total_recent_signals_for_service += recent_count  # Track sum of recent counts
        
        if not endpoints:
            continue
            
        # Calculate SERVICE-level metrics from ALL signals (not just last 20)
        all_signals = data['all_signals']
        avg_latency = sum(s.latency_ms for s in all_signals) / len(all_signals) if all_signals else 0
        error_count = sum(1 for s in all_signals if s.status == 'error')
        error_rate = error_count / len(all_signals) if all_signals else 0
        print(f"Average_latency {avg_latency}, error_rate {error_rate}, total_signals {len(all_signals)}")
        
        # Get last signal timestamp
        last_signal = max(all_signals, key=lambda s: s.timestamp).timestamp if all_signals else None
        
        # Determine service status based on aggregated metrics
        if error_rate > 0.3:
            status = 'down'
        elif avg_latency > 500 or error_rate > 0.1:
            status = 'degraded'
        else:
            status = 'healthy'
            
        services.append(Schema.ServiceMetrics(
            name=service_name,
            endpoints=endpoints,
            total_signals=service_total_signals,
            avg_latency=avg_latency,
            error_rate=error_rate,
            last_signal=last_signal,
            status=status
        ))
    
    # Calculate overall metrics across all services
    if services:
        overall_total_signals = sum(s.total_signals for s in services)
        overall_avg_latency = sum(s.avg_latency * s.total_signals for s in services) / overall_total_signals if overall_total_signals > 0 else 0
        overall_error_rate = sum(s.error_rate * s.total_signals for s in services) / overall_total_signals if overall_total_signals > 0 else 0
        overall_active_services = len(services)
    else:
        overall_total_signals = 0
        overall_avg_latency = 0
        overall_error_rate = 0
        overall_active_services = 0
    
    print(f"Calculated metrics for {len(services)} services for user: {current_user.email}")
    print(f"Using last 20 signals per endpoint for accurate recent performance")
    print("service_total_signals",service_total_signals)
    print("overall_total_signals",overall_total_signals)
    
    return {
        "services": services,
        "overall": {
            "total_signals": service_total_signals,
            "avg_latency": overall_avg_latency,
            "error_rate": overall_error_rate,
            "active_services": overall_active_services
        }
    }
