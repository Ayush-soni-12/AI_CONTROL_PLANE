import asyncio
import json
import logging
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.database.Schema import EndpointMetrics, EndpointDetailResponse
from app.redis.cache import redis_client
from app.realtime_aggregates import update_realtime_aggregate, get_realtime_metrics

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verify_rate_limit_counter")


async def run_suite():
    passed = 0
    total = 5

    logger.info("==========================================================")
    logger.info("VERIFICATION SUITE: SPEC 0028 RATE LIMIT COUNTER ENHANCEMENT")
    logger.info("==========================================================")

    test_user_id = 9999
    test_tenant_id = "tenant_test_rl"
    test_service = "test-service-rl"
    test_endpoint = "/api/v1/resource"

    # Clean up test keys from Redis
    for window in ['1m', '1h', '24h']:
        await redis_client.delete(f"nc:tenant:{test_tenant_id}:service:{test_service}:endpoint:{test_endpoint}:{window}")
        await redis_client.delete(f"rt_agg:user:{test_user_id}:service:{test_service}:endpoint:{test_endpoint}:{window}")

    # ------------------------------------------------------------------
    # AC-1 & AC-2: Monotonic counter and derived boolean in Redis
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-1 & AC-2: 3 rate limited signals out of 10 signals...")
    
    # Send 10 signals: 3 rate limited followed by 7 passed signals
    # In the old code, the subsequent passed signals wiped rate_limit_enabled back to False!
    signals_to_send = [
        {"action": "rate_limited", "status": "error", "latency": 15.0},
        {"action": "passed", "status": "success", "latency": 25.0},
        {"action": "rate_limited", "status": "error", "latency": 12.0},
        {"action": "passed", "status": "success", "latency": 30.0},
        {"action": "rate_limited", "status": "error", "latency": 18.0},
        {"action": "passed", "status": "success", "latency": 22.0},
        {"action": "passed", "status": "success", "latency": 20.0},
        {"action": "passed", "status": "success", "latency": 28.0},
        {"action": "passed", "status": "success", "latency": 35.0},
        {"action": "passed", "status": "success", "latency": 19.0},
    ]

    for sig in signals_to_send:
        await update_realtime_aggregate(
            user_id=test_user_id,
            service_name=test_service,
            endpoint=test_endpoint,
            latency_ms=sig["latency"],
            status=sig["status"],
            action_taken=sig["action"],
            tenant_id=test_tenant_id
        )

    # Inspect Redis 1h aggregate
    key_1h = f"nc:tenant:{test_tenant_id}:service:{test_service}:endpoint:{test_endpoint}:1h"
    raw_1h = await redis_client.get(key_1h)
    assert raw_1h is not None, "Expected Redis 1h aggregate key to exist"
    agg_1h = json.loads(raw_1h)

    logger.info(f"Redis 1h aggregate: count={agg_1h['count']}, rate_limit_count={agg_1h.get('rate_limit_count')}, rate_limit_enabled={agg_1h.get('rate_limit_enabled')}")

    assert agg_1h["count"] == 10, f"Expected total count 10, got {agg_1h['count']}"
    assert agg_1h["rate_limit_count"] == 3, f"Expected rate_limit_count 3, got {agg_1h.get('rate_limit_count')}"
    assert agg_1h["rate_limit_enabled"] is True, f"Expected rate_limit_enabled True, got {agg_1h.get('rate_limit_enabled')}"

    logger.info("PASS: AC-1 & AC-2 verified: rate_limit_count is 3 and rate_limit_enabled is True despite 7 trailing passed signals")
    passed += 2

    # ------------------------------------------------------------------
    # AC-3: get_realtime_metrics returns both fields across Redis and DB
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-3: get_realtime_metrics returns rate_limit_count and rate_limit_enabled...")

    metrics = await get_realtime_metrics(
        user_id=test_user_id,
        service_name=test_service,
        endpoint=test_endpoint,
        window="1h",
        tenant_id=test_tenant_id
    )

    assert metrics is not None, "Expected get_realtime_metrics to return metrics dict"
    assert "rate_limit_count" in metrics, "Expected rate_limit_count key in metrics"
    assert "rate_limit_enabled" in metrics, "Expected rate_limit_enabled key in metrics"
    assert metrics["rate_limit_count"] == 3, f"Expected rate_limit_count 3, got {metrics['rate_limit_count']}"
    assert metrics["rate_limit_enabled"] is True, f"Expected rate_limit_enabled True, got {metrics['rate_limit_enabled']}"

    # Also test Tier 3 DB fallback
    mock_db = MagicMock()
    mock_signal_rl = MagicMock()
    mock_signal_rl.action_taken = "rate_limited"
    mock_signal_rl.latency_ms = 40.0
    mock_signal_rl.status = "error"

    mock_signal_ok = MagicMock()
    mock_signal_ok.action_taken = "passed"
    mock_signal_ok.latency_ms = 20.0
    mock_signal_ok.status = "success"

    # Query with non existent tenant so Redis misses, snapshot misses, and falls back to mock DB signals
    async def mock_execute(stmt):
        stmt_str = str(stmt)
        res = MagicMock()
        if "aggregate_snapshots" in stmt_str or "AggregateSnapshot" in stmt_str:
            res.scalars().first.return_value = None
        else:
            res.scalars().all.return_value = [mock_signal_rl, mock_signal_rl, mock_signal_ok]
        return res

    mock_db.execute = mock_execute

    db_metrics = await get_realtime_metrics(
        user_id=test_user_id,
        service_name="nonexistent-service",
        endpoint="/api/v1/fallback",
        window="1h",
        tenant_id="nonexistent_tenant",
        db=mock_db
    )
    assert db_metrics is not None, "Expected DB fallback metrics"
    assert db_metrics["rate_limit_count"] == 2, f"Expected fallback rate_limit_count 2, got {db_metrics['rate_limit_count']}"
    assert db_metrics["rate_limit_enabled"] is True, f"Expected fallback rate_limit_enabled True, got {db_metrics['rate_limit_enabled']}"

    logger.info("PASS: AC-3 verified: get_realtime_metrics returns both fields on Redis reads and DB fallbacks")
    passed += 1

    # ------------------------------------------------------------------
    # AC-4: Pydantic schemas validate rate_limit_count
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-4: Pydantic schemas validate rate_limit_count...")

    endpoint_metrics_model = EndpointMetrics(
        path="/api/v1/test",
        avg_latency=45.2,
        error_rate=0.05,
        signal_count=100,
        tenant_id="tenant_123",
        cache_enabled=True,
        circuit_breaker=False,
        rate_limit_count=5,
        rate_limit_enabled=True,
        reasoning="Healthy"
    )
    assert endpoint_metrics_model.rate_limit_count == 5
    assert endpoint_metrics_model.rate_limit_enabled is True

    detail_model = EndpointDetailResponse(
        service_name="auth-service",
        endpoint="/api/v1/login",
        avg_latency=22.5,
        error_rate=0.0,
        total_signals=50,
        history=[],
        suggestions=["Everything fine"],
        cache_enabled=False,
        circuit_breaker=False,
        rate_limit_count=0,
        rate_limit_enabled=False,
        reasoning="Good"
    )
    assert detail_model.rate_limit_count == 0
    assert detail_model.rate_limit_enabled is False

    logger.info("PASS: AC-4 verified: EndpointMetrics and EndpointDetailResponse validate rate_limit_count")
    passed += 1

    # ------------------------------------------------------------------
    # AC-5: Zero rate limit condition check
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-5: Zero rate limits produces rate_limit_count=0 and rate_limit_enabled=False...")

    test_endpoint_zero = "/api/v1/zero"
    for _ in range(5):
        await update_realtime_aggregate(
            user_id=test_user_id,
            service_name=test_service,
            endpoint=test_endpoint_zero,
            latency_ms=20.0,
            status="success",
            action_taken="passed",
            tenant_id=test_tenant_id
        )

    zero_metrics = await get_realtime_metrics(
        user_id=test_user_id,
        service_name=test_service,
        endpoint=test_endpoint_zero,
        window="1h",
        tenant_id=test_tenant_id
    )
    assert zero_metrics["rate_limit_count"] == 0, f"Expected 0, got {zero_metrics['rate_limit_count']}"
    assert zero_metrics["rate_limit_enabled"] is False, f"Expected False, got {zero_metrics['rate_limit_enabled']}"

    # Clean up test keys
    for window in ['1m', '1h', '24h']:
        await redis_client.delete(f"nc:tenant:{test_tenant_id}:service:{test_service}:endpoint:{test_endpoint}:{window}")
        await redis_client.delete(f"nc:tenant:{test_tenant_id}:service:{test_service}:endpoint:{test_endpoint_zero}:{window}")

    logger.info("PASS: AC-5 verified: zero rate limit signals correctly report count 0 and enabled False")
    passed += 1

    logger.info("==========================================================")
    logger.info(f"RESULTS: {passed}/{total} ACCEPTANCE CRITERIA PASSED")
    logger.info("==========================================================")


if __name__ == "__main__":
    asyncio.run(run_suite())
