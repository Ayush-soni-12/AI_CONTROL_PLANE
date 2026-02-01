"""
Redis Cache Service for AI Control Plane
Provides caching utilities for high-frequency endpoints
"""

import json
import os
from typing import Optional, Any
from .config import settings

import redis.asyncio as redis

# Redis connection - supports Docker or local Redis
# For Docker with password: set REDIS_URL="redis://default:password@localhost:6379"
# For local Redis: set REDIS_URL="redis://localhost:6379"
REDIS_URL = settings.REDIS_URL

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,  # Return strings instead of bytes
    socket_connect_timeout=2,
    socket_timeout=2
)



async def cache_get(key: str) -> Optional[Any]:
    """
    Get cached value
    
    Args:
        key: Cache key
        
    Returns:
        Cached value as dict, or None if not found or Redis unavailable
    """
    # if not REDIS_AVAILABLE:
    #     return None
        
    try:
        data = await redis_client.get(key)
        return json.loads(data) if data else None
    except Exception as e:
        print(f"⚠️ Cache get error for key '{key}': {e}")
        return None



async def cache_set(key: str, value: Any, ttl: int = 300):
    """
    Set cache value with TTL (Time To Live)
    
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ttl: Time to live in seconds (default: 300 = 5 minutes)
    """
    # if not REDIS_AVAILABLE:
    #     return
        
    try:
        await redis_client.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )
    except Exception as e:
        print(f"⚠️ Cache set error for key '{key}': {e}")



async def cache_delete(key: str):
    """
    Delete cache key
    
    Args:
        key: Cache key to delete
    """
    # if not REDIS_AVAILABLE:
    #     return
        
    try:
        await redis_client.delete(key)
    except Exception as e:
        print(f"⚠️ Cache delete error for key '{key}': {e}")


async def cache_delete_pattern(pattern: str):
    """
    Delete all keys matching a pattern
    
    Args:
        pattern: Pattern to match (e.g., "user:123:*")
    """
    # if not REDIS_AVAILABLE:
    #     return
        
    try:
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)
            print(f"🗑️  Deleted {len(keys)} cache keys matching '{pattern}'")
    except Exception as e:
        print(f"⚠️  Cache delete pattern error for '{pattern}': {e}")


async def invalidate_user_cache(user_id: int):
    """
    Invalidate all cache entries for a specific user
    
    Args:
        user_id: User ID to invalidate cache for
    """
    await cache_delete_pattern(f"user:{user_id}:*")
