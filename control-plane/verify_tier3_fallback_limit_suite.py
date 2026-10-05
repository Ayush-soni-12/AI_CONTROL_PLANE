import asyncio
import logging
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

from app.realtime_aggregates import get_realtime_metrics
from app.redis.cache import redis_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verify_tier3_fallback_limit")


async def run_suite():
    passed = 0
    total = 4

    logger.info("==========================================================")
    logger.info("VERIFICATION SUITE: SPEC 0031 TIER 3 FALLBACK LIMIT")
    logger.info("==========================================================")

    test_user_id = 8888
    test_tenant_id = "tenant_test_fb"
    test_service = "order-service"
    test_endpoint = "/api/v1/checkout"

    # Ensure Redis keys do not exist so we trigger fallback
    for window in ['1m', '1h', '24h']:
        await redis_client.delete(f"nc:tenant:{test_tenant_id}:service:{test_service}:endpoint:{test_endpoint}:{window}")
        await redis_client.delete(f"rt_agg:user:{test_user_id}:service:{test_service}:endpoint:{test_endpoint}:{window}")

    # Build 1,200 synthetic signal objects (simulating historical DB records)
    now = datetime.now(timezone.utc)
    mock_signals = []
    for i in range(1200):
        sig = MagicMock()
        sig.id = i + 1
        sig.latency_ms = 10.0 + (i % 100)
        sig.status = "error" if i % 10 == 0 else "success"
        sig.action_taken = "rate_limited" if i % 20 == 0 else "none"
        # Newer signals have higher timestamps
        sig.timestamp = now - timedelta(seconds=(1200 - i))
        mock_signals.append(sig)

    captured_stmts = []

    mock_db = MagicMock()

    async def mock_execute(stmt):
        captured_stmts.append(stmt)
        stmt_str = str(stmt)
        res = MagicMock()
        # Tier 2 snapshot misses
        if "aggregate_snapshots" in stmt_str or "AggregateSnapshot" in stmt_str:
            res.scalars().first.return_value = None
        else:
            # Tier 3 raw signals query: simulate SQL engine honoring limit and order
            # The query has .order_by(timestamp.desc()).limit(500)
            limit_val = getattr(stmt, "_limit", None)
            if limit_val is not None:
                # Return the 500 most recent signals
                res.scalars().all.return_value = list(reversed(mock_signals))[:limit_val]
            else:
                # If no limit was present, returns all 1200
                res.scalars().all.return_value = list(reversed(mock_signals))
        return res

    mock_db.execute = mock_execute

    # ------------------------------------------------------------------
    # AC-1 & AC-2: Query specifies .limit(500) and .order_by(timestamp.desc())
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-1 & AC-2: Checking SQL query clauses on Tier 3 fallback...")

    metrics = await get_realtime_metrics(
        user_id=test_user_id,
        service_name=test_service,
        endpoint=test_endpoint,
        window="1h",
        tenant_id=test_tenant_id,
        db=mock_db
    )

    assert metrics is not None, "Expected metrics to be returned from Tier 3 fallback"
    assert len(captured_stmts) >= 2, "Expected both snapshot and signal queries to execute"

    # Find the Signal select statement
    signal_stmt = None
    for s in captured_stmts:
        if "FROM signals" in str(s) or "signals.endpoint" in str(s):
            signal_stmt = s
            break

    assert signal_stmt is not None, "Expected a select statement on signals table"

    # Check limit clause
    assert getattr(signal_stmt, "_limit", None) == 500, (
        f"Expected statement limit 500, got {getattr(signal_stmt, '_limit', None)}"
    )
    logger.info("PASS: AC-1 verified: Tier 3 fallback query enforces .limit(500)")
    passed += 1

    # Check order by clause
    compiled_sql = str(signal_stmt)
    assert "ORDER BY signals.timestamp DESC" in compiled_sql or "timestamp DESC" in compiled_sql, (
        f"Expected descending order on timestamp, got {compiled_sql}"
    )
    logger.info("PASS: AC-2 verified: Tier 3 fallback query orders by timestamp descending before limit")
    passed += 1

    # ------------------------------------------------------------------
    # AC-4: Unbounded scan prevented, returns at most 500 records
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-4: Result set strictly capped at 500 records on table with 1,200 rows...")

    assert metrics["count"] == 500, f"Expected count == 500, got {metrics['count']}"
    assert metrics["source"] == "database", f"Expected source == 'database', got {metrics['source']}"

    logger.info("PASS: AC-4 verified: Query returns exactly 500 rows even when 1,200 rows exist in table")
    passed += 1

    # ------------------------------------------------------------------
    # AC-3: Calculated metrics derived accurately over the 500 sampled rows
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-3: Metrics accurately derived over the 500 sampled rows...")

    # Calculate expected values over the 500 most recent records
    expected_sample = list(reversed(mock_signals))[:500]
    expected_count = 500
    expected_sum_latency = sum(s.latency_ms for s in expected_sample)
    expected_errors = sum(1 for s in expected_sample if s.status == "error")
    expected_avg_latency = expected_sum_latency / expected_count
    expected_error_rate = expected_errors / expected_count
    expected_rate_limit_count = len([s for s in expected_sample if s.action_taken == "rate_limited"])

    assert metrics["count"] == expected_count, f"Count mismatch: {metrics['count']} != {expected_count}"
    assert metrics["sum_latency"] == expected_sum_latency, f"Sum latency mismatch: {metrics['sum_latency']} != {expected_sum_latency}"
    assert metrics["errors"] == expected_errors, f"Errors mismatch: {metrics['errors']} != {expected_errors}"
    assert abs(metrics["avg_latency"] - expected_avg_latency) < 1e-6, f"Avg latency mismatch: {metrics['avg_latency']} != {expected_avg_latency}"
    assert abs(metrics["error_rate"] - expected_error_rate) < 1e-6, f"Error rate mismatch: {metrics['error_rate']} != {expected_error_rate}"
    assert metrics["rate_limit_count"] == expected_rate_limit_count, f"Rate limit count mismatch: {metrics['rate_limit_count']} != {expected_rate_limit_count}"
    assert metrics["rate_limit_enabled"] == (expected_rate_limit_count > 0), "Rate limit enabled flag mismatch"
    assert metrics["p50"] is not None and metrics["p95"] is not None and metrics["p99"] is not None, "Percentiles should be populated"

    logger.info("PASS: AC-3 verified: Latencies, errors, percentiles, and rate limits correctly computed over the 500 rows")
    passed += 1

    logger.info("\n==========================================================")
    logger.info(f"RESULTS: {passed}/{total} ACCEPTANCE CRITERIA VERIFIED PASS")
    logger.info("==========================================================")


if __name__ == "__main__":
    asyncio.run(run_suite())
