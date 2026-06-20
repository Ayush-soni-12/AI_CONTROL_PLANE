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

logger = logging.getLogger(__name__)

# ─── Avalanche Fuji C-Chain RPC endpoint ─────────────────────────────────────
# This is a free, public RPC node provided by Avalanche. No API key needed.
# C-Chain = "Contract Chain" — the EVM-compatible chain where payments happen.
FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc"

# Create the Web3 connection to Fuji. This is like opening a phone line to
# the blockchain. It is lazy — no actual network call happens until we use it.
w3 = Web3(Web3.HTTPProvider(FUJI_RPC_URL))


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
) -> dict:
    """
    Verify that a payment transaction on Avalanche Fuji is valid.

    Parameters
    ----------
    tx_hash : str
        The 0x-prefixed transaction hash the agent provided after paying.
        e.g. "0xabc123..."

    expected_recipient : str
        The customer's Avalanche wallet address that SHOULD have received
        the payment. e.g. "0xCustomerWallet..."

    min_amount_wei : int
        The minimum amount (in wei) that must have been sent.
        1 AVAX = 1_000_000_000_000_000_000 wei (18 zeros).
        Example: 0.1 AVAX = 100_000_000_000_000_000 wei.

    Returns
    -------
    dict with keys:
        - verified (bool): True only if ALL three checks pass.
        - reason (str): Human-readable explanation of what passed/failed.
        - amount_avax (float): How much AVAX was actually sent.
        - from_address (str): The agent's wallet address.
    """

    # ── Step 1: Check our connection to the blockchain ────────────────────────
    if not is_connected():
        logger.error("❌ Cannot connect to Avalanche Fuji RPC")
        return {
            "verified": False,
            "reason": "Cannot connect to Avalanche network. Try again shortly.",
            "amount_avax": 0,
            "from_address": None,
        }

    try:
        # ── Step 2: Fetch the transaction from the blockchain ─────────────────
        # This looks up the tx_hash and returns its details.
        # If the hash doesn't exist, it raises an exception.
        tx = w3.eth.get_transaction(tx_hash)

        if tx is None:
            return {
                "verified": False,
                "reason": "Transaction not found on Fuji testnet. It may still be pending.",
                "amount_avax": 0,
                "from_address": None,
            }

        # ── Step 3: Fetch the receipt (proof it was confirmed) ────────────────
        # A transaction can exist but still be PENDING (not yet included in a block).
        # The receipt only exists AFTER the transaction is confirmed.
        # receipt.status == 1 means SUCCESS. status == 0 means REVERTED (failed).
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

        # ── Step 4: Check the recipient is the customer's wallet ──────────────
        # tx['to'] is who received the money.
        # We compare in lowercase because Ethereum addresses are case-insensitive.
        actual_recipient = tx["to"]
        if actual_recipient.lower() != expected_recipient.lower():
            return {
                "verified": False,
                "reason": (
                    f"Payment went to wrong wallet. "
                    f"Expected {expected_recipient}, got {actual_recipient}."
                ),
                "amount_avax": 0,
                "from_address": str(tx["from"]),
            }

        # ── Step 5: Check the amount is enough ───────────────────────────────
        # tx['value'] is the amount in wei (the smallest unit of AVAX).
        actual_value_wei = tx["value"]
        amount_avax = float(Web3.from_wei(actual_value_wei, "ether"))

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

        # ── All checks passed! ────────────────────────────────────────────────
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


def get_fuji_balance(wallet_address: str) -> float:
    """
    Utility: Get the AVAX balance of any wallet on Fuji testnet.
    Returns the balance in AVAX (not wei). Used for debugging.

    Example: get_fuji_balance("0x1234...") → 2.5  (means 2.5 AVAX)
    """
    try:
        balance_wei = w3.eth.get_balance(wallet_address)
        return float(Web3.from_wei(balance_wei, "ether"))
    except Exception as e:
        logger.error(f"Could not fetch balance for {wallet_address}: {e}")
        return 0.0
