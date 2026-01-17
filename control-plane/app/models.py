from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Integer, String, text,Float
from sqlalchemy.orm import relationship
from .database import Base


# Signal table
class Signal(Base):
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    service_name = Column(String, nullable=False,index=True)
    tenant_id = Column(String, nullable=True, index=True) 
    endpoint = Column(String, nullable=False,index=True)
    latency_ms = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True),nullable=False, server_default=text('now()'),index=True)
