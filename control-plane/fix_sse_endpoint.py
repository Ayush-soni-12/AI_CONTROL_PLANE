import re

with open('app/router/sse.py', 'r') as f:
    content = f.read()

# Fix stream_endpoint_detail
content = content.replace(
    '''@router.get("/endpoint-detail/{service_name}/{endpoint_path:path}")
async def stream_endpoint_detail(
    service_name: str,
    endpoint_path: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Stream detailed endpoint metrics in real-time using Server-Sent Events.
    
    Replaces the polling /api/services/{service_name}/endpoints/{endpoint_path} endpoint
    with a long-lived connection that pushes updates every 3 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Normalize endpoint path
    if not endpoint_path.startswith('/'):
        endpoint_path = '/' + endpoint_path
    
    # Authenticate user
    current_user = await get_current_user(request, db)''',
    '''@router.get("/endpoint-detail/{service_name}/{endpoint_path:path}")
async def stream_endpoint_detail(
    service_name: str,
    endpoint_path: str,
    request: Request
):
    """
    Stream detailed endpoint metrics in real-time using Server-Sent Events.
    
    Replaces the polling /api/services/{service_name}/endpoints/{endpoint_path} endpoint
    with a long-lived connection that pushes updates every 3 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Normalize endpoint path
    if not endpoint_path.startswith('/'):
        endpoint_path = '/' + endpoint_path
    
    # Authenticate user
    async with AsyncSessionLocal() as db:
        current_user = await get_current_user(request, db)'''
)

content = content.replace(
    '''                from app.realtime_aggregates import get_realtime_metrics
                from app.ai_engine.ai_engine import get_ai_tuned_decision
                from app.ai_engine.threshold_manager import get_all_thresholds_with_override
                from app.functions.decisionFunction import _compute_trends
                
                # Get metrics from Redis (1h and 24h for trends)''',
    '''                from app.realtime_aggregates import get_realtime_metrics
                from app.ai_engine.ai_engine import get_ai_tuned_decision
                from app.ai_engine.threshold_manager import get_all_thresholds_with_override
                from app.functions.decisionFunction import _compute_trends
                
                db = AsyncSessionLocal()
                
                # Get metrics from Redis (1h and 24h for trends)'''
)

content = content.replace(
    '''                # Send event to client
                yield {
                    "event": "endpoint-detail",
                    "data": json.dumps({
                        "service_name": service_name,
                        "endpoint": endpoint_path,
                        "avg_latency": avg_latency,
                        "error_rate": error_rate,
                        "total_signals": total_signals,
                        "history": history,
                        "suggestions": suggestions,
                        "cache_enabled": ai_decision['cache_enabled'],
                        "circuit_breaker": ai_decision.get('circuit_breaker', False),
                        "rate_limit_enabled": ai_decision.get('rate_limit_enabled', False),
                        "reasoning": ai_decision['reasoning'],
                        "thresholds": {
                            'cache_latency_ms': thresholds['cache_latency_ms'],
                            'circuit_breaker_error_rate': thresholds['circuit_breaker_error_rate'],
                            'queue_deferral_rpm': thresholds['queue_deferral_rpm'],
                            'load_shedding_rpm': thresholds['load_shedding_rpm'],
                            'rate_limit_customer_rpm': thresholds['rate_limit_customer_rpm'],
                            'source': thresholds.get('source', 'default')
                        }
                    })
                }
                
                # Wait 3 seconds before next update (same as polling interval)
                await asyncio.sleep(3)''',
    '''                # Send event to client
                yield {
                    "event": "endpoint-detail",
                    "data": json.dumps({
                        "service_name": service_name,
                        "endpoint": endpoint_path,
                        "avg_latency": avg_latency,
                        "error_rate": error_rate,
                        "total_signals": total_signals,
                        "history": history,
                        "suggestions": suggestions,
                        "cache_enabled": ai_decision['cache_enabled'],
                        "circuit_breaker": ai_decision.get('circuit_breaker', False),
                        "rate_limit_enabled": ai_decision.get('rate_limit_enabled', False),
                        "reasoning": ai_decision['reasoning'],
                        "thresholds": {
                            'cache_latency_ms': thresholds['cache_latency_ms'],
                            'circuit_breaker_error_rate': thresholds['circuit_breaker_error_rate'],
                            'queue_deferral_rpm': thresholds['queue_deferral_rpm'],
                            'load_shedding_rpm': thresholds['load_shedding_rpm'],
                            'rate_limit_customer_rpm': thresholds['rate_limit_customer_rpm'],
                            'source': thresholds.get('source', 'default')
                        }
                    })
                }
                
                await db.close()
                
                # Wait 3 seconds before next update (same as polling interval)
                await asyncio.sleep(3)'''
)

content = content.replace(
    '''        except asyncio.CancelledError:
            print(f"🛑 SSE stream cancelled for user {current_user.id}")
        except Exception as e:
            print(f"❌ Error in SSE stream: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
    
    return EventSourceResponse(event_generator())''',
    '''        except asyncio.CancelledError:
            if 'db' in locals() and not db.is_active:
                await getattr(db, 'close')()
            print(f"🛑 SSE stream cancelled for user {current_user.id}")
        except Exception as e:
            if 'db' in locals() and not db.is_active:
                await getattr(db, 'close')()
            print(f"❌ Error in SSE stream: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
        finally:
            if 'db' in locals():
                await getattr(db, 'close')()
    
    return EventSourceResponse(event_generator())'''
)

with open('app/router/sse.py', 'w') as f:
    f.write(content)
