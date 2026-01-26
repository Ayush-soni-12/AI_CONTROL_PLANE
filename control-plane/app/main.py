from fastapi import FastAPI, Depends, HTTPException, status, Response
from fastapi.middleware.cors import CORSMiddleware
from .functions.decisionFunction import make_decision
from . import models, Schema
from .database import engine, Base
from .database import get_db
from sqlalchemy.orm import Session
from typing import List
from .router import signals, auth

# Create the app
app = FastAPI()

# signals_memory = []

# Create all tables (Signal, User, ApiKey)
Base.metadata.create_all(bind=engine)



app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Create one simple endpoint
@app.get("/")
async def home():
    return {"message": "Control Plane is running!"}


app.include_router(signals.router)
app.include_router(auth.router)