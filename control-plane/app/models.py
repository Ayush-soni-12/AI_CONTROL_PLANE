from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Integer, String, text,Float
from sqlalchemy.orm import relationship
from .database import Base


# Signal table
class Signal(Base):
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    service_name = Column(String, nullable=False,index=True)
    tenant_id = Column(String, nullable=False, index=True) 
    endpoint = Column(String, nullable=False,index=True)
    latency_ms = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True),nullable=False, server_default=text('now()'),index=True)



class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String,nullable=False,unique=True)
    name = Column(String,nullable=False)
    password = Column(String,nullable=False)
    created_at = Column(TIMESTAMP(timezone=True),nullable=False,server_default=text('now()'))
    
    # Relationship to API keys
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")


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

