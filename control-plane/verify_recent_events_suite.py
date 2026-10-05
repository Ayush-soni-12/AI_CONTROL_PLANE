import asyncio
import json
import logging
from datetime import datetime, timezone
from unittest.mock import patch

from app.queue.consumer import _process_metrics_signal
from app.redis.cache import redis_client, get_tenant_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verify_recent_events")


async def run_suite():
    passed = 0
    total = 5

    logger.info("==========================================================")
    logger.info("VERIFICATION SUITE: SPEC 0032 REDIS RECENT EVENTS LIST")
    logger.info("==========================================================")

    test_user_id = 9999
    test_service = "verify-recent-service"
    service_key = get_tenant_key(test_user_id, test_service, "recent_events")
    tenant_key = get_tenant_key(test_user_id, None, "recent_events")

    # Clean up before testing
    await redis_client.delete(service_key, tenant_key)

    try:
        # TEST 1: Service and Tenant Key Creation & Payload Completeness (AC-1, AC-2, AC-5)
        logger.info("\n--- TEST 1: Service & Tenant Key Creation + Payload Completeness ---")
        sig1 = {
            "user_id": test_user_id,
            "service_name": test_service,
            "endpoint": "/api/v1/telemetry",
            "latency_ms": 45.2,
            "status": "success",
            "timestamp": "2026-10-05T22:50:00+00:00",
            "priority": "high",
            "action_taken": "none",
            "customer_identifier": "cust_alpha",
            "tenant_id": "tenant_suite_1",
        }
        await _process_metrics_signal(sig1)

        raw_service_events = await redis_client.lrange(service_key, 0, -1)
        raw_tenant_events = await redis_client.lrange(tenant_key, 0, -1)

        assert len(raw_service_events) == 1, f"Expected 1 service event, got {len(raw_service_events)}"
        assert len(raw_tenant_events) == 1, f"Expected 1 tenant event, got {len(raw_tenant_events)}"

        event1 = json.loads(raw_service_events[0])
        assert event1["service_name"] == test_service
        assert event1["endpoint"] == "/api/v1/telemetry"
        assert abs(event1["latency_ms"] - 45.2) < 0.001
        assert event1["status"] == "success"
        assert event1["timestamp"] == "2026-10-05T22:50:00+00:00"
        assert event1["priority"] == "high"
        assert event1["action_taken"] == "none"
        assert event1["customer_identifier"] == "cust_alpha"
        assert event1["tenant_id"] == "tenant_suite_1"

        logger.info("✅ TEST 1 PASSED: Event successfully written to service & tenant keys with all 9 fields.")
        passed += 1

        # TEST 2: Capacity Capping to 100 Elements (AC-3)
        logger.info("\n--- TEST 2: Capacity Capping (150 signals pushed -> 100 retained) ---")
        for i in range(2, 151):
            sig = {
                "user_id": test_user_id,
                "service_name": test_service,
                "endpoint": f"/api/v1/endpoint_{i % 5}",
                "latency_ms": float(10 + i),
                "status": "error" if i % 10 == 0 else "success",
                "timestamp": f"2026-10-05T22:50:{i % 60:02d}+00:00",
                "priority": "medium",
                "action_taken": "rate_limited" if i % 20 == 0 else "none",
                "customer_identifier": f"cust_{i}",
                "tenant_id": "tenant_suite_1",
            }
            await _process_metrics_signal(sig)

        service_len = await redis_client.llen(service_key)
        tenant_len = await redis_client.llen(tenant_key)

        assert service_len == 100, f"Expected exactly 100 service events, got {service_len}"
        assert tenant_len == 100, f"Expected exactly 100 tenant events, got {tenant_len}"

        logger.info(f"✅ TEST 2 PASSED: Exactly 100 elements retained after pushing 150 events (service={service_len}, tenant={tenant_len}).")
        passed += 1

        # TEST 3: Ordering Verification (Index 0 is the newest event)
        logger.info("\n--- TEST 3: Retrieval Ordering (Index 0 is newest) ---")
        raw_head = await redis_client.lindex(service_key, 0)
        head_event = json.loads(raw_head)
        assert head_event["customer_identifier"] == "cust_150", f"Expected newest cust_150, got {head_event['customer_identifier']}"
        assert head_event["latency_ms"] == 160.0

        raw_tail = await redis_client.lindex(service_key, 99)
        tail_event = json.loads(raw_tail)
        assert tail_event["customer_identifier"] == "cust_51", f"Expected oldest retained cust_51, got {tail_event['customer_identifier']}"

        logger.info("✅ TEST 3 PASSED: Index 0 is newest (cust_150), Index 99 is oldest retained (cust_51).")
        passed += 1

        # TEST 4: TTL Verification (AC-4)
        logger.info("\n--- TEST 4: Two Hour TTL (7200 seconds) ---")
        service_ttl = await redis_client.ttl(service_key)
        tenant_ttl = await redis_client.ttl(tenant_key)

        assert 7100 <= service_ttl <= 7200, f"Expected service TTL between 7100 and 7200, got {service_ttl}"
        assert 7100 <= tenant_ttl <= 7200, f"Expected tenant TTL between 7100 and 7200, got {tenant_ttl}"

        logger.info(f"✅ TEST 4 PASSED: TTL verified active (service_ttl={service_ttl}s, tenant_ttl={tenant_ttl}s).")
        passed += 1

        # TEST 5: Graceful Error Handling on Redis Outage
        logger.info("\n--- TEST 5: Resilient Error Handling on Redis Failure ---")
        with patch.object(redis_client, "pipeline", side_effect=Exception("Simulated Redis outage")):
            # Should not raise exception or fail consumer
            await _process_metrics_signal({
                "user_id": test_user_id,
                "service_name": test_service,
                "endpoint": "/failover",
                "latency_ms": 99.0,
                "status": "error",
            })

        logger.info("✅ TEST 5 PASSED: Metrics consumer handled Redis pipeline error gracefully without raising.")
        passed += 1

    finally:
        # Cleanup
        await redis_client.delete(service_key, tenant_key)
        # Also clean up any realtime aggregate keys created for test_user_id
        for window in ['1m', '1h', '24h']:
            await redis_client.delete(f"nc:tenant:{test_user_id}:service:{test_service}:endpoint:/api/v1/telemetry:{window}")
            await redis_client.delete(f"rt_agg:user:{test_user_id}:service:{test_service}:endpoint:/api/v1/telemetry:{window}")
        await redis_client.aclose()

    logger.info("==========================================================")
    logger.info(f"RESULTS: {passed}/{total} TESTS PASSED")
    logger.info("==========================================================")
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_suite())
    exit(0 if success else 1)
