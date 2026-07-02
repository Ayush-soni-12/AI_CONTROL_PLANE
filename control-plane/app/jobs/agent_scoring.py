import logging
import os
import asyncio
from web3 import Web3
from datetime import datetime, timedelta
from eth_account import Account
from sqlalchemy import select, func

from app.database.database import AsyncSessionLocal
from app.database.models import AgentPayment, Signal

logger = logging.getLogger(__name__)

# ── Blockchain Configuration ──────────────────────────────────────────────────
FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"
w3 = Web3(Web3.HTTPProvider(FUJI_RPC))

from app.config import settings

CONTRACT_ADDRESS = settings.ERC8004_CONTRACT_ADDRESS or ""
ADMIN_PRIVATE_KEY = settings.NEURALCONTROL_ADMIN_PRIVATE_KEY or ""

# The ABI needs ONLY the updateTrustScore function since this is the "Write" layer
CONTRACT_ABI = [
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
    
    # 1. Success Boost
    if stats.get("success_count", 0) > 100:
        new_score += 2
        
    # 2. Rate Limit Penalty (Spamming without paying)
    rate_limits = stats.get("rate_limit_count", 0)
    if rate_limits > 50:
        new_score -= (rate_limits // 25) # -1 point for every 25 rate limits hit
        
    # 3. Severe Error Penalty (Sending bad data / crashing servers)
    errors = stats.get("error_count", 0)
    if errors > 10:
        new_score -= (errors * 2) # Heavy penalty: -2 points per error
        
    # 4. Payment Boost (Proven financial backing)
    payments = stats.get("payments_made", 0)
    if payments > 0:
        new_score += (payments * 5) # Massive boost for actually paying invoices

    # Clamp the score between 0 and 100
    return max(0, min(100, new_score))


async def update_score_on_chain(agent_id: str, new_score: int):
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
        
        # Build the transaction
        nonce = w3.eth.get_transaction_count(account.address)
        tx = contract.functions.updateTrustScore(agent_id, new_score).build_transaction({
            'chainId': 43113, # Fuji Testnet
            'gas': 200000,
            'maxFeePerGas': w3.to_wei('25', 'gwei'),
            'maxPriorityFeePerGas': w3.to_wei('2', 'gwei'),
            'nonce': nonce,
        })
        
        # Sign the transaction
        signed_tx = w3.eth.account.sign_transaction(tx, private_key=ADMIN_PRIVATE_KEY)
        
        # Send to the blockchain
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        logger.info(f"✅ Successfully updated {agent_id} to score {new_score}. Tx Hash: {tx_hash.hex()}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to push score to blockchain for {agent_id}: {e}")
        return False


async def run_scoring_job():
    """
    This is the Cron Job that runs every hour.
    It fetches agent stats, calculates the new score, and updates the blockchain.
    """
    logger.info("🚀 Starting Dynamic Trust Scoring Job (Real Telemetry)...")
    
    async with AsyncSessionLocal() as db:
        # 1. Get all unique agents that have interacted with the system in the last 24 hours
        yesterday = datetime.utcnow() - timedelta(days=1)
        
        # Agents from payments
        payment_agents = await db.execute(
            select(AgentPayment.agent_id).where(AgentPayment.created_at >= yesterday).distinct()
        )
        # Agents from signals (customer_identifier)
        signal_agents = await db.execute(
            select(Signal.customer_identifier)
            .where(Signal.is_agent == True)
            .where(Signal.timestamp >= yesterday)
            .distinct()
        )
        
        all_agents = set([row[0] for row in payment_agents.all()] + [row[0] for row in signal_agents.all()])
        
        if not all_agents:
            logger.info("No active agents found in the last 24 hours.")
            return

        for agent_id in all_agents:
            if not agent_id: continue
            
            logger.info(f"📊 Analyzing telemetry for agent: {agent_id}")
            
            # Fetch Payments (count both currently verified rate limits AND consumed pay-per-requests)
            payments_query = await db.execute(
                select(func.count()).where(
                    AgentPayment.agent_id == agent_id, 
                    AgentPayment.status.in_(['verified', 'consumed'])
                )
            )
            payments_made = payments_query.scalar() or 0
            
            # Fetch Rate Limits
            rate_limits_query = await db.execute(
                select(func.count()).where(Signal.customer_identifier == agent_id, Signal.action_taken == 'rate_limited')
            )
            rate_limit_count = rate_limits_query.scalar() or 0
            
            # Fetch Server Errors
            errors_query = await db.execute(
                select(func.count()).where(Signal.customer_identifier == agent_id, Signal.status == 'error')
            )
            error_count = errors_query.scalar() or 0
            
            # Fetch Successes
            success_query = await db.execute(
                select(func.count()).where(Signal.customer_identifier == agent_id, Signal.status == 'success')
            )
            success_count = success_query.scalar() or 0
            
            stats = {
                "success_count": success_count,
                "rate_limit_count": rate_limit_count,
                "error_count": error_count,
                "payments_made": payments_made
            }
            
            # We assume a base score of 50 for this calculation
            # In a real app, we'd fetch the current score from the blockchain first
            current_score = 50 
            
            # 1. Calculate the new score using the algorithm
            new_score = calculate_new_score(current_score, stats)
            
            logger.info(f"Agent: {agent_id} | Old Score: {current_score} | New Score: {new_score}")
            
            # 2. Push to the blockchain if the score changed
            if new_score != current_score:
                await update_score_on_chain(agent_id, new_score)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_scoring_job())
