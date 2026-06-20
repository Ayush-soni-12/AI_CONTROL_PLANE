"""
erc8004.py — ERC-8004 Agent Identity & Reputation Checker
==========================================================

Fetches AI agent reputation scores from the ERC8004Registry smart contract
deployed on Avalanche Fuji C-Chain Testnet.

CONTRACT: ERC8004Registry.sol
NETWORK:  Avalanche Fuji C-Chain (chainId: 43113)
RPC:      https://api.avax-test.network/ext/bc/C/rpc

HOW IT WORKS:
    1. Agent sends request with header: x-agent-id: agent_good_market_v1
    2. NeuralControl calls: registry.getScore("agent_good_market_v1")
    3. Contract returns the score stored on-chain (0-100)
    4. If score >= 60 → offer x402 payment bypass
    5. If score < 60  → hard block with 429

SCORE TIERS:
    0  - 29  : Unknown / Blacklisted → BLOCK
    30 - 59  : Low reputation        → BLOCK
    60 - 84  : Trusted               → OFFER x402 payment
    85 - 100 : Verified / Premium    → OFFER x402 payment
"""

import os
import logging
from typing import Optional
from web3 import Web3

logger = logging.getLogger(__name__)

# ── Avalanche Fuji RPC ────────────────────────────────────────────────────────
FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"
w3 = Web3(Web3.HTTPProvider(FUJI_RPC))

# ── Deployed contract address ─────────────────────────────────────────────────
# Set this in your environment after deploying ERC8004Registry.sol on Fuji.
# Example: ERC8004_CONTRACT_ADDRESS=0xABC123...
CONTRACT_ADDRESS = os.environ.get("ERC8004_CONTRACT_ADDRESS", "")

# ── Minimal ABI — only the functions NeuralControl needs ─────────────────────
CONTRACT_ABI = [
    {
        "inputs": [{"internalType": "string", "name": "agentId", "type": "string"}],
        "name": "getScore",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "agentId", "type": "string"}],
        "name": "isRegistered",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "agentId", "type": "string"}],
        "name": "getAgentInfo",
        "outputs": [
            {"internalType": "uint256", "name": "score", "type": "uint256"},
            {"internalType": "bool",    "name": "registered", "type": "bool"},
            {"internalType": "bool",    "name": "trusted", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

# ── Score threshold for payment eligibility ────────────────────────────────────
TRUSTED_SCORE_THRESHOLD = 60

# ── Contract instance (created once at startup) ────────────────────────────────
_contract = None

def _get_contract():
    """
    Lazily initialize the contract instance.
    Returns None if contract address is not configured.
    """
    global _contract
    if _contract is not None:
        return _contract
    if not CONTRACT_ADDRESS:
        logger.warning(
            "⚠️  ERC8004_CONTRACT_ADDRESS not set — falling back to simulation mode."
        )
        return None
    try:
        checksum_addr = Web3.to_checksum_address(CONTRACT_ADDRESS)
        _contract = w3.eth.contract(address=checksum_addr, abi=CONTRACT_ABI)
        logger.info(f"✅ ERC8004Registry contract connected at {CONTRACT_ADDRESS}")
        return _contract
    except Exception as e:
        logger.error(f"❌ Failed to connect ERC8004 contract: {e}")
        return None


def _score_to_tier(score: int) -> str:
    """Map a numeric score to a human-readable tier name."""
    if score >= 85:
        return "verified"
    elif score >= 60:
        return "trusted"
    elif score >= 30:
        return "low_reputation"
    elif score > 0:
        return "suspicious"
    else:
        return "blacklisted"


def check_agent_reputation(agent_id: Optional[str]) -> dict:
    """
    Look up an agent's ERC-8004 reputation score.

    Tries the on-chain registry first. If the contract is not configured
    or the network is unreachable, falls back to the simulation mode
    so the system keeps working even during network issues.

    Parameters
    ----------
    agent_id : str or None
        The agent's identifier from the 'x-agent-id' HTTP header.

    Returns
    -------
    dict with keys:
        - is_trusted (bool)  : Can this agent be offered payment?
        - score (int)        : 0-100 reputation score
        - tier (str)         : 'verified' | 'trusted' | 'low_reputation' | etc.
        - agent_id (str)     : The agent_id that was looked up
        - description (str)  : Human-readable explanation
        - source (str)       : 'on_chain' | 'simulation' | 'no_id'
    """

    # ── No agent ID provided ────────────────────────────────────────────────
    if not agent_id:
        return {
            "is_trusted": False,
            "score": 0,
            "tier": "unregistered",
            "agent_id": None,
            "description": "No agent ID provided. Regular 429 applies.",
            "source": "no_id",
        }

    # ── Try on-chain lookup ─────────────────────────────────────────────────
    contract = _get_contract()
    if contract and w3.is_connected():
        try:
            # Single call — returns (score, registered, trusted)
            score, registered, trusted = contract.functions.getAgentInfo(agent_id).call()
            score = int(score)

            if not registered:
                logger.info(f"🔍 Agent '{agent_id}' not found in on-chain registry")
                return {
                    "is_trusted": False,
                    "score": 0,
                    "tier": "unregistered",
                    "agent_id": agent_id,
                    "description": (
                        f"Agent '{agent_id}' is not registered in the ERC-8004 "
                        f"registry at {CONTRACT_ADDRESS}. "
                        "Register your agent to unlock agentic payment access."
                    ),
                    "source": "on_chain",
                }

            tier = _score_to_tier(score)
            is_trusted = score >= TRUSTED_SCORE_THRESHOLD

            logger.info(
                f"{'✅' if is_trusted else '🚫'} On-chain ERC-8004 lookup: "
                f"agent='{agent_id}' score={score} tier={tier}"
            )

            return {
                "is_trusted": is_trusted,
                "score": score,
                "tier": tier,
                "agent_id": agent_id,
                "description": f"On-chain ERC-8004 score: {score}/100 (tier: {tier})",
                "source": "on_chain",
            }

        except Exception as e:
            logger.warning(
                f"⚠️  On-chain lookup failed for '{agent_id}': {e}. "
                "Falling back to simulation."
            )
            # Fall through to simulation below

    # ── Fallback: Simulation mode ───────────────────────────────────────────
    # Used when:
    #   - ERC8004_CONTRACT_ADDRESS is not set in .env
    #   - Fuji RPC is temporarily unreachable
    # This ensures the system keeps working during network issues.
    logger.info(f"🔄 Using simulation mode for agent '{agent_id}'")

    _SIMULATION_REGISTRY = {
        "agent_good_": {"score": 95, "tier": "verified"},
        "agent_trusted_": {"score": 75, "tier": "trusted"},
        "agent_": {"score": 62, "tier": "trusted"},
        "bot_": {"score": 5,  "tier": "suspicious"},
        "ddos_": {"score": 0,  "tier": "blacklisted"},
    }

    reputation = None
    for prefix in sorted(_SIMULATION_REGISTRY.keys(), key=len, reverse=True):
        if agent_id.startswith(prefix):
            reputation = _SIMULATION_REGISTRY[prefix]
            break

    if reputation is None:
        return {
            "is_trusted": False,
            "score": 0,
            "tier": "unregistered",
            "agent_id": agent_id,
            "description": f"Agent '{agent_id}' not found in registry.",
            "source": "simulation",
        }

    score = reputation["score"]
    return {
        "is_trusted": score >= TRUSTED_SCORE_THRESHOLD,
        "score": score,
        "tier": reputation["tier"],
        "agent_id": agent_id,
        "description": f"Simulated ERC-8004 score: {score}/100",
        "source": "simulation",
    }


def format_reputation_for_response(reputation: dict) -> dict:
    """Return only the fields we want to expose in the HTTP response."""
    return {
        "agent_id":    reputation["agent_id"],
        "score":       reputation["score"],
        "tier":        reputation["tier"],
        "description": reputation["description"],
        "source":      reputation.get("source", "unknown"),
    }
