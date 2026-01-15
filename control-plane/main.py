
from fastapi import FastAPI

# Create the app
app = FastAPI()

signals_memory = []

# Create one simple endpoint
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}



@app.post("/api/signals")
async def receive_signal(signals:dict):
    signals_memory.append(signals)

    print(f"Signals received: {signals}")

    return {"status": "received"}



@app.get("/api/signals")
async def get_all_signals():
    print(f"Total signals received: {len(signals_memory)}")
    return {
        "total": len(signals_memory),
        "signals": signals_memory
    }

