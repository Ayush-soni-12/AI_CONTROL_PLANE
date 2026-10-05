import asyncio
import logging
import time
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException

from app.router.signals import (
    receive_signal_batch,
    BatchSignalRequest,
    SignalItem
)
from app.database import models

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verify_batch_signals")


async def run_suite():
    passed = 0
    total = 5

    logger.info("==========================================================")
    logger.info("VERIFICATION SUITE: SPEC 0030 CONCURRENT BATCH SIGNALS")
    logger.info("==========================================================")

    # Synthetic mock user and database session
    mock_user = MagicMock(spec=models.User)
    mock_user.id = 42
    mock_user.email = "operator@neuralcontrol.io"

    mock_db = MagicMock()

    # Build 50 synthetic test signals
    test_signals = [
        SignalItem(
            service_name="payment-service",
            endpoint=f"/api/v1/charge/{i}",
            latency_ms=15.0 + i,
            status="success" if i % 10 != 0 else "error",
            tenant_id="tenant-alpha",
            priority="high",
            action_taken="rate_limited" if i == 7 else "none",
            recorded_at=datetime.now(timezone.utc).isoformat()
        )
        for i in range(50)
    ]
    payload = BatchSignalRequest(signals=test_signals)

    # ------------------------------------------------------------------
    # AC-1: Parallel batch publishing via asyncio.gather
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-1: Parallel batch publishing execution benchmark...")

    published_calls = []

    async def mock_publish_delayed(sig_data):
        # Simulate network latency of 10ms per message
        await asyncio.sleep(0.01)
        published_calls.append(sig_data)
        return True

    with patch("app.router.signals.publish_signal", side_effect=mock_publish_delayed), \
         patch("app.router.signals._increment_signal_counter", new_callable=AsyncMock) as mock_inc:

        start_time = time.monotonic()
        response = await receive_signal_batch(payload=payload, current_user=mock_user, db=mock_db)
        elapsed = time.monotonic() - start_time

        logger.info(f"Published 50 signals concurrently in {elapsed * 1000:.2f}ms (sequential would take ~500ms)")
        assert len(published_calls) == 50, f"Expected 50 published signals, got {len(published_calls)}"
        # In sequential execution, 50 * 10ms = 500ms. In parallel, it should finish well under 100ms.
        assert elapsed < 0.15, f"Expected elapsed < 150ms for concurrent batch, got {elapsed * 1000:.2f}ms"
        assert response.status_code == 202, f"Expected 202 status code, got {response.status_code}"

    logger.info("PASS: AC-1 verified: 50 signals published concurrently with parallel execution speedup")
    passed += 1

    # ------------------------------------------------------------------
    # AC-2 & AC-4: Failure isolation with return_exceptions=True & 202 on partial success
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-2 & AC-4: Failure isolation and partial success handling...")

    attempted_signals = []

    async def mock_publish_partial(sig_data):
        attempted_signals.append(sig_data)
        # Signal #10 simulates a socket drop
        if sig_data.get("endpoint") == "/api/v1/charge/10":
            raise ConnectionResetError("RabbitMQ frame socket dropped")
        return True

    with patch("app.router.signals.publish_signal", side_effect=mock_publish_partial), \
         patch("app.router.signals._increment_signal_counter", new_callable=AsyncMock) as mock_inc:

        response = await receive_signal_batch(payload=payload, current_user=mock_user, db=mock_db)

        # Assert that the failed signal did NOT abort the other 49 signals
        assert len(attempted_signals) == 50, f"Expected all 50 signals to be attempted, got {len(attempted_signals)}"
        assert response.status_code == 202, f"Expected 202 Accepted on partial success, got {response.status_code}"

    logger.info("PASS: AC-2 verified: Partial failure on one signal isolated without aborting sibling coroutines")
    passed += 1
    logger.info("PASS: AC-4 verified: HTTP 202 Accepted returned when at least one signal succeeds")
    passed += 1

    # ------------------------------------------------------------------
    # AC-3: Quota increment counts only successfully queued signals
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-3: Quota counter increments only for processed signals...")

    with patch("app.router.signals.publish_signal", side_effect=mock_publish_partial), \
         patch("app.router.signals._increment_signal_counter", new_callable=AsyncMock) as mock_inc:

        await receive_signal_batch(payload=payload, current_user=mock_user, db=mock_db)

        # 49 out of 50 succeeded, so quota counter should increment by exactly 49
        mock_inc.assert_called_once_with(mock_user.id, 49, mock_db)

    logger.info("PASS: AC-3 verified: Billing quota incremented by exact count of 49 processed signals")
    passed += 1

    # ------------------------------------------------------------------
    # AC-5: Complete outage raises HTTP 503 Service Unavailable
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-5: Complete queue failure raises HTTP 503...")

    async def mock_publish_all_fail(sig_data):
        raise RuntimeError("AMQP broker connection refused")

    with patch("app.router.signals.publish_signal", side_effect=mock_publish_all_fail), \
         patch("app.router.signals._increment_signal_counter", new_callable=AsyncMock) as mock_inc:

        caught_503 = False
        try:
            await receive_signal_batch(payload=payload, current_user=mock_user, db=mock_db)
        except HTTPException as exc:
            if exc.status_code == 503 and "Signal queue temporarily unavailable" in exc.detail:
                caught_503 = True

        assert caught_503, "Expected HTTPException 503 with 'Signal queue temporarily unavailable'"
        mock_inc.assert_not_called()

    logger.info("PASS: AC-5 verified: Complete queue outage raises HTTP 503 and does not charge quota")
    passed += 1

    logger.info("\n==========================================================")
    logger.info(f"RESULTS: {passed}/{total} ACCEPTANCE CRITERIA VERIFIED PASS")
    logger.info("==========================================================")


if __name__ == "__main__":
    asyncio.run(run_suite())
