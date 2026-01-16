from datetime import datetime
from typing import Optional,List
from pydantic import BaseModel, EmailStr, Field






class SignalBase(BaseModel):
    service_name: str
    endpoint: str
    latency_ms: float
    status: str
