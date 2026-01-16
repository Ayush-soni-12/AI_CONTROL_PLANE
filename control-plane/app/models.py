from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Integer, String, text,Float
from sqlalchemy.orm import relationship
from .database import Base


# Signal table
class Signal(Base):
    __tablename__ = "signals"
    
    id = Column(Integer, primary_key=True)
    service_name = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    latency_ms = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True),nullable=False, server_default=text('now()'))
