from fastapi import APIRouter, Depends, Response, status,HTTPException
from sqlalchemy.orm import Session
from .. import models, Schema
from ..database import get_db
from ..functions.decisionFunction import make_decision


router = APIRouter(
    prefix="/api",
    tags=['Signals']
)




@router.post("/signals")
async def receive_signal(signals:Schema.SignalSend, db:Session = Depends(get_db)):
    # signals_memory.append(signals)

    print(f"Signals received: {signals}")

    signal = models.Signal(**signals.model_dump())
    db.add(signal)
    db.commit()
    db.refresh(signal)
    # return signal 
    return Response(status_code=status.HTTP_201_CREATED)



@router.get("/signals", response_model=Schema.SignalsResponse)
async def get_all_signals(db:Session = Depends(get_db)):
    # print(f"Total signals received: {len(signals_memory)}")

    signals = db.query(models.Signal).order_by(models.Signal.timestamp.desc()).limit(50).all()

    if not signals:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No signals found")

    print(f"Signals:{signals}")

    # print(f"Total signals received: {len(signals)}")

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