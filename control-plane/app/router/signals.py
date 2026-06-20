from fastapi import APIRouter, Depends, Response, status, HTTPException, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import models, Schema
from app.database.database import get_async_db
from app.dependencies import verify_api_key
from app.functions.decisionFunction import make_decision
from app.ai_engine.ai_engine import make_ai_decision
from app.router.token import get_current_user
from app.quota import check_quota, _increment_signal_counter
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
    current_user: models.User = Depends(check_quota),
    db: AsyncSession = Depends(get_async_db)
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
        # Increment billing counter
        await _increment_signal_counter(current_user.id, 1, db)
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
    trace_id: Optional[str] = None  # Distributed tracing — set when SDK has tracing: true
    flag_name: Optional[str] = None  # Feature flag active during this request (for auto-rollback)

class BatchSignalRequest(BaseModel):
    signals: List[SignalItem]

@router.post("/signals/batch", status_code=202)
async def receive_signal_batch(
    payload: BatchSignalRequest,
    current_user: models.User = Depends(check_quota),
    db: AsyncSession = Depends(get_async_db)
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
            
    # Increment billing counter for successfully queued signals
    if processed > 0:
        await _increment_signal_counter(current_user.id, processed, db)
            
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
    trace_id: str = None,              # Distributed tracing — SDK passes current trace_id here
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
        priority=priority,
        trace_id=trace_id,  # Thread through for incident-to-trace linking
    )

    print(f"Decision: {decision}")

    # ===== EXISTING FEATURES: Alerts, Caching, Circuit Breaker =====
    
    # Send alert if needed — publish to RabbitMQ email queue for reliable delivery
    # Wrapped in try/except: a queue hiccup must never block the config response
    if decision.get("send_alert"):
        alert_cache_key = f"alert_sent:{current_user.id}:{service_name}:{endpoint}"
        recently_sent = await cache_get(alert_cache_key)
        
        if not recently_sent:
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
                # Set cache to prevent identical alerts for 1 hour (3600 seconds)
                await cache_set(alert_cache_key, True, ttl=3600)
            except Exception as exc:
                print(f"⚠️  [signals] Failed to queue alert email: {exc} — continuing")
        else:
            print(f"ℹ️  [signals] Alert for {service_name}{endpoint} skipped (cooldown active)")
    
    
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
            'reason': f"Per-customer rate limit: {decision['reason']}",
            'request_coalescing': decision.get('request_coalescing', False),  # NEW
            'adaptive_timeout': decision.get('adaptive_timeout', {'active': False, 'recommended_timeout_ms': 2000}),
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
            'priority_required': 'high',  # Hint for client
            'request_coalescing': decision.get('request_coalescing', False),  # NEW
            'adaptive_timeout': decision.get('adaptive_timeout', {'active': False, 'recommended_timeout_ms': 2000}),
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
            'estimated_delay': 10,  # Seconds (SDK can queue for later)
            'request_coalescing': decision.get('request_coalescing', False),  # NEW
            'adaptive_timeout': decision.get('adaptive_timeout', {'active': False, 'recommended_timeout_ms': 2000}),
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
        'reason': decision['reason'],
        'request_coalescing': decision.get('request_coalescing', False),  # NEW
        # NEW: Adaptive Timeout — always returned so SDK can dynamically set its timeout
        # - active: True means latency is dangerously high, enforce the tighter timeout NOW
        # - recommended_timeout_ms: optimal timeout based on your historical p99 latency
        # - threshold_ms: the trigger threshold this user has configured
        # - baseline_p99_ms: the healthy p99 latency used to calculate the timeout
        'adaptive_timeout': decision.get('adaptive_timeout', {
            'active': False,
            'recommended_timeout_ms': 2000,
            'threshold_ms': 2000,
            'baseline_p99_ms': 0,
        }),
    }






