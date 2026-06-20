"""
Background Jobs for AI Control Plane
Handles data aggregation and cleanup tasks
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy import func, and_, text, select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.database import AsyncSessionLocal
from app.database import models
import traceback


async def aggregate_signals_hourly():
    """
    Aggregate signals into hourly buckets
    Runs every hour, aggregates data from the previous hour
    """
    db: AsyncSession = AsyncSessionLocal()
    
    try:
        # Calculate time range: last complete hour
        now = datetime.now(timezone.utc)
        hour_start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
        hour_end = hour_start + timedelta(hours=1)
        
        print(f"🔄 Starting hourly aggregation for {hour_start} to {hour_end}")
        
        # Get all unique combinations of (user_id, service, endpoint, tenant) for this hour
        # Async pattern using select().distinct()
        stmt = select(
            models.Signal.user_id,
            models.Signal.service_name,
            models.Signal.endpoint,
            models.Signal.tenant_id
        ).where(
            and_(
                models.Signal.timestamp >= hour_start,
                models.Signal.timestamp < hour_end
            )
        ).distinct()
        
        result = await db.execute(stmt)
        combinations = result.all()
        
        aggregated_count = 0
        
        for user_id, service_name, endpoint, tenant_id in combinations:
            # Get all signals for this combination in this hour
            stmt_signals = select(models.Signal).where(
                and_(
                    models.Signal.user_id == user_id,
                    models.Signal.service_name == service_name,
                    models.Signal.endpoint == endpoint,
                    models.Signal.tenant_id == tenant_id,
                    models.Signal.timestamp >= hour_start,
                    models.Signal.timestamp < hour_end
                )
            )
            result_signals = await db.execute(stmt_signals)
            signals = result_signals.scalars().all()
            
            if not signals:
                continue
                
            # Calculate aggregated metrics
            latencies = [s.latency_ms for s in signals]
            latencies_sorted = sorted(latencies)
            n = len(latencies)
            
            errors = [s for s in signals if s.status.startswith(('4', '5'))]
            
            # Calculate percentiles
            p50_idx = int(n * 0.50)
            p95_idx = int(n * 0.95)
            p99_idx = int(n * 0.99)
            
            # Create hourly aggregate
            aggregate = models.SignalAggregateHourly(
                user_id=user_id,
                service_name=service_name,
                endpoint=endpoint,
                tenant_id=tenant_id,
                hour_bucket=hour_start,
                avg_latency_ms=sum(latencies) / n,
                min_latency_ms=min(latencies),
                max_latency_ms=max(latencies),
                p50_latency_ms=latencies_sorted[p50_idx] if n > 0 else None,
                p95_latency_ms=latencies_sorted[min(p95_idx, n-1)] if n > 0 else None,
                p99_latency_ms=latencies_sorted[min(p99_idx, n-1)] if n > 0 else None,
                total_requests=n,
                error_count=len(errors),
                success_count=n - len(errors),
                error_rate=(len(errors) / n) * 100 if n > 0 else 0
            )
            
            # Insert or update (in case job runs twice)
            await db.merge(aggregate)
            aggregated_count += 1
        
        await db.commit()
        print(f"✅ Hourly aggregation complete: {aggregated_count} aggregates created")
        
    except Exception as e:
        print(f"❌ Hourly aggregation failed: {e}")
        print(traceback.format_exc())
        await db.rollback()
    finally:
        await db.close()


async def aggregate_signals_daily():
    """
    Aggregate hourly data into daily buckets
    Runs daily, aggregates yesterday's hourly data
    """
    db: AsyncSession = AsyncSessionLocal()
    
    try:
        # Calculate time range: yesterday (complete day)
        now = datetime.now(timezone.utc)
        day_start = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        print(f"🔄 Starting daily aggregation for {day_start.date()}")
        
        # Get all unique combinations for yesterday
        stmt = select(
            models.SignalAggregateHourly.user_id,
            models.SignalAggregateHourly.service_name,
            models.SignalAggregateHourly.endpoint,
            models.SignalAggregateHourly.tenant_id
        ).where(
            and_(
                models.SignalAggregateHourly.hour_bucket >= day_start,
                models.SignalAggregateHourly.hour_bucket < day_end
            )
        ).distinct()
        
        result = await db.execute(stmt)
        combinations = result.all()
        
        aggregated_count = 0
        
        for user_id, service_name, endpoint, tenant_id in combinations:
            # Get all hourly aggregates for this combination for this day
            stmt_hourly = select(models.SignalAggregateHourly).where(
                and_(
                    models.SignalAggregateHourly.user_id == user_id,
                    models.SignalAggregateHourly.service_name == service_name,
                    models.SignalAggregateHourly.endpoint == endpoint,
                    models.SignalAggregateHourly.tenant_id == tenant_id,
                    models.SignalAggregateHourly.hour_bucket >= day_start,
                    models.SignalAggregateHourly.hour_bucket < day_end
                )
            )
            result_hourly = await db.execute(stmt_hourly)
            hourly_aggs = result_hourly.scalars().all()
            
            if not hourly_aggs:
                continue
            
            # Aggregate the hourly data
            total_requests = sum(h.total_requests for h in hourly_aggs)
            total_errors = sum(h.error_count for h in hourly_aggs)
            
            # Weighted average for latency
            weighted_latency = sum(h.avg_latency_ms * h.total_requests for h in hourly_aggs) / total_requests if total_requests > 0 else 0
            
            # Create daily aggregate
            aggregate = models.SignalAggregateDaily(
                user_id=user_id,
                service_name=service_name,
                endpoint=endpoint,
                tenant_id=tenant_id,
                day_bucket=day_start,
                avg_latency_ms=weighted_latency,
                min_latency_ms=min(h.min_latency_ms for h in hourly_aggs),
                max_latency_ms=max(h.max_latency_ms for h in hourly_aggs),
                p50_latency_ms=sum(h.p50_latency_ms for h in hourly_aggs if h.p50_latency_ms) / len([h for h in hourly_aggs if h.p50_latency_ms]) if any(h.p50_latency_ms for h in hourly_aggs) else None,
                p95_latency_ms=max((h.p95_latency_ms for h in hourly_aggs if h.p95_latency_ms), default=None),
                p99_latency_ms=max((h.p99_latency_ms for h in hourly_aggs if h.p99_latency_ms), default=None),
                total_requests=total_requests,
                error_count=total_errors,
                success_count=total_requests - total_errors,
                error_rate=(total_errors / total_requests) * 100 if total_requests > 0 else 0
            )
            
            await db.merge(aggregate)
            aggregated_count += 1
        
        await db.commit()
        print(f"✅ Daily aggregation complete: {aggregated_count} aggregates created")
        
    except Exception as e:
        print(f"❌ Daily aggregation failed: {e}")
        print(traceback.format_exc())
        await db.rollback()
    finally:
        await db.close()


async def cleanup_old_data():
    """
    Delete old signal data based on retention policies:
    - Raw signals: 7 days
    - Hourly aggregates: 90 days
    - Daily aggregates: Keep forever
    - Traces (Spans): 48 hours
    """
    db: AsyncSession = AsyncSessionLocal()
    
    try:
        now = datetime.now(timezone.utc)
        
        # Delete spans older than 48 hours
        spans_cutoff = now - timedelta(hours=48)
        stmt_spans = delete(models.Span).where(
            models.Span.start_time < spans_cutoff
        )
        result_spans = await db.execute(stmt_spans)
        deleted_spans = result_spans.rowcount
        
        # Delete raw signals older than 7 days
        signals_cutoff = now - timedelta(days=7)
        stmt_signals = delete(models.Signal).where(
            models.Signal.timestamp < signals_cutoff
        )
        result_signals = await db.execute(stmt_signals)
        deleted_signals = result_signals.rowcount
        
        # Delete incident events older than 7 days
        stmt_events = delete(models.IncidentEvent).where(
            models.IncidentEvent.occurred_at < signals_cutoff
        )
        result_events = await db.execute(stmt_events)
        deleted_events = result_events.rowcount
        
        # Delete incidents older than 7 days
        stmt_incidents = delete(models.Incident).where(
            models.Incident.started_at < signals_cutoff
        )
        result_incidents = await db.execute(stmt_incidents)
        deleted_incidents = result_incidents.rowcount
        
        # Delete hourly aggregates older than 90 days
        hourly_cutoff = now - timedelta(days=90)
        stmt_hourly = delete(models.SignalAggregateHourly).where(
            models.SignalAggregateHourly.hour_bucket < hourly_cutoff
        )
        result_hourly = await db.execute(stmt_hourly)
        deleted_hourly = result_hourly.rowcount
        
        await db.commit()
        
        print(f"🗑️  Cleanup complete:")
        print(f"   - Deleted {deleted_spans} spans older than 48 hours")
        print(f"   - Deleted {deleted_signals} raw signals older than 7 days")
        print(f"   - Deleted {deleted_incidents} incidents and {deleted_events} events older than 7 days")
        print(f"   - Deleted {deleted_hourly} hourly aggregates older than 90 days")
        
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        print(traceback.format_exc())
        await db.rollback()
    finally:
        await db.close()


if __name__ == "__main__":
    # For manual testing
    print("Running aggregation jobs manually...")
    aggregate_signals_hourly()
    aggregate_signals_daily()
    cleanup_old_data()
