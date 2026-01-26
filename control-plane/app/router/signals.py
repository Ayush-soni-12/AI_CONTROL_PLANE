from fastapi import APIRouter, Depends, Response, status, HTTPException, Request
from sqlalchemy.orm import Session
from .. import models, Schema
from ..database import get_db
from ..dependencies import verify_api_key
from ..functions.decisionFunction import make_decision
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
    ).order_by(models.Signal.timestamp.desc()).limit(50).all()

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