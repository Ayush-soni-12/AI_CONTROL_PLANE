"""
Helper function to get per-customer request rate for rate limiting.

This is separate from the main get_realtime_metrics function because:
1. Rate limiting checks only need customer-specific data (not global metrics)
2. It's more efficient to query just the customer key
3. Keeps the code separation clean
"""

import json
from typing import Optional
from app.cache import redis_client


async def get_customer_metrics(
    user_id: int,
    service_name: str,
    endpoint: str,
    customer_identifier: str
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
    
    Returns:
        Dict with 'requests_per_minute' and 'count', or None if no data
    """
    try:
        import time
        current_timestamp = int(time.time())
        current_minute = current_timestamp // 60
        
        # Get current minute bucket for this customer
        key = f"rt_agg:user:{user_id}:service:{service_name}:endpoint:{endpoint}:customer:{customer_identifier}:1m:{current_minute}"
        
        data = await redis_client.get(key)
        if data:
            agg = json.loads(data)
            return {
                'count': agg.get('count', 0),
                'requests_per_minute': agg.get('count', 0),  # Direct count = req/min
                'last_updated': agg.get('last_updated')
            }
        
        # No data = no requests from this customer in last minute
        return {
            'count': 0,
            'requests_per_minute': 0,
            'last_updated': None
        }
        
    except Exception as e:
        print(f"❌ Error getting customer metrics: {e}")
        return {'count': 0, 'requests_per_minute': 0}
