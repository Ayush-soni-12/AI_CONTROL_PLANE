from fastapi import APIRouter, Depends, Response, status, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .. import models, Schema
from ..database import get_async_db
from ..dependencies import verify_api_key
from ..functions.decisionFunction import make_decision
from ..ai_engine.ai_engine import make_ai_decision
from ..router.token import get_current_user
from collections import defaultdict
from fastapi import BackgroundTasks
from ..functions.mailer import send_alert_email
from ..cache import cache_get, cache_set, invalidate_user_cache
import time


router = APIRouter(
    prefix="/api",
    tags=['Signals']
)




@router.post("/signals")
async def receive_signal(
    signals: Schema.SignalSend, 
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(verify_api_key)
):
    """
    Receive performance signals from services.
    
    Requires API key authentication via Authorization header.
    The signal will be associated with the user who owns the API key.
    
    TWO-TIER APPROACH (Phase 3 Optimization):
    1. Update Redis real-time aggregates for ALL signals (100% - accurate metrics)
    2. Apply sampling for PostgreSQL storage (10% success, 100% errors - efficient storage)
    """
    
    print(f"Signals received: {signals}")
    print(f"User: {current_user.email} (ID: {current_user.id})")
    
    # Prepare signal data
    signal_data = signals.model_dump()
    signal_data['user_id'] = current_user.id
    
    # STEP 1: Update real-time aggregates for ALL signals (100%)
    # This ensures accurate metrics for caching decisions
    from app.realtime_aggregates import update_realtime_aggregate
    from app.config import settings
    import random
    
    await update_realtime_aggregate(
        user_id=current_user.id,
        service_name=signals.service_name,
        endpoint=signals.endpoint,
        latency_ms=signals.latency_ms,
        status=signals.status
    )
    print(f"✅ Updated real-time aggregates for {signals.service_name}{signals.endpoint}")
    
    # STEP 2: Apply sampling for database storage
    # Store 100% of errors (critical for debugging)
    # Store only SIGNAL_SAMPLING_RATE % of success (reduces storage)
    should_store = (signals.status == 'error') or (random.random() < settings.SIGNAL_SAMPLING_RATE)
    
    if should_store:
        signal = models.Signal(**signal_data)
        db.add(signal)
        await db.commit()
        await db.refresh(signal)
        print(f"💾 Stored signal in database (sampled)")
    else:
        print(f"⏭️  Signal aggregated but not stored (sampling)")
    
    # Invalidate cache for this user so they see fresh data
    await invalidate_user_cache(current_user.id)
    
    return Response(status_code=status.HTTP_201_CREATED)



@router.get("/signals", response_model=Schema.SignalsResponse)
async def get_all_signals(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all signals for the currently authenticated user.
    
    Requires authentication via cookie (from dashboard login).
    Returns only signals that belong to the logged-in user.
    
    PHASE 3: Returns sampled signals from database (10% of success signals)
    plus metadata showing total signals tracked in real-time aggregates.
    """
    
    # Get the current authenticated user from cookie
    current_user = await get_current_user(request, db)
    
    # Query sampled signals from database (limited to last 20) - async pattern
    stmt = select(models.Signal).filter(
        models.Signal.user_id == current_user.id
    ).order_by(models.Signal.timestamp.desc()).limit(20)
    result = await db.execute(stmt)
    signals = result.scalars().all()

    if not signals:
        # Return empty list with metadata
        return {
            "signals": [],
            "metadata": {
                "total_signals_tracked": 0,
                "signals_displayed": 0,
                "sampling_rate": 0.1,
                "note": "No signals yet. Start sending signals from your services!"
            }
        }

    print(f"Fetched {len(signals)} sampled signals for user: {current_user.email} (ID: {current_user.id})")

    return {"signals": signals}
@router.get("/config/{service_name}/{endpoint:path}")
async def get_config(
    service_name: str, 
    endpoint: str, 
    background_tasks: BackgroundTasks,
    tenant_id: str = None, 
    db: AsyncSession = Depends(get_async_db), 
    current_user: models.User = Depends(verify_api_key)
):
    """
    Services request their runtime configuration
    
    Example: GET /api/config/demo-service/login?tenant_id=tenant123
    
    Returns the decision (cache enabled or not)
    """
    
    
    # Make sure endpoint starts with /
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint
    
    # Get decision with tenant_id and user_id (for real-time aggregates)
    decision = await make_decision(service_name, endpoint, tenant_id, db, user_id=current_user.id)


    if decision.get("send_alert"):
        background_tasks.add_task(
            send_alert_email,
            to_email=current_user.email,  # Use current user's email
            subject=f"🚨 Alert: {service_name}",
            context={
                "service_name": service_name,
                "endpoint": endpoint,
                "avg_latency": decision["metrics"]["avg_latency"],
                "error_rate": decision["metrics"]["error_rate"] * 100,
                "ai_decision": decision["ai_decision"],
            }
        )


    
    
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
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get aggregated service metrics using HYBRID APPROACH (Phase 3 Optimization).
    
    APPROACH:
    1. Get list of unique service/endpoint combinations from database (fast DISTINCT)
    2. Get METRICS from Redis real-time aggregates (24h window - 100% accurate)
    3. Fallback to database calculations if no Redis data exists
    
    This ensures accurate metrics based on ALL signals while being efficient.
    Cached for 30 seconds to reduce load on high-traffic dashboards.
    """
    # Get the current authenticated user from cookie
    current_user = await get_current_user(request, db)
    
    # Try cache first (30 second TTL for near-real-time data)
    cache_key = f"user:{current_user.id}:services"
    cached_data = await cache_get(cache_key)
    
    if cached_data is not None:
        print(f"✅ Cache HIT for user {current_user.id} on /services")
        return cached_data
    
    print(f"⚠️  Cache MISS for user {current_user.id} on /services - building from Redis aggregates")
    
    from app.realtime_aggregates import get_realtime_metrics
    
    # STEP 1: Get unique service/endpoint combinations from database (async pattern)
    stmt = select(
        models.Signal.service_name,
        models.Signal.endpoint
    ).filter(
        models.Signal.user_id == current_user.id
    ).distinct()
    result = await db.execute(stmt)
    distinct_endpoints = result.all()
    
    if not distinct_endpoints:
        return {
            "services": [],
            "overall": {
                "total_signals": 0,
                "avg_latency": 0,
                "error_rate": 0,
                "active_services": 0
            }
        }
    
    print(f"📊 Found {len(distinct_endpoints)} unique endpoints for user {current_user.id}")
    
    # STEP 2: Build service metrics using Redis aggregates
    service_map = defaultdict(lambda: {
        'endpoints': [],
        'total_signals': 0,
        'total_latency': 0,
        'total_errors': 0
    })
    
    for service_name, endpoint in distinct_endpoints:
        # Get metrics from Redis 24h aggregates (ALL signals - 100% accurate)
        # Falls back to PostgreSQL snapshots if Redis is unavailable
        metrics = await get_realtime_metrics(
            user_id=current_user.id,
            service_name=service_name,
            endpoint=endpoint,
            window='24h',
            db=db
        )
        
        if metrics and metrics['count'] >= 1:
            # Use accurate metrics from Redis
            avg_latency = metrics['avg_latency']
            error_rate = metrics['error_rate']
            signal_count = metrics['count']
            
            print(f"✅ Redis metrics for {service_name}{endpoint}: "
                  f"{signal_count} signals, {avg_latency:.1f}ms avg, {error_rate*100:.1f}% errors")
        else:
            # Fallback: Get metrics from database (sampled data)
            print(f"⚠️  No Redis data for {service_name}{endpoint}, falling back to database")
            
            # Async pattern for fallback query
            stmt = select(models.Signal).filter(
                models.Signal.user_id == current_user.id,
                models.Signal.service_name == service_name,
                models.Signal.endpoint == endpoint
            ).order_by(models.Signal.timestamp.desc()).limit(20)
            result = await db.execute(stmt)
            signals = result.scalars().all()
            
            if not signals:
                continue
                
            signal_count = len(signals)
            avg_latency = sum(s.latency_ms for s in signals) / signal_count
            error_count = sum(1 for s in signals if s.status == 'error')
            error_rate = error_count / signal_count
        
        # Get most recent signal for tenant_id (async pattern)
        stmt = select(models.Signal).filter(
            models.Signal.user_id == current_user.id,
            models.Signal.service_name == service_name,
            models.Signal.endpoint == endpoint
        ).order_by(models.Signal.timestamp.desc())
        result = await db.execute(stmt)
        recent_signal = result.scalars().first()
        
        tenant_id = recent_signal.tenant_id if recent_signal else None
        
        # Get AI decision using accurate metrics
        endpoint_normalized = endpoint if endpoint.startswith('/') else '/' + endpoint
        ai_decision = make_ai_decision(service_name, endpoint_normalized, avg_latency, error_rate)
        
        # Build endpoint metrics
        endpoint_metrics = Schema.EndpointMetrics(
            path=endpoint,
            avg_latency=avg_latency,
            error_rate=error_rate,
            signal_count=signal_count,
            tenant_id=tenant_id,
            cache_enabled=ai_decision['cache_enabled'],
            circuit_breaker=ai_decision['circuit_breaker'],
            reasoning=ai_decision['reasoning']
        )
        
        # Accumulate for service-level metrics
        service_map[service_name]['endpoints'].append(endpoint_metrics)
        service_map[service_name]['total_signals'] += signal_count
        service_map[service_name]['total_latency'] += avg_latency * signal_count
        service_map[service_name]['total_errors'] += error_rate * signal_count
    
    # STEP 3: Build service list with aggregated metrics
    services = []
    
    for service_name, data in service_map.items():
        if not data['endpoints']:
            continue
        
        # Calculate service-level metrics
        total_signals = data['total_signals']
        avg_latency = data['total_latency'] / total_signals if total_signals > 0 else 0
        error_rate = data['total_errors'] / total_signals if total_signals > 0 else 0
        
        # Get last signal timestamp for this service (async pattern)
        stmt = select(models.Signal).filter(
            models.Signal.user_id == current_user.id,
            models.Signal.service_name == service_name
        ).order_by(models.Signal.timestamp.desc())
        result = await db.execute(stmt)
        last_signal_record = result.scalars().first()
        
        last_signal = last_signal_record.timestamp if last_signal_record else None
        
        # Determine service status
        if error_rate > 0.3:
            status = 'down'
        elif error_rate > 0.15 or avg_latency > 500:
            status = 'degraded'
        else:
            status = 'healthy'
        
        services.append(Schema.ServiceMetrics(
            name=service_name,
            endpoints=data['endpoints'],
            total_signals=total_signals,
            avg_latency=avg_latency,
            error_rate=error_rate,
            last_signal=last_signal,
            status=status
        ))
    
    # Calculate overall metrics
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
    
    print(f"✅ Built metrics for {len(services)} services using Redis aggregates")
    print(f"   Total signals (accurate): {overall_total_signals}")
    
    # Prepare result
    result = {
        "services": services,
        "overall": {
            "total_signals": overall_total_signals,
            "avg_latency": overall_avg_latency,
            "error_rate": overall_error_rate,
            "active_services": overall_active_services
        }
    }
    
    # Convert to dict for caching
    cacheable_result = {
        "services": [service.model_dump() for service in services],
        "overall": result["overall"]
    }
    
    # Cache for 30 seconds
    await cache_set(cache_key, cacheable_result, ttl=30)
    print(f"💾 Cached /services data for user {current_user.id}")
    
    return result


@router.get("/services/{service_name}/endpoints/{endpoint_path:path}", response_model=Schema.EndpointDetailResponse)
async def get_endpoint_detail(
    service_name: str,
    endpoint_path: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get detailed metrics for a specific endpoint using HYBRID APPROACH (Phase 3).
    
    APPROACH:
    1. Get accurate METRICS from Redis 24h aggregates (total signals, avg latency, error rate)
    2. Get HISTORY (graph data) from database (last 20 sampled signals)
    3. Fallback to database for metrics if no Redis data exists
    
    This ensures endpoint details show accurate overall metrics while graphs show sampled trends.
    """
    # Normalize endpoint path
    if not endpoint_path.startswith('/'):
        endpoint_path = '/' + endpoint_path
        
    current_user = await get_current_user(request, db)
    
    from app.realtime_aggregates import get_realtime_metrics
    
    # STEP 1: Get accurate metrics from Redis 24h aggregates
    # Falls back to PostgreSQL snapshots if Redis is unavailable
    metrics = await get_realtime_metrics(
        user_id=current_user.id,
        service_name=service_name,
        endpoint=endpoint_path,
        window='24h',
        db=db
    )
    
    if metrics and metrics['count'] >= 1:
        # Use accurate metrics from Redis (ALL signals)
        total_signals = metrics['count']
        avg_latency = metrics['avg_latency']
        error_rate = metrics['error_rate']
        
        print(f"✅ Using Redis metrics for {service_name}{endpoint_path}: "
              f"{total_signals} signals, {avg_latency:.1f}ms avg, {error_rate*100:.1f}% errors")
    else:
        # Fallback: Calculate from database (sampled data)
        print(f"⚠️  No Redis data for {service_name}{endpoint_path}, falling back to database")
        
        # Async pattern for fallback
        stmt = select(models.Signal).filter(
            models.Signal.user_id == current_user.id,
            models.Signal.service_name == service_name,
            models.Signal.endpoint == endpoint_path
        ).order_by(models.Signal.timestamp.desc())
        result = await db.execute(stmt)
        signals = result.scalars().all()
        
        if not signals:
            raise HTTPException(status_code=404, detail="Endpoint not found or no signals recorded")
        
        total_signals = len(signals)
        avg_latency = sum(s.latency_ms for s in signals) / total_signals
        error_count = sum(1 for s in signals if s.status == 'error')
        error_rate = error_count / total_signals
    
    # STEP 2: Get history for graph (last 20 signals from database - sampled is fine for trends)
    stmt = select(models.Signal).filter(
        models.Signal.user_id == current_user.id,
        models.Signal.service_name == service_name,
        models.Signal.endpoint == endpoint_path
    ).order_by(models.Signal.timestamp.desc()).limit(20)
    result = await db.execute(stmt)
    history_signals = result.scalars().all()
    
    history = []
    for s in history_signals:
        history.append({
            "timestamp": s.timestamp.isoformat(),
            "latency_ms": s.latency_ms,
            "status": s.status
        })
    
    # STEP 3: Get AI decision using accurate metrics
    ai_decision = make_ai_decision(service_name, endpoint_path, avg_latency, error_rate)
    
    # Generate suggestions based on metrics
    suggestions = []
    if error_rate > 0.3:
        suggestions.append("⚠️ High error rate detected. Consider implementing retry logic or circuit breakers.")
    if avg_latency > 500:
        suggestions.append("🐌 High latency detected. Consider caching frequently accessed data.")
    if error_rate > 0.15 and avg_latency > 300:
        suggestions.append("💡 Both latency and errors are elevated. Review service dependencies and database queries.")
    
    if ai_decision['cache_enabled']:
        suggestions.append("✅ Caching is recommended and enabled for this endpoint.")
    
    if ai_decision.get('circuit_breaker'):
        suggestions.append("🔴 Circuit breaker is active due to high error rate. Service is in degraded mode.")
    
    if not suggestions:
        suggestions.append("✨ Endpoint is performing well! No immediate optimizations needed.")
    
    print(f"📊 Endpoint detail for {service_name}{endpoint_path}: "
          f"Total: {total_signals}, Avg: {avg_latency:.1f}ms, Errors: {error_rate*100:.1f}%")
    
    return Schema.EndpointDetailResponse(
        service_name=service_name,
        endpoint=endpoint_path,
        avg_latency=avg_latency,
        error_rate=error_rate,
        total_signals=total_signals,
        history=history,
        suggestions=suggestions,
        cache_enabled=ai_decision['cache_enabled'],
        circuit_breaker=ai_decision.get('circuit_breaker', False),
        reasoning=ai_decision['reasoning']
    )
