from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from .config import settings


DATABASE_URL = settings.DATABASE_URL


# Create engine with connection pooling and production optimizations
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Disable SQL logging in production for performance
    poolclass=QueuePool,
    pool_size=20,          # Normal connection pool size
    max_overflow=10,       # Additional connections during peak load
    pool_timeout=30,       # Wait 30s for connection before timeout
    pool_recycle=3600,     # Recycle connections every hour (prevent stale connections)
    pool_pre_ping=True     # Check connection health before using
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()