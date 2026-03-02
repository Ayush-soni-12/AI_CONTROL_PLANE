import re

with open('app/router/sse.py', 'r') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    'from app.database.database import get_async_db',
    'from app.database.database import get_async_db, AsyncSessionLocal'
)

# 2. Fix stream_signals
content = content.replace(
    '''@router.get("/signals")
async def stream_signals(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Stream signals in real-time using Server-Sent Events.
    
    Replaces the polling /api/signals endpoint with a long-lived connection
    that pushes updates to the client every 2 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    current_user = await get_current_user(request, db)''',
    '''@router.get("/signals")
async def stream_signals(
    request: Request
):
    """
    Stream signals in real-time using Server-Sent Events.
    
    Replaces the polling /api/signals endpoint with a long-lived connection
    that pushes updates to the client every 2 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    async with AsyncSessionLocal() as db:
        current_user = await get_current_user(request, db)'''
)

content = content.replace(
    '''                # Fetch latest signals (last 20, same as polling)
                stmt = select(models.Signal).filter(
                    models.Signal.user_id == current_user.id
                ).order_by(models.Signal.timestamp.desc()).limit(20)
                result = await db.execute(stmt)
                signals = result.scalars().all()''',
    '''                # Fetch latest signals (last 20, same as polling)
                async with AsyncSessionLocal() as db:
                    stmt = select(models.Signal).filter(
                        models.Signal.user_id == current_user.id
                    ).order_by(models.Signal.timestamp.desc()).limit(20)
                    result = await db.execute(stmt)
                    signals = result.scalars().all()'''
)

# 3. Fix stream_service_signals
content = content.replace(
    '''@router.get("/service-signals/{service_name}")
async def stream_service_signals(
    service_name: str,
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Stream signals for a specific service in real-time using Server-Sent Events.
    
    Similar to /api/sse/signals but filters by service_name to show only
    signals for the selected service.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    current_user = await get_current_user(request, db)''',
    '''@router.get("/service-signals/{service_name}")
async def stream_service_signals(
    service_name: str,
    request: Request
):
    """
    Stream signals for a specific service in real-time using Server-Sent Events.
    
    Similar to /api/sse/signals but filters by service_name to show only
    signals for the selected service.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    async with AsyncSessionLocal() as db:
        current_user = await get_current_user(request, db)'''
)

content = content.replace(
    '''                # Fetch latest signals for this service (last 20, same as polling)
                stmt = select(models.Signal).filter(
                    models.Signal.user_id == current_user.id,
                    models.Signal.service_name == service_name
                ).order_by(models.Signal.timestamp.desc()).limit(20)
                result = await db.execute(stmt)
                signals = result.scalars().all()''',
    '''                # Fetch latest signals for this service (last 20, same as polling)
                async with AsyncSessionLocal() as db:
                    stmt = select(models.Signal).filter(
                        models.Signal.user_id == current_user.id,
                        models.Signal.service_name == service_name
                    ).order_by(models.Signal.timestamp.desc()).limit(20)
                    result = await db.execute(stmt)
                    signals = result.scalars().all()'''
)

# 4. Fix stream_services
content = content.replace(
    '''@router.get("/services")
async def stream_services(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Stream service metrics in real-time using Server-Sent Events.
    
    Replaces the polling /api/services endpoint with a long-lived connection
    that pushes updates every 2 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    current_user = await get_current_user(request, db)''',
    '''@router.get("/services")
async def stream_services(
    request: Request
):
    """
    Stream service metrics in real-time using Server-Sent Events.
    
    Replaces the polling /api/services endpoint with a long-lived connection
    that pushes updates every 2 seconds.
    
    Authentication: Requires session cookie (dashboard login)
    """
    # Authenticate user
    async with AsyncSessionLocal() as db:
        current_user = await get_current_user(request, db)'''
)

content = content.replace(
    '''                print(f"⚠️  Cache MISS for user {current_user.id} on /services - building from Redis aggregates")
                
                # Reuse the same logic from signals.py get_services endpoint
                from app.realtime_aggregates import get_realtime_metrics
                from app.ai_engine.ai_engine import get_ai_tuned_decision
                from app.ai_engine.threshold_manager import get_all_thresholds_with_override
                from app.functions.decisionFunction import _compute_trends
                
                # STEP 1: Get unique service/endpoint combinations''',
    '''                print(f"⚠️  Cache MISS for user {current_user.id} on /services - building from Redis aggregates")
                
                # Reuse the same logic from signals.py get_services endpoint
                from app.realtime_aggregates import get_realtime_metrics
                from app.ai_engine.ai_engine import get_ai_tuned_decision
                from app.ai_engine.threshold_manager import get_all_thresholds_with_override
                from app.functions.decisionFunction import _compute_trends
                
                db = AsyncSessionLocal()
                
                # STEP 1: Get unique service/endpoint combinations'''
)

# Replace 'yield response' and close db for stream_services
content = content.replace(
    '''                # Send event to client
                yield {
                    "event": "services",
                    "data": json.dumps(response_data)
                }
                
                # Wait 2 seconds before next update
                await asyncio.sleep(2)''',
    '''                # Send event to client
                yield {
                    "event": "services",
                    "data": json.dumps(response_data)
                }
                
                await db.close()
                
                # Wait 2 seconds before next update
                await asyncio.sleep(2)'''
)
# Add fallback db.close() inside except handler for stream_services
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
                await db.close()
    
    return EventSourceResponse(event_generator())''',
    1 # only first one matching (stream_services is 3rd endpoint, but we can do it later properly)
)

# Better yet, I will write the python script to properly wrap with async with.

with open('app/router/sse.py', 'w') as f:
    f.write(content)
