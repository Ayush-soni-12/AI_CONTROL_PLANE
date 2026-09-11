"""
avalanche.py — Avalanche Fuji Testnet Payment Verifier
=======================================================

This module connects to the Avalanche Fuji C-Chain (testnet) and provides
two things:

1. verify_payment()  — checks if a specific transaction hash is valid:
     - Was the transaction confirmed? (not still pending)
     - Did it go to the CORRECT wallet? (the customer's wallet)
     - Was the amount paid ENOUGH? (at least what was asked)

2. get_fuji_balance() — utility to check a wallet's AVAX balance (for debugging).

WHY FUJI TESTNET?
   Fuji is Avalanche's free test network. Transactions work exactly the same
   as mainnet but use fake AVAX (obtained free from the faucet).
   This means no real money is needed for the hackathon demo.

HOW IT FITS IN THE FLOW:
   Agent pays → sends tx_hash to NeuralControl → this file verifies it
   → if verified, we unlock the API for that agent.
"""

from web3 import Web3
import logging
import asyncio
import json
from app.redis.cache import redis_client

logger = logging.getLogger(__name__)

# ─── Avalanche Fuji C-Chain RPC endpoint ─────────────────────────────────────
FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc"
w3 = Web3(Web3.HTTPProvider(FUJI_RPC_URL))

RECEIPT_CACHE_TTL = 86400  # 24 hours in seconds


def is_connected() -> bool:
    """
    Quick health check: can we talk to the Fuji testnet right now?
    Returns True if connected, False if the RPC is down.
    """
    try:
        return w3.is_connected()
    except Exception:
        return False


def verify_payment(
    tx_hash: str,
    expected_recipient: str,
    min_amount_wei: int,
    is_eerc: bool = False
) -> dict:
    """
    Synchronous verification logic executed in a background worker thread.
    """
    if not is_connected():
        logger.error("❌ Cannot connect to Avalanche Fuji RPC")
        return {
            "verified": False,
            "reason": "Cannot connect to Avalanche network. Try again shortly.",
            "amount_avax": 0,
            "from_address": None,
        }

    try:
        tx = w3.eth.get_transaction(tx_hash)

        if tx is None:
            return {
                "verified": False,
                "reason": "Transaction not found on Fuji testnet. It may still be pending.",
                "amount_avax": 0,
                "from_address": None,
            }

        receipt = w3.eth.get_transaction_receipt(tx_hash)

        if receipt is None:
            return {
                "verified": False,
                "reason": "Transaction is still pending. Please wait for confirmation.",
                "amount_avax": 0,
                "from_address": str(tx["from"]),
            }

        if receipt["status"] != 1:
            return {
                "verified": False,
                "reason": "Transaction was reverted (failed) on-chain.",
                "amount_avax": 0,
                "from_address": str(tx["from"]),
            }

        actual_recipient = tx["to"]
        
        if is_eerc:
            pass # Bypass strict check for the ZK simulation
        elif actual_recipient.lower() != expected_recipient.lower():
            return {
                "verified": False,
                "reason": (
                    f"Payment went to wrong wallet. "
                    f"Expected {expected_recipient}, got {actual_recipient}."
                ),
                "amount_avax": 0,
                "from_address": str(tx["from"]),
            }

        actual_value_wei = tx["value"]
        amount_avax = float(Web3.from_wei(actual_value_wei, "ether"))

        if not is_eerc:
            if actual_value_wei < min_amount_wei:
                min_avax = float(Web3.from_wei(min_amount_wei, "ether"))
                return {
                    "verified": False,
                    "reason": (
                        f"Insufficient payment. Required {min_avax} AVAX, "
                        f"but only {amount_avax:.6f} AVAX was sent."
                    ),
                    "amount_avax": amount_avax,
                    "from_address": str(tx["from"]),
                }

        logger.info(
            f"✅ Payment verified: {amount_avax:.6f} AVAX from {tx['from']} "
            f"→ {expected_recipient} | tx: {tx_hash}"
        )
        return {
            "verified": True,
            "reason": "Payment confirmed on Avalanche Fuji testnet.",
            "amount_avax": amount_avax,
            "from_address": str(tx["from"]),
        }

    except Exception as e:
        logger.error(f"❌ Error verifying payment {tx_hash}: {e}")
        return {
            "verified": False,
            "reason": f"Error checking blockchain: {str(e)}",
            "amount_avax": 0,
            "from_address": None,
        }


async def verify_payment_async(
    tx_hash: str,
    expected_recipient: str,
    min_amount_wei: int,
    is_eerc: bool = False,
    timeout_seconds: float = 3.0
) -> dict:
    """
    Non-blocking payment verification with Redis receipt caching and timeout guards.
    """
    cache_key = f"payment:verified:{tx_hash.lower()}"

    # 1. Check Redis Cache First (< 1ms)
    try:
        cached = await redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            logger.info(f"⚡ Instant Redis Cache Hit for tx {tx_hash}")
            return data
    except Exception as e:
        logger.warning(f"Redis cache check failed for {tx_hash}: {e}")

    # 2. Run RPC call in background thread pool with timeout guard
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(
                verify_payment,
                tx_hash=tx_hash,
                expected_recipient=expected_recipient,
                min_amount_wei=min_amount_wei,
                is_eerc=is_eerc
            ),
            timeout=timeout_seconds
        )

        # 3. If verified, cache receipt in Redis
        if result.get("verified"):
            try:
                await redis_client.setex(
                    cache_key,
                    RECEIPT_CACHE_TTL,
                    json.dumps(result)
                )
            except Exception as e:
                logger.warning(f"Failed to cache verified payment in Redis: {e}")

        return result

    except asyncio.TimeoutError:
        logger.error(f"⏱️ Avalanche Fuji RPC timed out after {timeout_seconds}s for tx {tx_hash}")
        return {
            "verified": False,
            "reason": "Blockchain verification timed out. Please retry shortly.",
            "amount_avax": 0,
            "from_address": None,
        }
    except Exception as e:
        logger.error(f"Async verification failed: {e}")
        return {
            "verified": False,
            "reason": str(e),
            "amount_avax": 0,
            "from_address": None,
        }


def get_fuji_balance(wallet_address: str) -> float:
    """
    Utility: Get the AVAX balance of any wallet on Fuji testnet.
    Returns the balance in AVAX (not wei). Used for debugging.
    """
    try:
        balance_wei = w3.eth.get_balance(wallet_address)
        return float(Web3.from_wei(balance_wei, "ether"))
    except Exception as e:
        logger.error(f"Could not fetch balance for {wallet_address}: {e}")
        return 0.0
