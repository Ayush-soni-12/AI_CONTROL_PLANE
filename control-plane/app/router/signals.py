from fastapi import APIRouter, Depends, Response, status, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import models, Schema
from app.database.database import get_async_db
from app.dependencies import verify_api_key
from app.functions.decisionFunction import make_decision
from app.ai_engine.ai_engine import make_ai_decision
from app.router.token import get_current_user
from collections import defaultdict
from app.queue.email_publisher import publish_email
from app.redis.cache import cache_get, cache_set, invalidate_user_cache
from app.queue.publisher import publish_signal
import time
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone


router = APIRouter(
    prefix="/api",
    tags=['Signals']
)




@router.post("/signals", status_code=202)
async def receive_signal(
    signals: Schema.SignalSend,
    current_user: models.User = Depends(verify_api_key)
):
    """
    Receive performance signals from services.

    Requires API key authentication via Authorization header.

    RABBITMQ APPROACH:
    - Validates the API key and immediately publishes the signal to RabbitMQ.
    - Returns 202 Accepted instantly (~1-2ms) — no DB/Redis wait.
    - The background consumer (consumer.py) picks up the message and:
        1. Updates Redis real-time aggregates
        2. Stores signal in PostgreSQL (with sampling)
        3. Invalidates user cache
    - If the consumer is temporarily down, messages are safely buffered
      in RabbitMQ (persisted to disk) and processed when it recovers.
    """

    print(f"📥 Signal received: {signals.service_name}{signals.endpoint} | user={current_user.email}")

    # Build the signal payload (include user_id so the consumer knows which user)
    signal_data = signals.model_dump()
    signal_data['user_id'] = current_user.id

    # Publish to RabbitMQ — instant, non-blocking
    # Raises 503 only if RabbitMQ itself is unreachable (very rare)
    try:
        await publish_signal(signal_data)
    except Exception as exc:
        print(f"❌ Failed to publish signal to RabbitMQ: {exc}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Signal queue temporarily unavailable. Please retry shortly."
        )

    # Return 202 Accepted immediately — consumer handles storage
    return Response(status_code=status.HTTP_202_ACCEPTED)


class SignalItem(BaseModel):
    service_name: str
    endpoint: str
    latency_ms: float
    status: str
    tenant_id: str
    priority: Optional[str] = "medium"
    customer_identifier: Optional[str] = None
    action_taken: Optional[str] = "none"
    recorded_at: Optional[str] = None

class BatchSignalRequest(BaseModel):
    signals: List[SignalItem]

@router.post("/signals/batch", status_code=202)
async def receive_signal_batch(
    payload: BatchSignalRequest,
    current_user: models.User = Depends(verify_api_key)
):
    """
    Receive a batch of signals from the SDK.
    The SDK sends all queued signals every 5 seconds in one call
    instead of one HTTP call per request.
    """
    
    print(f"📥 Batch received: {len(payload.signals)} signals | user={current_user.email}")
    
    processed = 0
    errors = 0

    for signal in payload.signals:
        try:
            signal_data = signal.model_dump()
            signal_data['user_id'] = current_user.id
            
            # Map SDK 'recorded_at' to backend 'timestamp' ORM attribute
            if 'recorded_at' in signal_data:
                recorded_val = signal_data.pop('recorded_at')
                if recorded_val:
                    # Keep it as string, Pydantic/SQLAlchemy will parse it from ISO or consumer will handle
                    signal_data['timestamp'] = datetime.fromisoformat(recorded_val.replace('Z', '+00:00'))
            
            # Send each to RabbitMQ just like the single endpoint does
            await publish_signal(signal_data)
            processed += 1
        except Exception as e:
            print(f"❌ Failed to publish signal in batch: {e}")
            errors += 1
            
    if errors > 0 and processed == 0:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Signal queue temporarily unavailable."
        )

    return Response(status_code=status.HTTP_202_ACCEPTED)



@router.get("/config/{service_name}/{endpoint:path}")
async def get_config(
    service_name: str, 
    endpoint: str, 
    request: Request,  # For future use if needed
    tenant_id: str = None,
    priority: str = 'medium',  # Request priority
    customer_identifier: str = None,  # NEW: Customer IP from SDK (query param)
    db: AsyncSession = Depends(get_async_db), 
    current_user: models.User = Depends(verify_api_key)
):
    """
    Services request their runtime configuration with TWO-TIER TRAFFIC MANAGEMENT:
    
    TIER 1: Per-customer rate limiting (individual abuse prevention)
    - Returns 429 if customer exceeds 10 req/min
    
    TIER 2: Global capacity management (system protection)
    - Returns 503 if load shedding active (>120 req/min + low priority)
    - Returns 202 if queue deferral active (80-120 req/min + low/medium priority)
    
    Example: GET /api/config/demo-service/login?tenant_id=tenant123&priority=high&customer_identifier=192.168.1.100
    
    Headers required: Authorization: your-api-key
    """
    
    # Make sure endpoint starts with /
    if not endpoint.startswith('/'):
        endpoint = '/' + endpoint
    
    # customer_identifier is now passed as query parameter from SDK
    # This represents the END-USER's IP, not the service owner's IP
    
    # Get decision with ALL new parameters
    decision = await make_decision(
        service_name,
        endpoint,
        db,
        user_id=current_user.id,
        customer_identifier=customer_identifier,
        priority=priority
    )

    print(f"Decision: {decision}")

    # ===== EXISTING FEATURES: Alerts, Caching, Circuit Breaker =====
    
    # Send alert if needed — publish to RabbitMQ email queue for reliable delivery
    # Wrapped in try/except: a queue hiccup must never block the config response
    if decision.get("send_alert"):
        try:
            await publish_email(
                to_email=current_user.email,
                subject=f"🚨 Alert: {service_name}",
                context={
                    "service_name": service_name,
                    "endpoint": endpoint,
                    "avg_latency": decision["metrics"]["avg_latency"],
                    "error_rate": decision["metrics"]["error_rate"] * 100,
                    "ai_decision": decision["ai_decision"],
                },
            )
        except Exception as exc:
            print(f"⚠️  [signals] Failed to queue alert email: {exc} — continuing")
    
    
    # ===== TIER 1: PER-CUSTOMER RATE LIMITING =====
    if decision.get('rate_limit_customer'):
        print(f"🚫 Per-customer rate limit triggered for {customer_identifier}")
        
        # Calculate retry_after (seconds until next minute)
        import time
        retry_after = 60 - (int(time.time()) % 60)
        
        # Return 429 for this customer only
        return {
            'service_name': service_name,
            'endpoint': endpoint,
            'tenant_id': tenant_id,
            'customer_identifier': customer_identifier,
            'rate_limited_customer': True,  # NEW: Indicates per-customer block
            'rate_limit_rule_rpm': decision.get('rate_limit_rule_rpm'),
            'retry_after': retry_after,
            'status_code': 429,  # SDK should return 429
            'reason': f"Per-customer rate limit: {decision['reason']}"
        }
    
    # ===== TIER 2: GLOBAL CAPACITY MANAGEMENT =====
    
    # Load Shedding: Drop the request (503)
    if decision.get('load_shedding'):
        print(f"🗑️  Load shedding: Dropping {priority} priority request")
        
        import time
        retry_after = 30  # Suggest retry in 30 seconds
        
        return {
            'service_name': service_name,
            'endpoint': endpoint,
            'tenant_id': tenant_id,
            'load_shedding': True,  # NEW
            'rate_limit_rule_rpm': decision.get('rate_limit_rule_rpm'),
            'retry_after': retry_after,
            'status_code': 503,  # SDK should return 503
            'reason': decision['reason'],
            'priority_required': 'high'  # Hint for client
        }
    
    # Queue Deferral: Queue the request (202)
    if decision.get('queue_deferral'):
        print(f"⏳ Queue deferral: Queueing {priority} priority request")
        
        return {
            'service_name': service_name,
            'endpoint': endpoint,
            'tenant_id': tenant_id,
            'queue_deferral': True,  # NEW
            'rate_limit_rule_rpm': decision.get('rate_limit_rule_rpm'),
            'status_code': 202,  # SDK should return 202
            'reason': decision['reason'],
            'estimated_delay': 10  # Seconds (SDK can queue for later)
        }
    

    # Return normal config (all checks passed)
    return {
        'service_name': service_name,
        'endpoint': endpoint,
        'tenant_id': tenant_id,
        'cache_enabled': decision['cache_enabled'],
        'circuit_breaker': decision['circuit_breaker'],
        'rate_limited_customer': False,  # Passed per-customer check
        'rate_limit_rule_rpm': decision.get('rate_limit_rule_rpm'),
        'queue_deferral': False,  # Not queued
        'load_shedding': False,  # Not shed
        'status_code': 200,  # Normal request
        'reason': decision['reason']
    }






# @router.get("/signals", response_model=Schema.SignalsResponse)
# async def get_all_signals(
#     request: Request,
#     db: AsyncSession = Depends(get_async_db)
# ):
#     """
#     Get all signals for the currently authenticated user.
    
#     Requires authentication via cookie (from dashboard login).
#     Returns only signals that belong to the logged-in user.
    
#     PHASE 3: Returns sampled signals from database (10% of success signals)
#     plus metadata showing total signals tracked in real-time aggregates.
#     """
    
#     # Get the current authenticated user from cookie
#     current_user = await get_current_user(request, db)
    
#     # Query sampled signals from database (limited to last 20) - async pattern
#     stmt = select(models.Signal).filter(
#         models.Signal.user_id == current_user.id
#     ).order_by(models.Signal.timestamp.desc()).limit(20)
#     result = await db.execute(stmt)
#     signals = result.scalars().all()

#     if not signals:
#         # Return empty list with metadata
#         return {
#             "signals": [],
#             "metadata": {
#                 "total_signals_tracked": 0,
#                 "signals_displayed": 0,
#                 "sampling_rate": 0.1,
#                 "note": "No signals yet. Start sending signals from your services!"
#             }
#         }

#     print(f"Fetched {len(signals)} sampled signals for user: {current_user.email} (ID: {current_user.id})")

#     return {"signals": signals}

# This is the fixed version - copy the get_services function to signals.py

# @router.get("/services", response_model=Schema.ServicesResponse)
# async def get_services(
#     request: Request,
#     db: AsyncSession = Depends(get_async_db)
# ):
#     """
#     Get aggregated service metrics using HYBRID APPROACH (Phase 3 Optimization).
    
#     APPROACH:
#     1. Get list of unique service/endpoint combinations from database (fast DISTINCT)
#     2. Get METRICS from Redis real-time aggregates (24h window - 100% accurate)
#     3. Fallback to database calculations if no Redis data exists
    
#     This ensures accurate metrics based on ALL signals while being efficient.
#     Cached for 30 seconds to reduce load on high-traffic dashboards.
#     """
#     # Get the current authenticated user from cookie
#     current_user = await get_current_user(request, db)
    
#     # Try cache first (30 second TTL for near-real-time data)
#     cache_key = f"user:{current_user.id}:services"
#     cached_data = await cache_get(cache_key)
    
#     if cached_data is not None:
#         print(f"✅ Cache HIT for user {current_user.id} on /services")
#         return cached_data
    
#     print(f"⚠️  Cache MISS for user {current_user.id} on /services - building from Redis aggregates")
    
#     from app.realtime_aggregates import get_realtime_metrics
    
#     # STEP 1: Get unique service/endpoint combinations from database (async pattern)
#     stmt = select(
#         models.Signal.service_name,
#         models.Signal.endpoint
#     ).filter(
#         models.Signal.user_id == current_user.id
#     ).distinct()
#     result = await db.execute(stmt)
#     distinct_endpoints = result.all()
    
#     if not distinct_endpoints:
#         return {
#             "services": [],
#             "overall": {
#                 "total_signals": 0,
#                 "avg_latency": 0,
#                 "error_rate": 0,
#                 "active_services": 0
#             }
#         }
    
#     print(f"📊 Found {len(distinct_endpoints)} unique endpoints for user {current_user.id}")
    
#     # STEP 2: Build service metrics using Redis aggregates
#     service_map = defaultdict(lambda: {
#         'endpoints': [],
#         'total_signals': 0,
#         'total_latency': 0,
#         'total_errors': 0
#     })
    
#     for service_name, endpoint in distinct_endpoints:
#         # Get metrics from Redis 24h aggregates (ALL signals - 100% accurate)
#         # Falls back to PostgreSQL snapshots if Redis is unavailable
#         metrics = await get_realtime_metrics(
#             user_id=current_user.id,
#             service_name=service_name,
#             endpoint=endpoint,
#             window='24h',
#             db=db
#         )
        
#         if metrics and metrics['count'] >= 1:
#             # Use accurate metrics from Redis
#             avg_latency = metrics['avg_latency']
#             error_rate = metrics['error_rate']
#             signal_count = metrics['count']
#             requests_per_minute = metrics.get('requests_per_minute', 0)  # NEW: for rate limiting
            
#             print(f"✅ Redis metrics for {service_name}{endpoint}: "
#                   f"{signal_count} signals, {avg_latency:.1f}ms avg, {error_rate*100:.1f}% errors, {requests_per_minute:.1f} req/min")
#         else:
#             # Fallback: Get metrics from database (sampled data)
#             print(f"⚠️  No Redis data for {service_name}{endpoint}, falling back to database")
            
#             # Async pattern for fallback query
#             stmt = select(models.Signal).filter(
#                 models.Signal.user_id == current_user.id,
#                 models.Signal.service_name == service_name,
#                 models.Signal.endpoint == endpoint
#             ).order_by(models.Signal.timestamp.desc()).limit(20)
#             result = await db.execute(stmt)
#             signals = result.scalars().all()
            
#             if not signals:
#                 continue
                
#             signal_count = len(signals)
#             avg_latency = sum(s.latency_ms for s in signals) / signal_count
#             error_count = sum(1 for s in signals if s.status == 'error')
#             error_rate = error_count / signal_count
#             requests_per_minute = 0  # No real-time rate data for fallback
        
#         # Get most recent signal for tenant_id (async pattern)
#         stmt = select(models.Signal).filter(
#             models.Signal.user_id == current_user.id,
#             models.Signal.service_name == service_name,
#             models.Signal.endpoint == endpoint
#         ).order_by(models.Signal.timestamp.desc())
#         result = await db.execute(stmt)
#         recent_signal = result.scalars().first()
        
#         tenant_id = recent_signal.tenant_id if recent_signal else None
        
#         # Get AI decision using accurate metrics including traffic rate
#         endpoint_normalized = endpoint if endpoint.startswith('/') else '/' + endpoint
#         ai_decision = make_ai_decision(
#             service_name, 
#             endpoint_normalized, 
#             avg_latency, 
#             error_rate,
#             requests_per_minute=requests_per_minute  # NEW: pass traffic rate to AI
#         )
        
#         # Build endpoint metrics
#         endpoint_metrics = Schema.EndpointMetrics(
#             path=endpoint,
#             avg_latency=avg_latency,
#             error_rate=error_rate,
#             signal_count=signal_count,
#             tenant_id=tenant_id,
#             cache_enabled=ai_decision['cache_enabled'],
#             circuit_breaker=ai_decision['circuit_breaker'],
#             rate_limit_enabled=ai_decision.get('rate_limit_enabled', False),  # NEW
#             reasoning=ai_decision['reasoning']
#         )
        
#         # Accumulate for service-level metrics
#         service_map[service_name]['endpoints'].append(endpoint_metrics)
#         service_map[service_name]['total_signals'] += signal_count
#         service_map[service_name]['total_latency'] += avg_latency * signal_count
#         service_map[service_name]['total_errors'] += error_rate * signal_count
    
#     # STEP 3: Build service list with aggregated metrics
#     services = []
    
#     for service_name, data in service_map.items():
#         if not data['endpoints']:
#             continue
        
#         # Calculate service-level metrics
#         total_signals = data['total_signals']
#         avg_latency = data['total_latency'] / total_signals if total_signals > 0 else 0
#         error_rate = data['total_errors'] / total_signals if total_signals > 0 else 0
        
#         # Get last signal timestamp for this service (async pattern)
#         stmt = select(models.Signal).filter(
#             models.Signal.user_id == current_user.id,
#             models.Signal.service_name == service_name
#         ).order_by(models.Signal.timestamp.desc())
#         result = await db.execute(stmt)
#         last_signal_record = result.scalars().first()
        
#         last_signal = last_signal_record.timestamp if last_signal_record else None
        
#         # Determine service status
#         if error_rate > 0.3:
#             status = 'down'
#         elif error_rate > 0.15 or avg_latency > 500:
#             status = 'degraded'
#         else:
#             status = 'healthy'
        
#         services.append(Schema.ServiceMetrics(
#             name=service_name,
#             endpoints=data['endpoints'],
#             total_signals=total_signals,
#             avg_latency=avg_latency,
#             error_rate=error_rate,
#             last_signal=last_signal,
#             status=status
#         ))
    
#     # Calculate overall metrics
#     if services:
#         overall_total_signals = sum(s.total_signals for s in services)
#         overall_avg_latency = sum(s.avg_latency * s.total_signals for s in services) / overall_total_signals if overall_total_signals > 0 else 0
#         overall_error_rate = sum(s.error_rate * s.total_signals for s in services) / overall_total_signals if overall_total_signals > 0 else 0
#         overall_active_services = len(services)
#     else:
#         overall_total_signals = 0
#         overall_avg_latency = 0
#         overall_error_rate = 0
#         overall_active_services = 0
    
#     print(f"✅ Built metrics for {len(services)} services using Redis aggregates")
#     print(f"   Total signals (accurate): {overall_total_signals}")
    
#     # Prepare result
#     result = {
#         "services": services,
#         "overall": {
#             "total_signals": overall_total_signals,
#             "avg_latency": overall_avg_latency,
#             "error_rate": overall_error_rate,
#             "active_services": overall_active_services
#         }
#     }
    
#     # Convert to dict for caching
#     cacheable_result = {
#         "services": [service.model_dump() for service in services],
#         "overall": result["overall"]
#     }
    
#     # Cache for 30 seconds
#     await cache_set(cache_key, cacheable_result, ttl=30)
#     print(f"💾 Cached /services data for user {current_user.id}")
    
#     return result


# @router.get("/services/{service_name}/endpoints/{endpoint_path:path}", response_model=Schema.EndpointDetailResponse)
# async def get_endpoint_detail(
#     service_name: str,
#     endpoint_path: str,
#     request: Request,
#     db: AsyncSession = Depends(get_async_db)
# ):
#     """
#     Get detailed metrics for a specific endpoint using HYBRID APPROACH (Phase 3).
    
#     APPROACH:
#     1. Get accurate METRICS from Redis 24h aggregates (total signals, avg latency, error rate)
#     2. Get HISTORY (graph data) from database (last 20 sampled signals)
#     3. Fallback to database for metrics if no Redis data exists
    
#     This ensures endpoint details show accurate overall metrics while graphs show sampled trends.
#     """
#     # Normalize endpoint path
#     if not endpoint_path.startswith('/'):
#         endpoint_path = '/' + endpoint_path
        
#     current_user = await get_current_user(request, db)
    
#     from app.realtime_aggregates import get_realtime_metrics
    
#     # STEP 1: Get accurate metrics from Redis 24h aggregates
#     # Falls back to PostgreSQL snapshots if Redis is unavailable
#     metrics = await get_realtime_metrics(
#         user_id=current_user.id,
#         service_name=service_name,
#         endpoint=endpoint_path,
#         window='24h',
#         db=db
#     )
    
#     if metrics and metrics['count'] >= 1:
#         # Use accurate metrics from Redis (ALL signals)
#         total_signals = metrics['count']
#         avg_latency = metrics['avg_latency']
#         error_rate = metrics['error_rate']
#         requests_per_minute = metrics.get('requests_per_minute', 0)  # NEW: for rate limiting
        
#         print(f"✅ Using Redis metrics for {service_name}{endpoint_path}: "
#               f"{total_signals} signals, {avg_latency:.1f}ms avg, "
#               f"{error_rate*100:.1f}% errors, {requests_per_minute:.1f} req/min")
#     else:
#         # Fallback: Calculate from database (sampled data)
#         print(f"⚠️  No Redis data for {service_name}{endpoint_path}, falling back to database")
        
#         # Async pattern for fallback
#         stmt = select(models.Signal).filter(
#             models.Signal.user_id == current_user.id,
#             models.Signal.service_name == service_name,
#             models.Signal.endpoint == endpoint_path
#         ).order_by(models.Signal.timestamp.desc())
#         result = await db.execute(stmt)
#         signals = result.scalars().all()
        
#         if not signals:
#             raise HTTPException(status_code=404, detail="Endpoint not found or no signals recorded")
        
#         total_signals = len(signals)
#         avg_latency = sum(s.latency_ms for s in signals) / total_signals
#         error_count = sum(1 for s in signals if s.status == 'error')
#         error_rate = error_count / total_signals
#         requests_per_minute = 0  # No real-time rate data for fallback
    
#     # STEP 2: Get history for graph (last 20 signals from database - sampled is fine for trends)
#     stmt = select(models.Signal).filter(
#         models.Signal.user_id == current_user.id,
#         models.Signal.service_name == service_name,
#         models.Signal.endpoint == endpoint_path
#     ).order_by(models.Signal.timestamp.desc()).limit(20)
#     result = await db.execute(stmt)
#     history_signals = result.scalars().all()
    
#     history = []
#     for s in history_signals:
#         history.append({
#             "timestamp": s.timestamp.isoformat(),
#             "latency_ms": s.latency_ms,
#             "status": s.status
#         })
    
#     # STEP 3: Get AI decision using accurate metrics including traffic rate
#     ai_decision = make_ai_decision(
#         service_name, 
#         endpoint_path, 
#         avg_latency, 
#         error_rate,
#         requests_per_minute=requests_per_minute  # NEW: pass traffic rate to AI
#     )
    
#     # Generate suggestions based on metrics
#     suggestions = []
#     if error_rate > 0.3:
#         suggestions.append("⚠️ High error rate detected. Consider implementing retry logic or circuit breakers.")
#     if avg_latency > 500:
#         suggestions.append("🐌 High latency detected. Consider caching frequently accessed data.")
#     if error_rate > 0.15 and avg_latency > 300:
#         suggestions.append("💡 Both latency and errors are elevated. Review service dependencies and database queries.")
    
#     if ai_decision['cache_enabled']:
#         suggestions.append("✅ Caching is recommended and enabled for this endpoint.")
    
#     if ai_decision.get('circuit_breaker'):
#         suggestions.append("🔴 Circuit breaker is active due to high error rate. Service is in degraded mode.")
    
#     if not suggestions:
#         suggestions.append("✨ Endpoint is performing well! No immediate optimizations needed.")
    
#     print(f"📊 Endpoint detail for {service_name}{endpoint_path}: "
#           f"Total: {total_signals}, Avg: {avg_latency:.1f}ms, Errors: {error_rate*100:.1f}%")
    
#     return Schema.EndpointDetailResponse(
#         service_name=service_name,
#         endpoint=endpoint_path,
#         avg_latency=avg_latency,
#         error_rate=error_rate,
#         total_signals=total_signals,
#         history=history,
#         suggestions=suggestions,
#         cache_enabled=ai_decision['cache_enabled'],
#         circuit_breaker=ai_decision.get('circuit_breaker', False),
#         rate_limit_enabled=ai_decision.get('rate_limit_enabled', False),  # NEW
#         reasoning=ai_decision['reasoning']
#     )
