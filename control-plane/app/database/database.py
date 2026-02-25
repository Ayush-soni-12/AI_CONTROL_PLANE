from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy.ext.asyncio import create_async_engine , AsyncSession , async_sessionmaker
from app.config import settings


# Remove ?pgbouncer=true if present (SQLAlchemy drivers reject it)
DATABASE_URL = settings.DATABASE_URL.replace("?pgbouncer=true", "")

# ============================================================================
# SYNC ENGINE (for background jobs that run in threads)
# ============================================================================
engine = create_engine(
    DATABASE_URL,
    echo=False,
    poolclass=QueuePool,
    pool_size=5,           # Reduced: 2 containers × 5 = 10 sync connections
    max_overflow=5,
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
# Strip ?pgbouncer=true from URL — asyncpg doesn't understand it.
# PgBouncer compatibility is handled via connect_args instead.
_async_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
async_database_url = _async_url.replace("?pgbouncer=true", "")

async_engine = create_async_engine(
    async_database_url,
    echo=False,
    pool_size=5,           # Reduced: 2 containers × 5 = 10 async connections
    max_overflow=5,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
    connect_args={
        # Required for Supabase Transaction Pooler (PgBouncer transaction mode)
        # PgBouncer transaction mode does not support prepared statements
        "prepared_statement_cache_size": 0,
    }
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