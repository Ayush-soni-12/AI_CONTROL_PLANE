"""
Helper function to get per-customer request rate for rate limiting.
Standardized with multi-tenant key namespacing and outage resilience.
"""

import json
import logging
import time
from typing import Optional, Union
from app.redis.cache import redis_client, get_tenant_key

logger = logging.getLogger(__name__)


async def get_customer_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    customer_identifier: str,
    tenant_id: Optional[Union[str, int]] = None
) -> Optional[dict]:
    """
    Get per-customer request rate for rate limiting checks.
    
    Returns requests_per_minute for this specific customer only.
    Used to enforce per-customer rate limits (e.g., 10 req/min per IP).
    
    Args:
        user_id: User ID
        service_name: Service name
        endpoint: Endpoint path
        customer_identifier: IP address or session ID
        tenant_id: Optional tenant ID override
    
    Returns:
        Dict with 'requests_per_minute' and 'count'
    """
    try:
        tid = tenant_id if tenant_id is not None else user_id
        current_timestamp = int(time.time())
        current_minute = current_timestamp // 60
        
        # Standard namespaced customer key
        key = get_tenant_key(
            tid, service_name, "endpoint", endpoint, "customer", customer_identifier, f"1m:{current_minute}"
        )
        
        data = await redis_client.get(key)
        if not data:
            # Fallback to legacy key
            legacy_key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:customer:{customer_identifier}:1m:{current_minute}"
            data = await redis_client.get(legacy_key)

        if data:
            agg = json.loads(data)
            return {
                'count': agg.get('count', 0),
                'requests_per_minute': agg.get('count', 0),
                'last_updated': agg.get('last_updated')
            }
        
        return {
            'count': 0,
            'requests_per_minute': 0,
            'last_updated': None
        }
        
    except Exception as e:
        logger.debug(f"Graceful degradation getting customer metrics: {e}")
        return {'count': 0, 'requests_per_minute': 0, 'last_updated': None}
