"""
Redis Cache Service for AI Control Plane
Provides multi-tenant key namespacing, non-blocking cache invalidation,
and in-memory fallback cache for outage resilience.
"""

import fnmatch
import json
import logging
import os
import time
from typing import Optional, Any, Dict, Tuple, Union, List
from app.config import settings

import redis.asyncio as redis

logger = logging.getLogger(__name__)

REDIS_URL = settings.REDIS_URL

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,      # Return strings instead of bytes
    socket_connect_timeout=2,
    socket_timeout=2,
)

# ── In-Memory Fallback Cache (Outage Resilience) ──────────────────────────────
# Maps key -> (cached_value_obj, expiry_timestamp)
_fallback_cache: Dict[str, Tuple[Any, float]] = {}
_MAX_FALLBACK_ENTRIES = 500
_redis_available = True
_last_error_log_time = 0.0


def _record_redis_failure(error: Exception, operation: str, key: str = ""):
    global _redis_available, _last_error_log_time
    now = time.time()
    _redis_available = False
    # Log warning at most once every 10 seconds to avoid flooding terminal
    if now - _last_error_log_time > 10.0:
        logger.warning(
            f"⚠️ Redis connection failure during {operation} (key='{key}'): {error}. "
            "Degrading to local in-memory fallback cache."
        )
        _last_error_log_time = now


def _record_redis_success():
    global _redis_available
    if not _redis_available:
        logger.info("✅ Redis connection restored — resuming live cluster cache.")
        _redis_available = True


def _prune_fallback_cache():
    """Remove expired entries and enforce capacity cap."""
    now = time.time()
    expired_keys = [k for k, (_, exp) in _fallback_cache.items() if exp <= now]
    for k in expired_keys:
        _fallback_cache.pop(k, None)

    if len(_fallback_cache) > _MAX_FALLBACK_ENTRIES:
        # Sort by expiry and remove oldest entries
        sorted_keys = sorted(_fallback_cache.keys(), key=lambda k: _fallback_cache[k][1])
        excess = len(_fallback_cache) - _MAX_FALLBACK_ENTRIES
        for k in sorted_keys[:excess]:
            _fallback_cache.pop(k, None)


# ── Canonical Multi-Tenant Key Helper ─────────────────────────────────────────

def get_tenant_key(
    tenant_id: Union[str, int, None] = "default",
    service_name: Optional[str] = None,
    *parts: str
) -> str:
    """
    Construct standardized multi-tenant Redis key.
    Format: nc:tenant:{tenant_id}[:service:{service_name}][:part1:part2...]
    """
    tid = str(tenant_id) if tenant_id is not None else "default"
    key_parts = ["nc", "tenant", tid]
    if service_name:
        key_parts.extend(["service", service_name])
    for p in parts:
        if p:
            key_parts.append(str(p))
    return ":".join(key_parts)


# ── Core Cache Operations with In-Memory Resilience ───────────────────────────

async def cache_get(key: str) -> Optional[Any]:
    """
    Get cached value with in-memory fallback.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value as deserialized Python object, or None
    """
    redis_failed = False
    try:
        data = await redis_client.get(key)
        _record_redis_success()
        if data is not None:
            val = json.loads(data)
            return val
        else:
            # Key does not exist or expired in Redis
            _fallback_cache.pop(key, None)
            return None
    except Exception as e:
        redis_failed = True
        _record_redis_failure(e, "get", key)

    # Fallback to in-memory cache when Redis is unavailable
    if redis_failed:
        _prune_fallback_cache()
        if key in _fallback_cache:
            val, exp = _fallback_cache[key]
            if exp > time.time():
                return val
            _fallback_cache.pop(key, None)

    return None


async def cache_set(key: str, value: Any, ttl: int = 300):
    """
    Set cache value with TTL in Redis and local in-memory fallback.
    
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ttl: Time to live in seconds (default: 300 = 5 minutes)
    """
    # Update local in-memory fallback cache
    _fallback_cache[key] = (value, time.time() + ttl)
    _prune_fallback_cache()

    try:
        await redis_client.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )
        _record_redis_success()
    except Exception as e:
        _record_redis_failure(e, "setex", key)


async def cache_delete(key: str):
    """
    Delete cache key from Redis and local in-memory fallback.
    
    Args:
        key: Cache key to delete
    """
    _fallback_cache.pop(key, None)

    try:
        await redis_client.delete(key)
        _record_redis_success()
    except Exception as e:
        _record_redis_failure(e, "delete", key)


async def cache_delete_pattern(pattern: str):
    """
    Delete all keys matching a pattern using non-blocking SCAN iteration.
    Also clears matching keys from local in-memory cache.
    
    Args:
        pattern: Pattern to match (e.g., "nc:tenant:123:*")
    """
    # Clear matching keys from in-memory fallback
    matching_local = [k for k in _fallback_cache.keys() if fnmatch.fnmatch(k, pattern)]
    for k in matching_local:
        _fallback_cache.pop(k, None)

    try:
        deleted_count = 0
        batch = []
        async for key in redis_client.scan_iter(match=pattern, count=100):
            batch.append(key)
            if len(batch) >= 100:
                await redis_client.delete(*batch)
                deleted_count += len(batch)
                batch = []
        if batch:
            await redis_client.delete(*batch)
            deleted_count += len(batch)

        _record_redis_success()
        if deleted_count > 0:
            logger.info(f"🗑️ Deleted {deleted_count} cache keys matching '{pattern}'")
    except Exception as e:
        _record_redis_failure(e, "scan_iter delete", pattern)


async def invalidate_tenant_cache(tenant_id: Union[str, int]):
    """
    Invalidate all cache entries for a specific tenant.
    Cleans both new namespaced format and legacy format.
    
    Args:
        tenant_id: Tenant / User ID to invalidate cache for
    """
    await cache_delete_pattern(f"nc:tenant:{tenant_id}:*")
    await cache_delete_pattern(f"user:{tenant_id}:*")


async def invalidate_user_cache(user_id: int):
    """
    Backward compatible wrapper for tenant cache invalidation.
    
    Args:
        user_id: User ID to invalidate cache for
    """
    await invalidate_tenant_cache(user_id)
