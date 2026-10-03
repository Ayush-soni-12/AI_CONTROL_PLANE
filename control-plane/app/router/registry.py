from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, timezone
import json

from app.database import models
from app.database.database import get_async_db
from app.router.token import get_current_user
from app.redis.cache import redis_client
from app.blockchain.erc8004 import (
    check_agent_reputation_async,
    CONTRACT_ADDRESS,
    _score_to_tier,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/registry", tags=["Agent Registry"])


GLOBAL_CACHE_KEY = "nc:registry:agents:global"
CACHE_TTL_SECONDS = 86400  # 24 hours


class RegisterAgentPayload(BaseModel):
    agent_id: str
    owner_wallet: str
    tx_hash: Optional[str] = None
    staked_balance_avax: Optional[float] = 0.01
    name: Optional[str] = None
    metadata_json: Optional[str] = None


def _agent_model_to_dict(agent: models.RegisteredAgent) -> Dict[str, Any]:
    """
    Format a RegisteredAgent database record into the standard API dictionary.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    created_iso = agent.created_at.isoformat() if agent.created_at else now_iso
    last_active_iso = agent.last_active.isoformat() if agent.last_active else created_iso

    return {
        "agent_id": agent.agent_id,
        "name": agent.name or f"Agent {agent.agent_id}",
        "owner_wallet": agent.owner_wallet,
        "trust_score": agent.trust_score,
        "staked_balance_avax": agent.staked_balance_avax,
        "is_registered": agent.is_registered,
        "is_revoked": agent.is_revoked,
        "created_at": created_iso,
        "last_active": last_active_iso,
        "tx_hash": agent.tx_hash,
        "user_id": agent.user_id,
        "metadata_json": agent.metadata_json,
    }


@router.get("/agents")
async def list_registered_agents(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    List registered AI agents with on-chain ERC-8004 identity and trust scores.
    Requires authentication. Reads from Redis cache first; falls back to PostgreSQL on cache miss.
    """
    agents: List[Dict[str, Any]] = []

    # 1. Try reading from Redis cache first (< 1ms)
    try:
        cached = await redis_client.get(GLOBAL_CACHE_KEY)
        if cached:
            agents = json.loads(cached)
    except Exception as e:
        logger.warning(f"Failed to read agent registry cache from Redis: {e}")

    # 2. On cache miss or empty cache: query PostgreSQL using non-blocking AsyncSession
    if not agents:
        try:
            stmt = select(models.RegisteredAgent).order_by(models.RegisteredAgent.created_at.desc())
            result = await db.execute(stmt)
            db_agents = result.scalars().all()

            if db_agents:
                agents = [_agent_model_to_dict(a) for a in db_agents]
                # Reprime Redis cache
                try:
                    agents_json = json.dumps(agents)
                    await redis_client.setex(GLOBAL_CACHE_KEY, CACHE_TTL_SECONDS, agents_json)
                except Exception as e:
                    logger.warning(f"Failed to repopulate Redis registry cache: {e}")
        except Exception as e:
            logger.error(f"Failed to query PostgreSQL for registered agents: {e}")
            raise HTTPException(status_code=500, detail="Database query failed for agent registry")

    # 3. Apply search filter if provided
    if search:
        s = search.lower().strip()
        agents = [
            a
            for a in agents
            if s in a.get("agent_id", "").lower()
            or s in a.get("name", "").lower()
            or s in a.get("owner_wallet", "").lower()
        ]

    total_count = len(agents)
    paginated_agents = agents[offset : offset + limit]

    return {
        "agents": paginated_agents,
        "total": total_count,
        "contract_address": CONTRACT_ADDRESS or "0x29243AD8082F5f0CEdCa89ED85db662975E5d96A",
        "network": "Avalanche Fuji C-Chain (43113)",
    }


@router.post("/register")
async def record_registered_agent(
    payload: RegisterAgentPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Record an on-chain registered agent broadcasted from MetaMask or autonomous SDK.
    Requires authentication via session token or API key.
    Writes to PostgreSQL first with commit, then refreshes the Redis cache.
    """
    agent_id = payload.agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="Agent ID is required")

    owner_wallet = payload.owner_wallet.strip()
    if not owner_wallet:
        raise HTTPException(status_code=400, detail="Owner wallet address is required")

    now = datetime.now(timezone.utc)

    # 1. Check if agent_id already exists in PostgreSQL
    stmt = select(models.RegisteredAgent).filter(models.RegisteredAgent.agent_id.ilike(agent_id))
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Check wallet ownership to prevent identity takeover
        if existing.owner_wallet.lower() != owner_wallet.lower():
            raise HTTPException(
                status_code=409,
                detail=f"Agent ID '{agent_id}' is already registered to a different wallet address",
            )

        # Update metadata for the existing agent
        if payload.name:
            existing.name = payload.name
        if payload.tx_hash:
            existing.tx_hash = payload.tx_hash
        if payload.staked_balance_avax is not None:
            existing.staked_balance_avax = payload.staked_balance_avax
        if payload.metadata_json is not None:
            existing.metadata_json = payload.metadata_json
        if not existing.user_id:
            existing.user_id = current_user.id
        existing.last_active = now
        existing.updated_at = now

        try:
            await db.commit()
            await db.refresh(existing)
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update agent '{agent_id}' in PostgreSQL: {e}")
            raise HTTPException(status_code=500, detail="Failed to update registered agent in database")

        agent_record = _agent_model_to_dict(existing)
    else:
        # Create new RegisteredAgent row linked to authenticated user
        new_agent = models.RegisteredAgent(
            agent_id=agent_id,
            name=payload.name or f"Agent {agent_id}",
            owner_wallet=owner_wallet,
            user_id=current_user.id,
            trust_score=50,  # Starting baseline trust score
            staked_balance_avax=payload.staked_balance_avax or 0.01,
            is_registered=True,
            is_revoked=False,
            tx_hash=payload.tx_hash,
            metadata_json=payload.metadata_json,
            created_at=now,
            updated_at=now,
            last_active=now,
        )
        try:
            db.add(new_agent)
            await db.commit()
            await db.refresh(new_agent)
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to insert agent '{agent_id}' to PostgreSQL: {e}")
            raise HTTPException(status_code=500, detail="Failed to save registered agent to database")

        agent_record = _agent_model_to_dict(new_agent)

    # 2. Write-through to Redis cache
    try:
        all_stmt = select(models.RegisteredAgent).order_by(models.RegisteredAgent.created_at.desc())
        all_result = await db.execute(all_stmt)
        all_agents = all_result.scalars().all()
        agents_list = [_agent_model_to_dict(a) for a in all_agents]
        agents_json = json.dumps(agents_list)
        await redis_client.setex(GLOBAL_CACHE_KEY, CACHE_TTL_SECONDS, agents_json)

        # Update individual reputation lookup cache
        reputation_data = {
            "is_trusted": True,
            "score": agent_record["trust_score"],
            "tier": "low_reputation" if agent_record["trust_score"] < 70 else "neutral",
            "agent_id": agent_id,
            "owner_wallet": owner_wallet,
            "staked_balance_avax": agent_record["staked_balance_avax"],
            "is_registered": True,
            "is_revoked": False,
            "description": f"Registered on-chain on Avalanche Fuji: {agent_record['trust_score']}/100",
            "source": "on_chain",
        }
        reputation_json = json.dumps(reputation_data)
        await redis_client.setex(f"nc:agent:reputation:{agent_id.lower()}", 3600, reputation_json)
    except Exception as e:
        logger.warning(f"Failed to update Redis cache after registering agent '{agent_id}': {e}")

    return {
        "success": True,
        "agent": agent_record,
        "message": f"Agent '{agent_id}' recorded successfully in registry",
    }


@router.get("/agent/{agent_id}")
async def get_agent_score(
    agent_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Look up a specific agent's on-chain ERC-8004 reputation and registration status.
    Requires authentication. Queries Redis reputation cache first; falls back to PostgreSQL.
    Returns 404 Not Found if the agent is not registered in PostgreSQL or on-chain.
    """
    agent_id = agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="Agent ID cannot be empty")

    reputation = await check_agent_reputation_async(agent_id)
    score = reputation.get("score", 0)
    tier = reputation.get("tier") or _score_to_tier(score)
    is_trusted = reputation.get("is_trusted", False)
    is_on_chain = reputation.get("source") == "on_chain"
    is_registered_on_chain = is_on_chain and reputation.get("is_registered", False)
    is_revoked = reputation.get("is_revoked", False)
    owner_wallet = reputation.get("owner_wallet")
    staked_balance = reputation.get("staked_balance_avax", 0.01 if is_registered_on_chain else 0.0)

    # 1. Check Redis reputation cache first (< 1ms)
    cache_key = f"nc:agent:reputation:{agent_id.lower()}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            # Only serve from cache if the agent was actually registered and not from simulated mock
            if data.get("is_registered") and data.get("lookup_source") != "simulation":
                return {
                    **data,
                    "trust_score": score if is_on_chain else data.get("trust_score", data.get("score", score)),
                    "tier": tier if is_on_chain else data.get("tier", tier),
                    "is_trusted": is_trusted if is_on_chain else data.get("is_trusted", is_trusted),
                    "is_registered": True,
                    "is_revoked": data.get("is_revoked", is_revoked),
                    "owner_wallet": data.get("owner_wallet") or owner_wallet,
                    "staked_balance_avax": data.get("staked_balance_avax") or staked_balance,
                    "lookup_source": "on_chain" if is_on_chain else "postgres",
                    "explorer_url": f"https://testnet.snowtrace.io/address/{CONTRACT_ADDRESS or '0x29243AD8082F5f0CEdCa89ED85db662975E5d96A'}",
                }
    except Exception as e:
        logger.warning(f"Failed to check Redis for agent reputation '{agent_id}': {e}")

    # 2. Check PostgreSQL for registered agent record
    try:
        stmt = select(models.RegisteredAgent).filter(models.RegisteredAgent.agent_id.ilike(agent_id))
        result = await db.execute(stmt)
        db_agent = result.scalar_one_or_none()

        if db_agent:
            agent_dict = _agent_model_to_dict(db_agent)
            final_data = {
                **agent_dict,
                "trust_score": score if is_on_chain else agent_dict["trust_score"],
                "tier": tier if is_on_chain else _score_to_tier(agent_dict["trust_score"]),
                "is_trusted": is_trusted if is_on_chain else (agent_dict["trust_score"] >= 30),
                "is_registered": db_agent.is_registered,
                "is_revoked": db_agent.is_revoked,
                "owner_wallet": db_agent.owner_wallet or owner_wallet,
                "staked_balance_avax": db_agent.staked_balance_avax or staked_balance,
                "lookup_source": "on_chain" if is_on_chain else "postgres",
                "explorer_url": f"https://testnet.snowtrace.io/address/{CONTRACT_ADDRESS or '0x29243AD8082F5f0CEdCa89ED85db662975E5d96A'}",
            }
            # Cache the resolved agent lookup
            try:
                cached_json = json.dumps(final_data)
                await redis_client.setex(cache_key, 3600, cached_json)
            except Exception:
                pass
            return final_data
    except Exception as e:
        logger.warning(f"Failed to query PostgreSQL for agent '{agent_id}': {e}")

    # 3. Check if registered on-chain on Avalanche Fuji smart contract
    if is_registered_on_chain:
        on_chain_data = {
            "agent_id": agent_id,
            "name": f"Agent {agent_id}",
            "owner_wallet": owner_wallet,
            "trust_score": score,
            "tier": tier,
            "staked_balance_avax": staked_balance,
            "is_registered": True,
            "is_revoked": is_revoked,
            "is_trusted": is_trusted,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_active": datetime.now(timezone.utc).isoformat(),
            "lookup_source": "on_chain",
            "explorer_url": f"https://testnet.snowtrace.io/address/{CONTRACT_ADDRESS or '0x29243AD8082F5f0CEdCa89ED85db662975E5d96A'}",
        }
        try:
            cached_json = json.dumps(on_chain_data)
            await redis_client.setex(cache_key, 3600, cached_json)
        except Exception:
            pass
        return on_chain_data

    # 4. Agent is neither in PostgreSQL nor registered on-chain: return 404 Not Found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Agent '{agent_id}' is not registered in the control plane or on-chain",
    )


