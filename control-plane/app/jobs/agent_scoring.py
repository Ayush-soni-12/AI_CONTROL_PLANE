import json
import logging
import os
import asyncio
from typing import Optional, Tuple
from web3 import Web3
from datetime import datetime, timedelta, timezone
from eth_account import Account
from sqlalchemy import select, func

from app.database.database import AsyncSessionLocal
from app.database.models import AgentPayment, Signal, RegisteredAgent
from app.redis.cache import redis_client
from app.blockchain.erc8004 import _score_to_tier
from app.config import settings

logger = logging.getLogger(__name__)

# Blockchain configuration
FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"
w3 = Web3(Web3.HTTPProvider(FUJI_RPC))

CONTRACT_ADDRESS = settings.ERC8004_CONTRACT_ADDRESS or ""
ADMIN_PRIVATE_KEY = settings.NEURALCONTROL_ADMIN_PRIVATE_KEY or ""

# ABI supporting both read (getAgent) and write (updateTrustScore)
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "agentId", "type": "string"}],
        "name": "getAgent",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "ownerWallet", "type": "address"},
                    {"internalType": "uint256", "name": "trustScore", "type": "uint256"},
                    {"internalType": "uint256", "name": "balance", "type": "uint256"},
                    {"internalType": "bool", "name": "isRegistered", "type": "bool"},
                    {"internalType": "bool", "name": "isRevoked", "type": "bool"}
                ],
                "internalType": "struct AgentRegistry.Agent",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "agentId", "type": "string"},
            {"internalType": "uint256", "name": "newScore", "type": "uint256"}
        ],
        "name": "updateTrustScore",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


def calculate_new_score(current_score: int, stats: dict) -> int:
    """
    The Core Scoring Engine for NeuralControl Agents.
    Calculates the new Trust Score based on recent behavior.
    """
    new_score = current_score
    
    # 1. Success boost
    if stats.get("success_count", 0) > 100:
        new_score += 2
        
    # 2. Rate limit penalty (excessive calls without paying)
    rate_limits = stats.get("rate_limit_count", 0)
    if rate_limits > 50:
        new_score -= (rate_limits // 25)
        
    # 3. Severe error penalty (triggering 5xx server errors)
    errors = stats.get("error_count", 0)
    if errors > 10:
        new_score -= (errors * 2)
        
    # 4. Payment boost (proven financial backing and settled x402 invoices)
    payments = stats.get("payments_made", 0)
    if payments > 0:
        new_score += (payments * 5)

    # Clamp the score between 0 and 100
    return max(0, min(100, new_score))


def _fetch_on_chain_agent(agent_id: str):
    """
    Helper function to query getAgent from the on chain contract synchronously.
    Intended to be run via asyncio.to_thread with a timeout guard.
    """
    if not CONTRACT_ADDRESS:
        return None
    try:
        checksum_addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
        contract = w3.eth.contract(address=checksum_addr, abi=CONTRACT_ABI)
        return contract.functions.getAgent(agent_id).call()
    except Exception as e:
        logger.warning(f"On chain getAgent call failed for {agent_id}: {e}")
        return None


async def get_agent_baseline_score(
    agent_id: str,
    db_agent: Optional[RegisteredAgent] = None
) -> Tuple[int, str]:
    """
    Resolve the baseline trust score using the source of truth hierarchy:
    1. Avalanche Fuji smart contract (getAgent)
    2. PostgreSQL RegisteredAgent row (trust_score)
    3. Canonical Redis cache key (nc:agent:reputation:{agent_id})
    4. Default fallback of 50
    """
    # 1. Check Avalanche Fuji blockchain first
    if CONTRACT_ADDRESS:
        try:
            agent_data = await asyncio.wait_for(
                asyncio.to_thread(_fetch_on_chain_agent, agent_id),
                timeout=3.0
            )
            if agent_data:
                owner_wallet, score_raw, balance, is_registered, is_revoked = agent_data
                score_val = int(score_raw)
                if is_registered and not is_revoked and score_val > 0:
                    return score_val, "on_chain"
        except asyncio.TimeoutError:
            logger.warning(f"On chain getAgent timed out after 3s for {agent_id}")
        except Exception as e:
            logger.warning(f"On chain baseline check error for {agent_id}: {e}")

    # 2. Check PostgreSQL RegisteredAgent table
    if db_agent is not None and db_agent.trust_score is not None:
        return int(db_agent.trust_score), "postgres"

    # 3. Check canonical Redis cache
    cache_key = f"nc:agent:reputation:{agent_id.lower()}"
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            cached_data = json.loads(cached)
            score = cached_data.get("trust_score")
            if score is None:
                score = cached_data.get("score")
            if score is not None:
                return int(score), "redis"
    except Exception as e:
        logger.warning(f"Redis cache check failed for {agent_id}: {e}")

    # 4. Default baseline fallback
    return 50, "default"


async def update_score_on_chain(agent_id: str, new_score: int) -> bool:
    """
    Signs a transaction with the NeuralControl Admin Wallet 
    and pushes the new Trust Score to the Avalanche blockchain.
    """
    if not CONTRACT_ADDRESS or not ADMIN_PRIVATE_KEY:
        logger.warning(f"[Simulation] Would update {agent_id} to {new_score} on-chain, but missing ENV vars.")
        return False

    try:
        account = Account.from_key(ADMIN_PRIVATE_KEY)
        contract = w3.eth.contract(address=Web3.to_checksum_address(CONTRACT_ADDRESS), abi=CONTRACT_ABI)
        
        def _build_and_send():
            nonce = w3.eth.get_transaction_count(account.address)
            tx = contract.functions.updateTrustScore(agent_id, new_score).build_transaction({
                'chainId': 43113,
                'gas': 200000,
                'maxFeePerGas': w3.to_wei('25', 'gwei'),
                'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
                'nonce': nonce,
            })
            signed_tx = w3.eth.account.sign_transaction(tx, private_key=ADMIN_PRIVATE_KEY)
            return w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        tx_hash = await asyncio.wait_for(
            asyncio.to_thread(_build_and_send),
            timeout=10.0
        )
        logger.info(f"Successfully updated {agent_id} to score {new_score}. Tx Hash: {tx_hash.hex()}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to push score to blockchain for {agent_id}: {e}")
        return False


async def run_scoring_job():
    """
    Hourly dynamic trust scoring job.
    Evaluates active registered agents from PostgreSQL, calculates scores
    based on 24 hour telemetry, and synchronizes updates across PostgreSQL,
    Redis, and Avalanche Fuji.
    """
    logger.info("Starting Dynamic Trust Scoring Job (Real Telemetry)...")
    
    async with AsyncSessionLocal() as db:
        # 1. Scope to active registered agents in PostgreSQL
        result = await db.execute(
            select(RegisteredAgent).where(
                RegisteredAgent.is_registered == True,
                RegisteredAgent.is_revoked == False
            )
        )
        registered_agents = result.scalars().all()
        
        if not registered_agents:
            logger.info("No active registered agents found in database.")
            return

        yesterday = datetime.now(timezone.utc) - timedelta(days=1)

        for agent in registered_agents:
            agent_id = agent.agent_id
            if not agent_id:
                continue
            
            logger.info(f"Analyzing telemetry for registered agent: {agent_id}")
            
            # Fetch verified and consumed payments in the last 24 hours
            payments_query = await db.execute(
                select(func.count()).where(
                    AgentPayment.agent_id == agent_id, 
                    AgentPayment.status.in_(['verified', 'consumed']),
                    AgentPayment.created_at >= yesterday
                )
            )
            payments_made = payments_query.scalar() or 0
            
            # Fetch rate limit actions in the last 24 hours
            rate_limits_query = await db.execute(
                select(func.count()).where(
                    Signal.customer_identifier == agent_id, 
                    Signal.action_taken == 'rate_limited',
                    Signal.timestamp >= yesterday
                )
            )
            rate_limit_count = rate_limits_query.scalar() or 0
            
            # Fetch server errors in the last 24 hours
            errors_query = await db.execute(
                select(func.count()).where(
                    Signal.customer_identifier == agent_id, 
                    Signal.status == 'error',
                    Signal.timestamp >= yesterday
                )
            )
            error_count = errors_query.scalar() or 0
            
            # Fetch successful requests in the last 24 hours
            success_query = await db.execute(
                select(func.count()).where(
                    Signal.customer_identifier == agent_id, 
                    Signal.status == 'success',
                    Signal.timestamp >= yesterday
                )
            )
            success_count = success_query.scalar() or 0
            
            stats = {
                "success_count": success_count,
                "rate_limit_count": rate_limit_count,
                "error_count": error_count,
                "payments_made": payments_made
            }
            
            # 2. Fetch baseline score from source of truth hierarchy
            current_score, source = await get_agent_baseline_score(agent_id, db_agent=agent)
            logger.info(f"Agent '{agent_id}' baseline score is {current_score} (source: {source})")
            
            # 3. Calculate new score based on telemetry
            new_score = calculate_new_score(current_score, stats)
            logger.info(f"Agent: {agent_id} | Old Score: {current_score} | New Score: {new_score}")
            
            # 4. Tri store synchronization when score changes
            if new_score != current_score:
                logger.info(f"Score changed for {agent_id}: {current_score} -> {new_score}. Synchronizing tri store...")
                
                # A. Update PostgreSQL
                agent.trust_score = new_score
                agent.updated_at = datetime.now(timezone.utc)
                await db.commit()
                
                # B. Update Blockchain (Avalanche Fuji)
                on_chain_success = await update_score_on_chain(agent_id, new_score)
                
                # C. Warm Canonical Redis Cache
                reputation_payload = {
                    "is_trusted": new_score >= 30,
                    "score": new_score,
                    "trust_score": new_score,
                    "tier": _score_to_tier(new_score),
                    "agent_id": agent.agent_id,
                    "owner_wallet": agent.owner_wallet,
                    "staked_balance_avax": agent.staked_balance_avax,
                    "is_registered": agent.is_registered,
                    "is_revoked": agent.is_revoked,
                    "lookup_source": "on_chain" if on_chain_success else "postgres",
                }
                try:
                    await redis_client.setex(
                        f"nc:agent:reputation:{agent.agent_id.lower()}",
                        3600,
                        json.dumps(reputation_payload)
                    )
                except Exception as e:
                    logger.warning(f"Failed to update Redis cache for {agent_id}: {e}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_scoring_job())
