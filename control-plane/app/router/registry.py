from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, timezone
import json

from app.database import models
from app.database.database import get_db
from app.redis.cache import redis_client
from app.router.auth import get_current_user
from app.blockchain.erc8004 import (
    check_agent_reputation_async,
    CONTRACT_ADDRESS,
    _score_to_tier,
    _SIMULATION_REGISTRY,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/registry", tags=["Agent Registry"])

DEFAULT_DEMO_AGENTS = [
    {
        "agent_id": "agent_good_market_v1",
        "name": "Good Market Maker Agent",
        "owner_wallet": "0x742d35Cc6634C0532925a3b8D4C0C8b3d3b4e6d9",
        "trust_score": 95,
        "staked_balance_avax": 0.05,
        "is_registered": True,
        "is_revoked": False,
        "created_at": "2026-09-18T10:14:00Z",
        "last_active": "2026-09-24T20:30:00Z",
        "tx_hash": "0x4a7e93b1285c7d0e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
    },
    {
        "agent_id": "agent_weather_oracle_v2",
        "name": "Weather Oracle Autonomous Agent",
        "owner_wallet": "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
        "trust_score": 91,
        "staked_balance_avax": 0.02,
        "is_registered": True,
        "is_revoked": False,
        "created_at": "2026-09-19T14:22:00Z",
        "last_active": "2026-09-24T19:45:00Z",
        "tx_hash": "0x8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4a7e93b1285c7d0e4f1a",
    },
    {
        "agent_id": "agent_trading_bot_v2",
        "name": "High-Frequency Arbitrage Bot",
        "owner_wallet": "0x2953399124F0cBB46d2CbACD8A89cF0599974963",
        "trust_score": 85,
        "staked_balance_avax": 0.01,
        "is_registered": True,
        "is_revoked": False,
        "created_at": "2026-09-20T08:05:00Z",
        "last_active": "2026-09-24T18:12:00Z",
        "tx_hash": "0x1e2f3a4b5c6d7e8f9a0b1c2d3e4a7e93b1285c7d0e4f1a2b3c4d5e6f7a8b9c0d",
    },
    {
        "agent_id": "agent_sentiment_crawler_v1",
        "name": "Social Sentiment Crawler",
        "owner_wallet": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "trust_score": 72,
        "staked_balance_avax": 0.01,
        "is_registered": True,
        "is_revoked": False,
        "created_at": "2026-09-21T11:40:00Z",
        "last_active": "2026-09-24T15:20:00Z",
        "tx_hash": "0x3a4b5c6d7e8f9a0b1c2d3e4a7e93b1285c7d0e4f1a2b3c4d5e6f7a8b9c0d1e2f",
    },
    {
        "agent_id": "agent_indexer_bot_v1",
        "name": "Low-Reputation Metadata Indexer",
        "owner_wallet": "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        "trust_score": 55,
        "staked_balance_avax": 0.01,
        "is_registered": True,
        "is_revoked": False,
        "created_at": "2026-09-22T09:15:00Z",
        "last_active": "2026-09-24T12:00:00Z",
        "tx_hash": "0x5c6d7e8f9a0b1c2d3e4a7e93b1285c7d0e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
    },
    {
        "agent_id": "agent_malicious_scraper_v0",
        "name": "Revoked Scraping Bot",
        "owner_wallet": "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
        "trust_score": 10,
        "staked_balance_avax": 0.01,
        "is_registered": True,
        "is_revoked": True,
        "created_at": "2026-09-17T06:30:00Z",
        "last_active": "2026-09-23T04:10:00Z",
        "tx_hash": "0x7e8f9a0b1c2d3e4a7e93b1285c7d0e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    },
]

GLOBAL_CACHE_KEY = "registry:agents:global"


class RegisterAgentPayload(BaseModel):
    agent_id: str
    owner_wallet: str
    tx_hash: Optional[str] = None
    staked_balance_avax: Optional[float] = 0.01
    name: Optional[str] = None


@router.get("/agents")
async def list_registered_agents(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
):
    """
    List registered AI agents with on-chain ERC-8004 identity and trust scores.
    """
    agents: List[Dict[str, Any]] = []

    try:
        cached = await redis_client.get(GLOBAL_CACHE_KEY)
        if cached:
            agents = json.loads(cached)
    except Exception as e:
        logger.warning(f"Failed to read agent registry cache: {e}")

    if not agents:
        agents = list(DEFAULT_DEMO_AGENTS)
        try:
            await redis_client.setex(GLOBAL_CACHE_KEY, 86400 * 7, json.dumps(agents))
        except Exception:
            pass

    if search:
        s = search.lower().strip()
        agents = [
            a for a in agents
            if s in a["agent_id"].lower()
            or s in a.get("name", "").lower()
            or s in a.get("owner_wallet", "").lower()
        ]

    return {
        "agents": agents[:limit],
        "total": len(agents),
        "contract_address": CONTRACT_ADDRESS or "0x29243AD8082F5f0CEdCa89ED85db662975E5d96A",
        "network": "Avalanche Fuji C-Chain (43113)",
    }


@router.post("/register")
async def record_registered_agent(payload: RegisterAgentPayload):
    """
    Record an on-chain registered agent broadcasted from MetaMask.
    """
    agent_id = payload.agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="Agent ID is required")

    now_iso = datetime.now(timezone.utc).isoformat()
    new_agent = {
        "agent_id": agent_id,
        "name": payload.name or f"Agent {agent_id}",
        "owner_wallet": payload.owner_wallet,
        "trust_score": 50,  # Starting baseline trust score
        "staked_balance_avax": payload.staked_balance_avax or 0.01,
        "is_registered": True,
        "is_revoked": False,
        "created_at": now_iso,
        "last_active": now_iso,
        "tx_hash": payload.tx_hash,
    }

    # Prepend to global cache
    try:
        cached = await redis_client.get(GLOBAL_CACHE_KEY)
        agents = json.loads(cached) if cached else list(DEFAULT_DEMO_AGENTS)
        # Avoid duplicate entries
        agents = [a for a in agents if a["agent_id"].lower() != agent_id.lower()]
        agents.insert(0, new_agent)
        await redis_client.setex(GLOBAL_CACHE_KEY, 86400 * 7, json.dumps(agents))

        # Also cache individual reputation lookup
        cache_key = f"agent:reputation:{agent_id.lower()}"
        reputation_data = {
            "is_trusted": True,
            "score": 50,
            "tier": "low_reputation",
            "agent_id": agent_id,
            "owner_wallet": payload.owner_wallet,
            "staked_balance_avax": payload.staked_balance_avax or 0.01,
            "is_registered": True,
            "is_revoked": False,
            "description": f"Registered on-chain on Avalanche Fuji: 50/100",
            "source": "on_chain",
        }
        await redis_client.setex(cache_key, 3600, json.dumps(reputation_data))
    except Exception as e:
        logger.error(f"Failed to save registered agent to Redis: {e}")

    return {
        "success": True,
        "agent": new_agent,
        "message": f"Agent '{agent_id}' recorded successfully in registry",
    }


@router.get("/agent/{agent_id}")
async def get_agent_score(agent_id: str):
    """
    Look up a specific agent's on-chain ERC-8004 reputation and registration status.
    """
    agent_id = agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="Agent ID cannot be empty")

    reputation = await check_agent_reputation_async(agent_id)
    score = reputation.get("score", 0)
    tier = reputation.get("tier") or _score_to_tier(score)
    is_trusted = reputation.get("is_trusted", False)
    is_registered = reputation.get("is_registered", score > 0)
    is_revoked = reputation.get("is_revoked", False)
    owner_wallet = reputation.get("owner_wallet")
    staked_balance = reputation.get("staked_balance_avax", 0.01 if is_registered else 0.0)

    # Check if agent exists in cached list for custom names / tx_hashes
    try:
        cached = await redis_client.get(GLOBAL_CACHE_KEY)
        if cached:
            agents_list = json.loads(cached)
            for a in agents_list:
                if a["agent_id"].lower() == agent_id.lower():
                    return {
                        **a,
                        "trust_score": score if reputation.get("source") == "on_chain" else a.get("trust_score", score),
                        "tier": tier,
                        "is_trusted": is_trusted,
                        "is_registered": a.get("is_registered", is_registered),
                        "is_revoked": a.get("is_revoked", is_revoked),
                        "owner_wallet": a.get("owner_wallet") or owner_wallet,
                        "staked_balance_avax": a.get("staked_balance_avax") or staked_balance,
                        "lookup_source": reputation.get("source", "simulation"),
                    }
    except Exception:
        pass

    return {
        "agent_id": agent_id,
        "name": f"Agent {agent_id}",
        "owner_wallet": owner_wallet or ("0x" + "0" * 40),
        "trust_score": score,
        "tier": tier,
        "staked_balance_avax": staked_balance,
        "is_registered": is_registered,
        "is_revoked": is_revoked,
        "is_trusted": is_trusted,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_active": datetime.now(timezone.utc).isoformat(),
        "lookup_source": reputation.get("source", "simulation"),
        "explorer_url": f"https://testnet.snowtrace.io/address/{CONTRACT_ADDRESS or '0x29243AD8082F5f0CEdCa89ED85db662975E5d96A'}",
    }


@router.post("/demo-seed")
async def seed_demo_agents():
    """
    Seed realistic registered agent records into Redis for testing the Registry UI.
    """
    try:
        await redis_client.setex(GLOBAL_CACHE_KEY, 86400 * 7, json.dumps(DEFAULT_DEMO_AGENTS))
    except Exception as e:
        logger.error(f"Failed to seed demo agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to write demo agents to cache")

    return {
        "success": True,
        "seeded_count": len(DEFAULT_DEMO_AGENTS),
        "message": f"Seeded {len(DEFAULT_DEMO_AGENTS)} registered agents successfully",
    }
