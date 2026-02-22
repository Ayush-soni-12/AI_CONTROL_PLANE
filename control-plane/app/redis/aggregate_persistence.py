"""
Aggregate Persistence Module

This module handles periodic persistence of Redis real-time aggregates to PostgreSQL.

PURPOSE:
- Redis aggregates have 24h TTL and are lost on restart
- Database contains sampled signals (10% success, 100% errors)
- This creates periodic snapshots of Redis aggregates for accurate fallback metrics

ARCHITECTURE:
1. Background job runs every 30 minutes
2. Scans all active Redis aggregate keys
3. Saves snapshots to PostgreSQL (aggregate_snapshots table)
4. Old snapshots (>30 days) are cleaned up automatically

WHEN IT RUNS:
- Automatically via APScheduler background job
- Started when FastAPI app starts (main.py lifespan)
- Runs continuously every 30 minutes
"""

import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import and_
from app.database import models
from app.database.database import SessionLocal, AsyncSessionLocal
from typing import List, Dict
import asyncio
import redis.asyncio as aioredis
from app.config import settings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete


async def snapshot_redis_aggregates(db: AsyncSession = None):
    """
    Snapshot all Redis real-time aggregates to PostgreSQL.
    
    This function:
    1. Creates a new Redis connection (thread-safe for background jobs)
    2. Scans Redis for all aggregate keys
    3. Reads each aggregate's data
    4. Saves to aggregate_snapshots table
    5. Deletes old snapshots (>30 days)
    
    Runs automatically every 30 minutes via background scheduler.
    """
    if db is None:
        async_session = AsyncSessionLocal()
        should_close = True
    else:
        async_session = db
        should_close = False
    
    # Create a new Redis client for this background job to avoid event loop conflicts
    redis_job_client = None
    
    try:
        print("\n" + "="*60)
        print("🔄 Starting Redis aggregate snapshot job")
        print("="*60)
        
        # Create dedicated Redis connection for this job
        redis_job_client = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=False
        )
        
        # STEP 1: Scan Redis for all aggregate keys
        # Pattern: rt_agg:user:{user_id}:service:{service}:endpoint:{endpoint}:{window}
        pattern = "rt_agg:*"
        
        try:
            # Scan all keys matching pattern
            cursor = 0
            keys = []
            
            # Use SCAN to avoid blocking Redis
            while True:
                cursor, partial_keys = await redis_job_client.scan(cursor, match=pattern, count=100)
                keys.extend(partial_keys)
                if cursor == 0:
                    break
            
            print(f"📊 Found {len(keys)} Redis aggregate keys")
            
            if not keys:
                print("⚠️  No Redis aggregates found to snapshot")
                if should_close:
                    await async_session.close()
                return
            
            # STEP 2: Process each key and save to database
            snapshots_created = 0
            snapshots_skipped = 0
            
            for key in keys:
                try:
                    # Parse key to extract metadata
                    # Format: rt_agg:user:{user_id}:service:{service}:endpoint:{endpoint}:{window}
                    key_str = key.decode('utf-8') if isinstance(key, bytes) else key
                    
                    # Skip latency sorted set keys (auxiliary data structures)
                    if key_str.endswith(':latencies'):
                        snapshots_skipped += 1
                        continue
                    
                    parts = key_str.split(':')
                    
                    if len(parts) < 8:
                        print(f"⚠️  Skipping malformed key: {key_str}")
                        snapshots_skipped += 1
                        continue
                    
                    user_id = int(parts[2])
                    service_name = parts[4]
                    # Endpoint might contain colons, so join remaining parts except window
                    window = parts[-1]
                    endpoint = ':'.join(parts[6:-1])
                    
                    # Get aggregate data from Redis
                    data = await redis_job_client.get(key_str)
                    if not data:
                        snapshots_skipped += 1
                        continue
                    
                    agg = json.loads(data)
                    
                    # Calculate derived metrics
                    avg_latency = agg['sum_latency'] / agg['count'] if agg['count'] > 0 else 0
                    error_rate = agg['errors'] / agg['count'] if agg['count'] > 0 else 0
                    
                    # Calculate percentiles from latency sorted set
                    p50, p95, p99 = 0.0, 0.0, 0.0
                    try:
                        latency_key = f"{key_str}:latencies"
                        raw_scores = await redis_job_client.zrange(latency_key, 0, -1, withscores=True)
                        if raw_scores:
                            from app.realtime_aggregates import _percentile
                            latencies = sorted([score for _, score in raw_scores])
                            p50 = _percentile(latencies, 50)
                            p95 = _percentile(latencies, 95)
                            p99 = _percentile(latencies, 99)
                    except Exception as e:
                        print(f"⚠️  Could not compute percentiles for {key_str}: {e}")
                    
                    # STEP 3: Save snapshot to database
                    snapshot = models.AggregateSnapshot(
                        user_id=user_id,
                        service_name=service_name,
                        endpoint=endpoint,
                        window=window,
                        snapshot_at=datetime.now(timezone.utc),
                        count=agg['count'],
                        sum_latency=agg['sum_latency'],
                        errors=agg['errors'],
                        avg_latency=avg_latency,
                        error_rate=error_rate,
                        p50=p50,
                        p95=p95,
                        p99=p99,
                        last_updated=agg.get('last_updated')
                    )
                    
                    async_session.add(snapshot)
                    snapshots_created += 1
                    
                    # Commit in batches of 50 to avoid memory issues
                    if snapshots_created % 50 == 0:
                        await async_session.commit()
                        print(f"   💾 Committed {snapshots_created} snapshots so far...")
                    
                except Exception as e:
                    print(f"❌ Error processing key {key}: {e}")
                    snapshots_skipped += 1
                    continue
            
            # Final commit
            await async_session.commit()
            print(f"✅ Created {snapshots_created} snapshots")
            print(f"⏭️  Skipped {snapshots_skipped} keys")
            
            # STEP 4: Cleanup old snapshots (>30 days)
            cleanup_threshold = datetime.now(timezone.utc) - timedelta(days=30)
            
            # Async delete pattern
            stmt = delete(models.AggregateSnapshot).where(
                models.AggregateSnapshot.snapshot_at < cleanup_threshold
            )
            result = await async_session.execute(stmt)
            deleted = result.rowcount
            
            if deleted > 0:
                await async_session.commit()
                print(f"🗑️  Cleaned up {deleted} old snapshots (>30 days)")
            
            print("="*60)
            print(f"✅ Snapshot job completed successfully")
            print(f"   - Snapshots created: {snapshots_created}")
            print(f"   - Snapshots skipped: {snapshots_skipped}")
            print(f"   - Old snapshots cleaned: {deleted}")
            print("="*60 + "\n")
            
        except Exception as e:
            print(f"❌ Error scanning Redis keys: {e}")
            raise
        
    except Exception as e:
        print(f"❌ Fatal error in snapshot job: {e}")
        await async_session.rollback()
        raise
    finally:
        # Close Redis connection
        if redis_job_client:
            try:
                await redis_job_client.close()
            except:
                pass
        
        # Close database session
        if should_close:
            await async_session.close()


async def get_snapshot_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    window: str = '1h',
    db: AsyncSession = None
) -> Dict:
    """
    Get metrics from the most recent snapshot.
    
    Used as fallback when Redis aggregates are unavailable.
    
    Args:
        user_id: User ID
        service_name: Name of the service
        endpoint: API endpoint path
        window: Time window ('1h' or '24h')
        db: Database session
    
    Returns:
        Dict with keys: count, sum_latency, errors, avg_latency, error_rate
        Returns None if no snapshot exists
    """
    if db is None:
        async_session = AsyncSessionLocal()
        should_close = True
    else:
        async_session = db
        should_close = False
    
    try:
        # Get most recent snapshot for this endpoint and window
        # Async pattern using select()
        stmt = select(models.AggregateSnapshot).where(
            and_(
                models.AggregateSnapshot.user_id == user_id,
                models.AggregateSnapshot.service_name == service_name,
                models.AggregateSnapshot.endpoint == endpoint,
                models.AggregateSnapshot.window == window
            )
        ).order_by(models.AggregateSnapshot.snapshot_at.desc())
        
        result = await async_session.execute(stmt)
        snapshot = result.scalars().first()
        
        if not snapshot:
            return None
        
        # Calculate age for logging purposes
        age = datetime.now(timezone.utc) - snapshot.snapshot_at
        print(f"📸 Using snapshot from {snapshot.snapshot_at} for {service_name}{endpoint} ({window}) - age: {age}")
        
        return {
            'count': snapshot.count,
            'sum_latency': snapshot.sum_latency,
            'errors': snapshot.errors,
            'avg_latency': snapshot.avg_latency,
            'error_rate': snapshot.error_rate,
            'p50': snapshot.p50 if snapshot.p50 else 0,
            'p95': snapshot.p95 if snapshot.p95 else 0,
            'p99': snapshot.p99 if snapshot.p99 else 0,
            'last_updated': snapshot.last_updated,
            'snapshot_age': age
        }
        
    finally:
        if should_close:
            await async_session.close()


if __name__ == "__main__":
    # For manual testing
    print("Running snapshot job manually...")
    asyncio.run(snapshot_redis_aggregates())
