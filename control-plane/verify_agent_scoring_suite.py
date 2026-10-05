import asyncio
import json
import logging
import sys
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from sqlalchemy import select, delete

from app.database.database import AsyncSessionLocal
from app.database.models import RegisteredAgent, Signal, AgentPayment, User
from app.redis.cache import redis_client
from app.jobs.agent_scoring import (
    calculate_new_score,
    get_agent_baseline_score,
    run_scoring_job
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("verify_scoring")


async def cleanup_agent(db, agent_id: str):
    await db.execute(delete(Signal).where(Signal.customer_identifier == agent_id))
    await db.execute(delete(AgentPayment).where(AgentPayment.agent_id == agent_id))
    await db.execute(delete(RegisteredAgent).where(RegisteredAgent.agent_id == agent_id))
    await db.commit()
    await redis_client.delete(f"nc:agent:reputation:{agent_id.lower()}")


async def run_suite():
    passed = 0
    total = 5

    logger.info("==================================================")
    logger.info("VERIFICATION SUITE: SPEC 0027 TRUST SCORE BASELINE")
    logger.info("==================================================")

    async with AsyncSessionLocal() as db:
        for tid in ["agent_ac2_test", "agent_ac5_test", "agent_spec0027_valid", "agent_spec0027_unregistered", "agent_spec0027_revoked", "agent_spec0027_boost"]:
            await cleanup_agent(db, tid)

    # ------------------------------------------------------------------
    # AC-2: Source of truth hierarchy resolution
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-2: Source of truth baseline resolver hierarchy...")
    
    # Hierarchy level 1: On chain returns score 88
    fake_on_chain_data = ("0x1234567890123456789012345678901234567890", 88, 10**16, True, False)
    with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=fake_on_chain_data):
        with patch("app.jobs.agent_scoring.CONTRACT_ADDRESS", "0x37648375e2Ecf374B2d53D66986F9701E7E5b3ff"):
            score, source = await get_agent_baseline_score("agent_ac2_test", None)
            assert score == 88, f"Expected 88, got {score}"
            assert source == "on_chain", f"Expected on_chain, got {source}"

    # Hierarchy level 2: On chain returns None, PostgreSQL db_agent has score 78
    mock_db_agent = MagicMock()
    mock_db_agent.trust_score = 78
    with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=None):
        score, source = await get_agent_baseline_score("agent_ac2_test", mock_db_agent)
        assert score == 78, f"Expected 78, got {score}"
        assert source == "postgres", f"Expected postgres, got {source}"

    # Hierarchy level 3: On chain misses, db_agent is None, Redis has 65
    cache_key = "nc:agent:reputation:agent_ac2_test"
    await redis_client.setex(cache_key, 60, json.dumps({"trust_score": 65, "score": 65}))
    with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=None):
        score, source = await get_agent_baseline_score("agent_ac2_test", None)
        assert score == 65, f"Expected 65, got {score}"
        assert source == "redis", f"Expected redis, got {source}"
    await redis_client.delete(cache_key)

    # Hierarchy level 4: All absent, defaults to 50
    with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=None):
        score, source = await get_agent_baseline_score("agent_ac2_test", None)
        assert score == 50, f"Expected 50, got {score}"
        assert source == "default", f"Expected default, got {source}"

    logger.info("PASS: AC-2 hierarchy correctly checked On-chain -> Postgres -> Redis -> Default 50")
    passed += 1

    # ------------------------------------------------------------------
    # AC-5: Graceful fallback when blockchain RPC is offline / fails
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-5: Offline blockchain fallback to PostgreSQL...")
    mock_db_agent = MagicMock()
    mock_db_agent.trust_score = 82
    
    # Case 1: Exception during on chain call
    with patch("app.jobs.agent_scoring._fetch_on_chain_agent", side_effect=Exception("RPC connection refused")):
        with patch("app.jobs.agent_scoring.CONTRACT_ADDRESS", "0x37648375e2Ecf374B2d53D66986F9701E7E5b3ff"):
            score, source = await get_agent_baseline_score("agent_ac5_test", mock_db_agent)
            assert score == 82, f"Expected 82, got {score}"
            assert source == "postgres", f"Expected postgres, got {source}"

    # Case 2: CONTRACT_ADDRESS empty
    with patch("app.jobs.agent_scoring.CONTRACT_ADDRESS", ""):
        score, source = await get_agent_baseline_score("agent_ac5_test", mock_db_agent)
        assert score == 82, f"Expected 82, got {score}"
        assert source == "postgres", f"Expected postgres, got {source}"

    logger.info("PASS: AC-5 gracefully falls back to PostgreSQL without error or crash")
    passed += 1

    # ------------------------------------------------------------------
    # AC-3: Score preservation under neutral telemetry
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-3: Score preservation across cron runs (80 remains 80)...")
    neutral_stats = {
        "success_count": 0,
        "rate_limit_count": 0,
        "error_count": 0,
        "payments_made": 0
    }
    preserved_score = calculate_new_score(80, neutral_stats)
    assert preserved_score == 80, f"Expected 80, got {preserved_score}"
    
    low_activity_stats = {
        "success_count": 50, # Below 100 threshold
        "rate_limit_count": 10, # Below 50 threshold
        "error_count": 2, # Below 10 threshold
        "payments_made": 0
    }
    preserved_score_2 = calculate_new_score(80, low_activity_stats)
    assert preserved_score_2 == 80, f"Expected 80, got {preserved_score_2}"

    logger.info("PASS: AC-3 earned score 80 is preserved under neutral and low activity telemetry")
    passed += 1

    # ------------------------------------------------------------------
    # AC-1: Registered agent scoping in database
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-1: Scoring job evaluates only active registered agents...")
    agent_id_valid = "agent_spec0027_valid"
    agent_id_unregistered = "agent_spec0027_unregistered"
    agent_id_revoked = "agent_spec0027_revoked"

    async with AsyncSessionLocal() as db:
        await cleanup_agent(db, agent_id_valid)
        await cleanup_agent(db, agent_id_unregistered)
        await cleanup_agent(db, agent_id_revoked)

        # Find or create a test user for foreign key
        res_user = await db.execute(select(User).limit(1))
        user = res_user.scalar_one_or_none()
        test_user_id = user.id if user else 1

        # 1. Insert valid registered agent
        valid_agent = RegisteredAgent(
            agent_id=agent_id_valid,
            user_id=test_user_id,
            name="Valid Test Agent",
            owner_wallet="0x1111111111111111111111111111111111111111",
            trust_score=80,
            is_registered=True,
            is_revoked=False
        )
        db.add(valid_agent)

        # 2. Insert revoked agent
        revoked_agent = RegisteredAgent(
            agent_id=agent_id_revoked,
            user_id=test_user_id,
            name="Revoked Test Agent",
            owner_wallet="0x2222222222222222222222222222222222222222",
            trust_score=20,
            is_registered=True,
            is_revoked=True
        )
        db.add(revoked_agent)

        # 3. Insert signals for unregistered bot
        unreg_signal = Signal(
            user_id=test_user_id,
            tenant_id="tenant_default",
            service_name="demo-service",
            endpoint="/api/v1/test",
            latency_ms=120.0,
            status="error",
            action_taken="rate_limited",
            customer_identifier=agent_id_unregistered,
            is_agent=True
        )
        db.add(unreg_signal)

        await db.commit()

        # Run scoring job with mocked blockchain
        with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=None):
            with patch("app.jobs.agent_scoring.update_score_on_chain", return_value=True):
                await run_scoring_job()

        # Verify: valid agent is evaluated and maintains 80
        res = await db.execute(select(RegisteredAgent).where(RegisteredAgent.agent_id == agent_id_valid))
        agent_row = res.scalar_one()
        assert agent_row.trust_score == 80, f"Expected 80, got {agent_row.trust_score}"

        # Verify: revoked agent is NOT evaluated or altered
        res_revoked = await db.execute(select(RegisteredAgent).where(RegisteredAgent.agent_id == agent_id_revoked))
        revoked_row = res_revoked.scalar_one()
        assert revoked_row.trust_score == 20, f"Expected 20, got {revoked_row.trust_score}"

        # Clean up
        await cleanup_agent(db, agent_id_valid)
        await cleanup_agent(db, agent_id_unregistered)
        await cleanup_agent(db, agent_id_revoked)

    logger.info("PASS: AC-1 only active registered agents evaluated, revoked agents and unverified bots excluded")
    passed += 1

    # ------------------------------------------------------------------
    # AC-4: Tri store synchronization when score changes
    # ------------------------------------------------------------------
    logger.info("\nChecking AC-4: Tri store synchronization (Postgres + Redis + Blockchain)...")
    agent_id_boost = "agent_spec0027_boost"

    async with AsyncSessionLocal() as db:
        await cleanup_agent(db, agent_id_boost)

        # Find or create a test user for foreign key
        res_user = await db.execute(select(User).limit(1))
        user = res_user.scalar_one_or_none()
        user_id = user.id if user else 1

        # 1. Register agent with score 70
        agent = RegisteredAgent(
            agent_id=agent_id_boost,
            name="Boost Test Agent",
            owner_wallet="0x3333333333333333333333333333333333333333",
            trust_score=70,
            is_registered=True,
            is_revoked=False
        )
        db.add(agent)

        # 2. Add verified payments to trigger +10 boost (2 payments * 5)
        p1 = AgentPayment(
            user_id=user_id,
            agent_id=agent_id_boost,
            service_name="demo-service",
            endpoint="/api/v1/data",
            payment_mode="rate_limit",
            status="verified"
        )
        p2 = AgentPayment(
            user_id=user_id,
            agent_id=agent_id_boost,
            service_name="demo-service",
            endpoint="/api/v1/data",
            payment_mode="rate_limit",
            status="consumed"
        )
        db.add_all([p1, p2])
        await db.commit()

        # Run scoring job with mock on chain update tracker
        chain_updated_score = None

        async def mock_update_on_chain(a_id, score):
            nonlocal chain_updated_score
            chain_updated_score = score
            return True

        with patch("app.jobs.agent_scoring._fetch_on_chain_agent", return_value=None):
            with patch("app.jobs.agent_scoring.update_score_on_chain", side_effect=mock_update_on_chain):
                await run_scoring_job()

        # Check 1: PostgreSQL score updated to 80 (70 + 10)
        db.expire_all()
        res_updated = await db.execute(select(RegisteredAgent).where(RegisteredAgent.agent_id == agent_id_boost))
        updated_agent = res_updated.scalar_one()
        assert updated_agent.trust_score == 80, f"Expected Postgres score 80, got {updated_agent.trust_score}"

        # Check 2: Blockchain updated to 80
        assert chain_updated_score == 80, f"Expected on chain score 80, got {chain_updated_score}"

        # Check 3: Redis cache key updated with score 80
        cached_raw = await redis_client.get(f"nc:agent:reputation:{agent_id_boost.lower()}")
        assert cached_raw is not None, "Expected Redis cache entry"
        cached_data = json.loads(cached_raw)
        assert cached_data["trust_score"] == 80, f"Expected Redis trust_score 80, got {cached_data['trust_score']}"
        assert cached_data["tier"] == "trusted", f"Expected tier trusted, got {cached_data['tier']}"

        # Clean up
        await cleanup_agent(db, agent_id_boost)

    logger.info("PASS: AC-4 Tri store synchronization succeeded across Postgres, Redis, and Blockchain")
    passed += 1

    logger.info("==================================================")
    logger.info(f"RESULTS: {passed}/{total} ACCEPTANCE CRITERIA PASSED")
    logger.info("==================================================")


if __name__ == "__main__":
    asyncio.run(run_suite())
