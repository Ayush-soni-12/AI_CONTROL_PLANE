from datetime import datetime
from typing import Optional,List
from pydantic import BaseModel, EmailStr, Field






class SignalSend(BaseModel):
    service_name: str
    endpoint: str
    latency_ms: float
    status: str
    tenant_id: str

class SignalReceive(SignalSend):
    id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True

class SignalsResponse(BaseModel):
    signals: List[SignalReceive]


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class SignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=64)
    confirmPassword: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

    class Config:
        from_attributes = True


# API Key Schemas
class ApiKeyResponse(BaseModel):
    id: int
    key: str
    name: Optional[str]
    created_at: datetime
    last_used: Optional[datetime]
    is_active: bool
    
    class Config:
        from_attributes = True


class ApiKeyCreate(BaseModel):
    name: Optional[str] = None


class ApiKeyGenerateResponse(BaseModel):
    api_key: ApiKeyResponse
    message: str


# Service Analytics Schemas
class EndpointMetrics(BaseModel):
    path: str
    avg_latency: float
    error_rate: float
    signal_count: int
    tenant_id: Optional[str]
    cache_enabled: bool
    circuit_breaker: bool
    reasoning: str  # AI decision reasoning


class ServiceMetrics(BaseModel):
    name: str
    endpoints: List[EndpointMetrics]
    total_signals: int
    avg_latency: float
    error_rate: float
    last_signal: datetime
    status: str  # 'healthy', 'degraded', 'down'


class ServicesResponse(BaseModel):
    services: List[ServiceMetrics]
    overall: dict  # Overall metrics across all services