from datetime import datetime
from typing import Optional,List
from pydantic import BaseModel, EmailStr, Field






class SignalSend(BaseModel):
    service_name: str
    endpoint: str
    latency_ms: float
    status: str
    tenant_id: str
    priority: Optional[str] = 'medium'  # NEW: critical, high, medium, low
    customer_identifier: Optional[str] = None  # NEW: IP or session ID for per-customer rate limiting
    
    @classmethod
    def validate_priority(cls, v):
        if v and v not in ['critical', 'high', 'medium', 'low']:
            raise ValueError('Priority must be: critical, high, medium, or low')
        return v or 'medium'

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
    rate_limit_enabled: bool = False  # Per-customer rate limiting
    queue_deferral: bool = False  # NEW: Queue deferral status
    load_shedding: bool = False  # NEW: Load shedding status
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


# Historical Data Schemas
class HistoricalDataRequest(BaseModel):
    start_date: datetime
    end_date: datetime


class HistoricalServicesResponse(BaseModel):
    services: List[ServiceMetrics]
    overall: dict
    metadata: dict  # Contains: data_source, time_range, total_records


class EndpointDetailResponse(BaseModel):
    service_name: str
    endpoint: str
    avg_latency: float
    error_rate: float
    total_signals: int
    history: List[dict]
    suggestions: List[str]
    cache_enabled: bool
    circuit_breaker: bool
    rate_limit_enabled: bool = False  # Per-customer rate limiting
    queue_deferral: bool = False  # NEW: Queue deferral status
    load_shedding: bool = False  # NEW: Load shedding status
    reasoning: str