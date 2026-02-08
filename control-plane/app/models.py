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
    
    # NEW: Priority for queue deferral and load shedding
    priority = Column(String, nullable=False, server_default=text("'medium'"), index=True)
    
    # NEW: Customer identifier (IP, session ID) for per-customer rate limiting
    customer_identifier = Column(String, nullable=True, index=True)

    user = relationship("User", back_populates="signals")
    
    # Composite indexes for query optimization
    __table_args__ = (
        # Index for /services endpoint: WHERE user_id=X AND service_name=Y AND endpoint=Z
        Index('idx_signals_user_service_endpoint', 'user_id', 'service_name', 'endpoint'),
        
        # Index for time-based queries: WHERE user_id=X ORDER BY timestamp DESC
        Index('idx_signals_user_timestamp', 'user_id', 'timestamp'),
        
        # Index for endpoint-specific queries: WHERE service_name=X AND endpoint=Y ORDER BY timestamp DESC
        Index('idx_signals_service_endpoint_timestamp', 'service_name', 'endpoint', 'timestamp'),
        
        # NEW: Index for per-customer rate limiting: WHERE user_id=X AND service_name=Y AND endpoint=Z AND customer_identifier=W
        Index('idx_signals_customer_endpoint', 'user_id', 'service_name', 'endpoint', 'customer_identifier', 'timestamp'),
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


# Aggregation tables for efficient time-series queries
class SignalAggregateHourly(Base):
    """
    Hourly aggregated metrics for signals
    Reduces database load for historical queries
    Retention: 90 days
    """
    __tablename__ = "signal_aggregates_hourly"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False)
    tenant_id = Column(String, nullable=True)
    
    # Time bucket (start of hour)
    hour_bucket = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Aggregated metrics
    avg_latency_ms = Column(Float, nullable=False)
    min_latency_ms = Column(Float, nullable=False)
    max_latency_ms = Column(Float, nullable=False)
    p50_latency_ms = Column(Float, nullable=True)  # Median
    p95_latency_ms = Column(Float, nullable=True)
    p99_latency_ms = Column(Float, nullable=True)
    
    total_requests = Column(Integer, nullable=False)
    error_count = Column(Integer, nullable=False)
    success_count = Column(Integer, nullable=False)
    error_rate = Column(Float, nullable=False)
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    
    # Composite indexes
    __table_args__ = (
        # Prevent duplicate aggregations for same hour
        Index('idx_hourly_unique', 'user_id', 'service_name', 'endpoint', 'tenant_id', 'hour_bucket', unique=True),
        # Fast time-range queries
        Index('idx_hourly_user_time', 'user_id', 'hour_bucket'),
        Index('idx_hourly_service_time', 'service_name', 'endpoint', 'hour_bucket'),
    )


class SignalAggregateDaily(Base):
    """
    Daily aggregated metrics for signals
    For long-term trend analysis
    Retention: Forever (minimal storage)
    """
    __tablename__ = "signal_aggregates_daily"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False)
    tenant_id = Column(String, nullable=True)
    
    # Time bucket (start of day)
    day_bucket = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    
    # Aggregated metrics
    avg_latency_ms = Column(Float, nullable=False)
    min_latency_ms = Column(Float, nullable=False)
    max_latency_ms = Column(Float, nullable=False)
    p50_latency_ms = Column(Float, nullable=True)
    p95_latency_ms = Column(Float, nullable=True)
    p99_latency_ms = Column(Float, nullable=True)
    
    total_requests = Column(Integer, nullable=False)
    error_count = Column(Integer, nullable=False)
    success_count = Column(Integer, nullable=False)
    error_rate = Column(Float, nullable=False)
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    
    # Composite indexes
    __table_args__ = (
        # Prevent duplicate aggregations for same day
        Index('idx_daily_unique', 'user_id', 'service_name', 'endpoint', 'tenant_id', 'day_bucket', unique=True),
        # Fast time-range queries
        Index('idx_daily_user_time', 'user_id', 'day_bucket'),
        Index('idx_daily_service_time', 'service_name', 'endpoint', 'day_bucket'),
    )


class AggregateSnapshot(Base):
    """
    Periodic snapshots of Redis real-time aggregates.
    
    WHY THIS EXISTS:
    - Redis aggregates expire after 24h (TTL)
    - Without this, fallback to database uses sampled data (10% success, 100% errors)
    - This preserves accurate metrics (100% coverage) even after Redis expiry
    
    HOW IT WORKS:
    - Background job snapshots Redis aggregates every 30 minutes
    - Contains same metrics as Redis but persisted to PostgreSQL
    - Used as fallback when Redis data is unavailable
    
    RETENTION: 30 days (cleanup old snapshots automatically)
    """
    __tablename__ = "aggregate_snapshots"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False, index=True)
    
    # Window type: '1h' or '24h'
    window = Column(String, nullable=False, index=True)
    
    # Snapshot timestamp
    snapshot_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'), index=True)
    
    # Aggregated metrics (from Redis)
    count = Column(Integer, nullable=False)
    sum_latency = Column(Float, nullable=False)
    errors = Column(Integer, nullable=False)
    avg_latency = Column(Float, nullable=False)
    error_rate = Column(Float, nullable=False)
    
    # Metadata
    last_updated = Column(String, nullable=True)  # ISO timestamp from Redis
    
    # Composite indexes
    __table_args__ = (
        # Fast lookups by user, service, endpoint, window
        Index('idx_snapshot_lookup', 'user_id', 'service_name', 'endpoint', 'window'),
        # Fast cleanup queries by timestamp
        Index('idx_snapshot_cleanup', 'snapshot_at'),
        # Get latest snapshot for each endpoint
        Index('idx_snapshot_latest', 'user_id', 'service_name', 'endpoint', 'window', 'snapshot_at'),
    )


class RateLimitConfig(Base):
    """
    Rate limit configurations for services/endpoints.
    
    WHY THIS EXISTS:
    - AI dynamically enables/disables rate limiting based on traffic patterns
    - Prevents service overload from traffic spikes
    - Stores per-endpoint rate limit thresholds
    
    HOW IT WORKS:
    - AI decision engine sets 'enabled=True' when high traffic detected
    - Rate limiter checks this table before allowing requests
    - Redis counters track actual request counts per minute
    
    DEFAULT: 100 requests/minute per endpoint
    """
    __tablename__ = "rate_limit_configs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False, index=True)
    
    # Rate limit settings
    enabled = Column(Boolean, nullable=False, server_default=text('false'))
    requests_per_minute = Column(Integer, nullable=False, server_default=text('100'))
    
    # Timestamps
    enabled_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'), onupdate=text('now()'))
    
    # Composite indexes
    __table_args__ = (
        # Unique constraint: one config per user/service/endpoint
        Index('idx_ratelimit_unique', 'user_id', 'service_name', 'endpoint', unique=True),
        # Fast lookups for rate limit checks
        Index('idx_ratelimit_lookup', 'user_id', 'service_name', 'endpoint', 'enabled'),
    )
