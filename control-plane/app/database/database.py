from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import create_async_engine , AsyncSession , async_sessionmaker
from app.config import settings


DATABASE_URL = settings.DATABASE_URL


# ============================================================================
# SYNC ENGINE (for background jobs that run in threads)
# ============================================================================
engine = create_engine(
    DATABASE_URL,
    echo=False,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Sync database session for background jobs"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================================================
# ASYNC ENGINE (for FastAPI endpoints)
# ============================================================================
# Convert postgresql:// to postgresql+asyncpg:// for async driver
async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

async_engine = create_async_engine(
    async_database_url,
    echo=False,
    pool_size=10,          # Reduced - async is more efficient
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Important: prevents lazy-loading issues
    autocommit=False,
    autoflush=False
)

async def get_async_db():
    """Async database session for API endpoints"""
    async with AsyncSessionLocal() as session:
        yield session