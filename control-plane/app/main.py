
from fastapi import FastAPI ,Depends
from .functions.decisionFunction import make_decision
from . import models ,Schema
from .database import engine
from .database import get_db
from sqlalchemy.orm import Session


# Create the app
app = FastAPI()

# signals_memory = []

models.Signal.metadata.create_all(bind=engine)




# Create one simple endpoint
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}



@app.post("/api/signals")
async def receive_signal(signals:Schema.SignalBase, db:Session = Depends(get_db)):
    # signals_memory.append(signals)

    print(f"Signals received: {signals}")

    signal = models.Signal(**signals.model_dump())
    db.add(signal)
    db.commit()
    db.refresh(signal)
    # return signal 
    return {"status": "received"}



@app.get("/api/signals")
async def get_all_signals(db:Session = Depends(get_db)):
    print(f"Total signals received: {len(signals_memory)}")

    signals = db.query(models.Signal).order_by(models.Signal.timestamp.desc()).limit(50).all()

    return {
        "total": len(signals),
        "signals": signals
    }


@app.get("/api/config/{service_name}/{endpoint:path}")
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