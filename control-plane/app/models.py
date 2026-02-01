from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Integer, String, text, Float, Index
from sqlalchemy.orm import relationship
from .database import Base


# Signal table
class Signal(Base):
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    service_name = Column(String, nullable=False, index=True)
    tenant_id = Column(String, nullable=False, index=True) 
    endpoint = Column(String, nullable=False, index=True)
    latency_ms = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'), index=True)

    user = relationship("User", back_populates="signals")
    
    # Composite indexes for query optimization
    __table_args__ = (
        # Index for /services endpoint: WHERE user_id=X AND service_name=Y AND endpoint=Z
        Index('idx_signals_user_service_endpoint', 'user_id', 'service_name', 'endpoint'),
        
        # Index for time-based queries: WHERE user_id=X ORDER BY timestamp DESC
        Index('idx_signals_user_timestamp', 'user_id', 'timestamp'),
        
        # Index for endpoint-specific queries: WHERE service_name=X AND endpoint=Y ORDER BY timestamp DESC
        Index('idx_signals_service_endpoint_timestamp', 'service_name', 'endpoint', 'timestamp'),
    )



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String,nullable=False,unique=True)
    name = Column(String,nullable=False)
    password = Column(String,nullable=False)
    created_at = Column(TIMESTAMP(timezone=True),nullable=False,server_default=text('now()'))
    
    # Relationship to API keys
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")

    # Relationship to signals
    signals = relationship("Signal", back_populates="user", cascade="all, delete-orphan")


class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)  # Optional name for the key
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    last_used = Column(TIMESTAMP(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default=text('true'))
    
    # Relationship to user
    user = relationship("User", back_populates="api_keys")

