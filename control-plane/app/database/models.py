from sqlalchemy import TIMESTAMP, Boolean, Column, ForeignKey, Integer, String, text, Float, Index, Text ,JSON , DateTime
from datetime import datetime, timezone
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
    
    # NEW: Edge SDK Action Taken locally without hitting control plane decision
    action_taken = Column(String, nullable=True, server_default=text("'none'"))

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

    # ── Billing (Cloud mode only — all nullable so self-hosters are unaffected) ──
    razorpay_customer_id = Column(String, nullable=True, unique=True, index=True)
    subscription_id      = Column(String, nullable=True)   # last Razorpay order_id
    # 'active' | 'expired' | 'cancelled'
    subscription_status  = Column(String, nullable=True)
    # 'free' | 'pro' | 'business'
    plan_tier            = Column(String, nullable=True, server_default=text("'free'"))
    # Total signals ingested in the current billing period
    signals_used_month   = Column(Integer, nullable=False, server_default=text('0'))
    billing_period_start = Column(TIMESTAMP(timezone=True), nullable=True)
    # When the current paid plan expires (null = free / never expires)
    plan_expires_at      = Column(TIMESTAMP(timezone=True), nullable=True)

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
    
    # Percentile metrics (NEW: for AI analysis)
    p50 = Column(Float, nullable=True, server_default=text('0'))
    p95 = Column(Float, nullable=True, server_default=text('0'))
    p99 = Column(Float, nullable=True, server_default=text('0'))
    
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



class AIThreshold(Base):
    """
    AI-tuned thresholds per user/service/endpoint.
    
    Updated by the background AI analyzer every 5 minutes.
    Used by the decision engine instead of hardcoded values.
    """
    __tablename__ = "ai_thresholds"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False, index=True)
    
    # Thresholds (AI-tuned)
    cache_latency_ms = Column(Integer, nullable=False, server_default=text('500'))
    circuit_breaker_error_rate = Column(Float, nullable=False, server_default=text('0.3'))
    queue_deferral_rpm = Column(Integer, nullable=False, server_default=text('80'))
    load_shedding_rpm = Column(Integer, nullable=False, server_default=text('150'))
    rate_limit_customer_rpm = Column(Integer, nullable=False, server_default=text('15'))
    
    # NEW: Advanced Resiliency Features
    adaptive_timeout_latency_ms = Column(Integer, nullable=False, server_default=text('2000'))
    
    # AI metadata
    confidence = Column(Float, nullable=True)
    reasoning = Column(String, nullable=True)
    last_updated = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    
    __table_args__ = (
        Index('idx_ai_threshold_unique', 'user_id', 'service_name', 'endpoint', unique=True),
    )


class AIInsight(Base):
    """
    AI-detected patterns, anomalies, and recommendations.
    
    Stored by the background analyzer for dashboard display.
    """
    __tablename__ = "ai_insights"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    insight_type = Column(String, nullable=False)  # 'pattern', 'anomaly', 'recommendation'
    description = Column(String, nullable=False)
    confidence = Column(Float, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    
    __table_args__ = (
        Index('idx_ai_insight_user_time', 'user_id', 'created_at'),
    )


class ConfigOverride(Base):
    """
    Manual threshold overrides for AI decisions.

    Instead of forcing flags ON/OFF, a ConfigOverride lets you replace
    *specific numeric thresholds* with your own values.  The AI engine
    still runs normally — it just uses your threshold where you've set one.

    Example
    -------
    You know a traffic spike is coming.  You want caching to kick in
    earlier than the AI thinks (AI says 800ms, you want 300ms):

        cache_latency_ms = 300    ← your value
        others           = None   ← AI keeps deciding

    The decision engine merges: AI thresholds + your overrides (wins).

    Threshold fields
    ----------------
    All nullable — None = leave this threshold to the AI.

    • cache_latency_ms          – enable cache when avg_latency > this (ms)
    • circuit_breaker_error_rate – open circuit when error_rate > this (0–1)
    • queue_deferral_rpm        – defer to queue when RPM > this
    • load_shedding_rpm         – shed load when RPM > this
    • rate_limit_customer_rpm   – rate-limit a single customer above this RPM
    • adaptive_timeout_latency_ms - adaptive timeout triggers when avg_latency > this (ms)
    """
    __tablename__ = "config_overrides"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String, nullable=False, index=True)
    endpoint = Column(String, nullable=False, index=True)

    # Threshold overrides — NULL means "let AI decide this threshold"
    cache_latency_ms = Column(Integer, nullable=True)           # ms; lower = cache sooner
    circuit_breaker_error_rate = Column(Float, nullable=True)   # 0.0–1.0
    queue_deferral_rpm = Column(Integer, nullable=True)         # requests per minute
    load_shedding_rpm = Column(Integer, nullable=True)          # requests per minute
    rate_limit_customer_rpm = Column(Integer, nullable=True)    # requests per minute per customer
    
    # NEW: Advanced Resiliency Features
    adaptive_timeout_latency_ms = Column(Integer, nullable=True)

    # Why the override was created (for audit / dashboard display)
    reason = Column(String, nullable=False)

    # Lifecycle
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text('now()'))
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False, index=True)
    is_active = Column(Boolean, nullable=False, server_default=text('true'), index=True)

    __table_args__ = (
        Index('idx_override_active_lookup', 'user_id', 'service_name', 'endpoint', 'is_active', 'expires_at'),
    )






# ─── Incident severity levels ────────────────────────────────────────────────
SEVERITY_INFO     = "info"       # Minor blip, no user impact
SEVERITY_WARNING  = "warning"    # Degraded performance, some users affected
SEVERITY_CRITICAL = "critical"   # Service down or severely degraded

# ─── Incident status ──────────────────────────────────────────────────────────
STATUS_OPEN       = "open"
STATUS_RESOLVED   = "resolved"

# ─── Event types (what happened at each step on the timeline) ─────────────────
EVENT_LATENCY_SPIKE        = "latency_spike"
EVENT_ERROR_SPIKE          = "error_spike"
EVENT_TRAFFIC_SPIKE        = "traffic_spike"
EVENT_CACHE_ENABLED        = "cache_enabled"
EVENT_CIRCUIT_BREAKER      = "circuit_breaker"
EVENT_LOAD_SHEDDING        = "load_shedding"
EVENT_QUEUE_DEFERRAL       = "queue_deferral"
EVENT_RATE_LIMITED         = "rate_limited"
EVENT_RECOVERY_DETECTED    = "recovery_detected"
EVENT_INCIDENT_OPENED      = "incident_opened"
EVENT_INCIDENT_RESOLVED    = "incident_resolved"
EVENT_AI_ROOT_CAUSE        = "ai_root_cause"


class Incident(Base):
    """
    One incident = one degradation period for a service/endpoint.

    Opens automatically when a serious event fires (circuit_breaker, load_shedding,
    or latency/error crossing critical thresholds).
    Resolves automatically when metrics return to healthy for 2+ consecutive checks.
    """
    __tablename__ = "incidents"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    service_name    = Column(String(255), nullable=False, index=True)
    endpoint        = Column(String(255), nullable=False)
    title           = Column(String(500), nullable=False)   # e.g. "High latency on /api/chat"
    severity        = Column(String(50), nullable=False, default=SEVERITY_WARNING)
    status          = Column(String(50), nullable=False, default=STATUS_OPEN, index=True)

    # Metrics snapshot at incident start
    peak_latency_ms    = Column(Float, default=0.0)
    peak_error_rate    = Column(Float, default=0.0)
    peak_rpm           = Column(Float, default=0.0)

    # AI root cause analysis (filled by background job or on demand)
    root_cause_summary = Column(Text, nullable=True)
    ai_confidence      = Column(String(50), nullable=True)  # "low" | "medium" | "high"

    # Duration tracking
    started_at     = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at    = Column(DateTime(timezone=True), nullable=True)
    duration_secs  = Column(Integer, nullable=True)   # filled when resolved

    # For detecting auto-resolution: count consecutive healthy checks
    healthy_checks_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    events = relationship("IncidentEvent", back_populates="incident",
                          order_by="IncidentEvent.occurred_at", cascade="all, delete-orphan")

    def duration_display(self) -> str:
        """Human-readable duration string."""
        end = self.resolved_at or datetime.now(timezone.utc)
        secs = int((end - self.started_at).total_seconds())
        if secs < 60:
            return f"{secs}s"
        if secs < 3600:
            return f"{secs // 60}m {secs % 60}s"
        return f"{secs // 3600}h {(secs % 3600) // 60}m"


class IncidentEvent(Base):
    """
    A single timestamped event within an incident.
    These are the individual steps shown on the visual timeline.

    Examples:
        14:23 — Latency spiked to 850ms (latency_spike)
        14:24 — Caching turned on automatically (cache_enabled)
        14:25 — Error rate hit 35% — emergency stop activated (circuit_breaker)
        14:27 — Traffic overload — low-priority requests dropped (load_shedding)
        14:31 — App returned to normal (recovery_detected)
    """
    __tablename__ = "incident_events"

    id          = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)

    event_type  = Column(String(100), nullable=False)   # from EVENT_* constants above
    title       = Column(String(500), nullable=False)   # short human-readable label
    description = Column(Text, nullable=True)           # longer plain-English explanation

    # Metric values at the time of this event (for sparkline/tooltip on timeline)
    latency_ms  = Column(Float, default=0.0)
    error_rate  = Column(Float, default=0.0)
    rpm         = Column(Float, default=0.0)

    # Extra structured data (action flags, thresholds, etc.)
    event_metadata    = Column(JSON, nullable=True)

    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                         nullable=False, index=True)

    # Relationship back to incident
    incident = relationship("Incident", back_populates="events")
