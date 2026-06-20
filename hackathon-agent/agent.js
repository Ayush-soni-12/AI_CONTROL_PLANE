/**
 * hackathon-agent/agent.js
 * ========================
 * Autonomous AI Agent — NeuralControl x402 Agentic Payments Demo
 *
 * WHAT THIS SCRIPT DEMONSTRATES:
 *   An AI agent that operates completely autonomously, without any human
 *   clicking "approve" or "confirm". When it hits a rate limit, it:
 *     1. Receives a 402 Payment Required invoice (x402 protocol)
 *     2. Checks its own ERC-8004 reputation score in the response
 *     3. Autonomously sends AVAX on Avalanche Fuji Testnet
 *     4. Submits proof of payment to NeuralControl for verification
 *     5. Continues fetching data — no human intervention at any step
 *
 * HOW TO SET UP:
 *   1. Install: npm install
 *   2. Create a Fuji testnet wallet (MetaMask → switch to Fuji network)
 *   3. Get free test AVAX from: https://faucet.avax.network
 *   4. Copy your wallet private key into .env:
 *        AGENT_PRIVATE_KEY=0xyour_private_key_here
 *   5. Make sure control plane + demo-service are running
 *   6. Run: node agent.js
 *
 * TWO MODES (controlled by command line argument):
 *   node agent.js          → Trusted agent (agent_good_*) — gets 402 payment offer
 *   node agent.js --bad    → Untrusted agent (bad_bot_*)  — gets hard 429 block
 *
 * NETWORK:
 *   Avalanche Fuji C-Chain Testnet — no real money needed!
 */

import { ethers } from 'ethers';
import 'dotenv/config';

// ─── Configuration ────────────────────────────────────────────────────────────

// Avalanche Fuji C-Chain public RPC — free, no API key needed
const FUJI_RPC = 'https://api.avax-test.network/ext/bc/C/rpc';

// NeuralControl demo-service endpoint we are hitting
const DEMO_SERVICE_URL = process.env.DEMO_SERVICE_URL || 'http://localhost:3001';
const TARGET_ENDPOINT  = `${DEMO_SERVICE_URL}/api/agent-data`;

// The agent's private key — this is its Avalanche wallet
// ⚠️  NEVER use a mainnet wallet here. Fuji testnet ONLY.
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

// Determine agent mode from command line
const isBadAgent = process.argv.includes('--bad');

// Agent identity — this is the x-agent-id header value we send
// "agent_good_*" prefix → ERC-8004 score 95 → gets payment offer
// "bad_bot_*"    prefix → ERC-8004 score 5  → hard blocked with 429
const AGENT_ID = isBadAgent
  ? 'bad_bot_scraper_v1'            // ← untrusted, no ERC-8004 registration
  : 'agent_good_market_feed_v1';    // ← trusted, ERC-8004 verified

// How many total requests to make in the demo loop
const TOTAL_REQUESTS = 30;

// Delay between requests (ms) — fast enough to trigger rate limits
const REQUEST_INTERVAL_MS = 500;


// ─── Setup Wallet & Provider ──────────────────────────────────────────────────

let wallet = null;

if (!AGENT_PRIVATE_KEY) {
  console.log('⚠️  No AGENT_PRIVATE_KEY in environment.');
  console.log('   Running in DRY RUN mode — payment step will be skipped.');
  console.log('   To enable real payments: set AGENT_PRIVATE_KEY in .env\n');
} else {
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);
  wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
}


// ─── Helper: Pretty print a divider ──────────────────────────────────────────

function divider(char = '─', length = 60) {
  console.log(char.repeat(length));
}


// ─── Helper: Make an HTTP request (replaces fetch for Node compat) ────────────

async function httpGet(url, headers = {}) {
  const res = await fetch(url, { headers });
  const body = await res.json();
  return { status: res.status, body };
}

async function httpPost(url, data, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data)
  });
  const body = await res.json();
  return { status: res.status, body };
}


// ─── Core: The Payment Flow ───────────────────────────────────────────────────

/**
 * When we receive a 402, this function handles the full payment flow:
 *   1. Shows the invoice details
 *   2. Sends AVAX on Avalanche Fuji (or simulates in dry run)
 *   3. Submits the tx hash to NeuralControl for verification
 *   4. Returns true if payment was verified successfully
 */
async function handlePayment(invoice, requestNumber) {
  divider('═');
  console.log(`💸 [Request ${requestNumber}] x402 PAYMENT REQUIRED`);
  console.log(`   Invoice ID   : #${invoice.invoice_id}`);
  console.log(`   Pay to       : ${invoice.pay_to_wallet}`);
  console.log(`   Amount       : ${ethers.formatEther(BigInt(invoice.amount_wei))} AVAX`);
  console.log(`   Network      : ${invoice.network}`);
  if (invoice.agent_reputation) {
    console.log(`   My ERC-8004  : score=${invoice.agent_reputation.score} | tier=${invoice.agent_reputation.tier}`);
  }
  divider('─');

  // ── Step A: Send the payment ─────────────────────────────────────────────
  let txHash;

  if (!wallet) {
    // DRY RUN: no wallet configured — simulate with a fake hash
    console.log(`💭 DRY RUN: Simulating payment (no AGENT_PRIVATE_KEY set)`);
    txHash = '0x' + 'dryrun'.repeat(10).substring(0, 64);
    console.log(`   Simulated TX : ${txHash}`);
  } else {
    try {
      console.log(`🔗 Sending ${ethers.formatEther(BigInt(invoice.amount_wei))} AVAX on Avalanche Fuji...`);

      const tx = await wallet.sendTransaction({
        to: invoice.pay_to_wallet,
        value: BigInt(invoice.amount_wei),
      });

      console.log(`   TX submitted : ${tx.hash}`);
      console.log(`   🔍 View on Snowtrace: https://testnet.snowtrace.io/tx/${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);

      // Wait for 1 block confirmation
      await tx.wait(1);
      txHash = tx.hash;
      console.log(`   ✅ Payment confirmed on-chain!`);

    } catch (err) {
      console.error(`   ❌ Payment failed: ${err.message}`);
      if (err.message.includes('insufficient funds')) {
        console.error(`   💡 Get free Fuji AVAX at: https://faucet.avax.network`);
      }
      return false;
    }
  }

  // ── Step B: Submit proof to NeuralControl ─────────────────────────────────
  console.log(`\n📡 Submitting payment proof to NeuralControl...`);

  try {
    const { status, body } = await httpPost(
      invoice.verify_url,
      { invoice_id: invoice.invoice_id, tx_hash: txHash }
    );

    if (status === 200 && body.verified) {
      console.log(`   🎉 Payment VERIFIED by NeuralControl!`);
      console.log(`   ✅ Burst access granted for ${body.expires_in_minutes} minutes`);
      console.log(`   🕐 Window expires: ${body.access_granted_until}`);
      divider('═');
      return true;
    } else {
      console.log(`   ⚠️  Verification response: ${JSON.stringify(body)}`);
      return false;
    }

  } catch (err) {
    console.error(`   ❌ Verification call failed: ${err.message}`);
    return false;
  }
}


// ─── Main Agent Loop ──────────────────────────────────────────────────────────

async function runAgent() {
  divider('═');
  console.log(`🤖 NeuralControl Autonomous Agent Starting`);
  console.log(`   Agent ID     : ${AGENT_ID}`);
  console.log(`   Mode         : ${isBadAgent ? '❌ UNTRUSTED (bad bot)' : '✅ TRUSTED (ERC-8004 registered)'}`);
  console.log(`   Target       : ${TARGET_ENDPOINT}`);
  console.log(`   Wallet       : ${wallet ? wallet.address : 'Not configured (dry run)'}`);
  console.log(`   Total calls  : ${TOTAL_REQUESTS}`);
  divider('═');
  console.log('');

  let successCount  = 0;
  let blockedCount  = 0;
  let paymentCount  = 0;
  let paymentPaidCount = 0;

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {

    try {
      // ── Make the request to demo-service ──────────────────────────────────
      const { status, body } = await httpGet(TARGET_ENDPOINT, {
        'x-agent-id': AGENT_ID,
        'Content-Type': 'application/json'
      });

      // ── Handle the response ───────────────────────────────────────────────
      if (status === 200) {
        // ✅ Success — normal data response
        successCount++;
        console.log(`✅ [${i}/${TOTAL_REQUESTS}] Got data | AVAX=$${body.data?.market_signals?.[0]?.price}`);

      } else if (status === 402) {
        // 💸 Payment Required — the x402 moment!
        paymentCount++;
        const paid = await handlePayment(body, i);

        if (paid) {
          paymentPaidCount++;
          console.log(`🔄 [${i}/${TOTAL_REQUESTS}] Retrying immediately with active burst window...`);

          // Immediately retry after successful payment
          const retry = await httpGet(TARGET_ENDPOINT, {
            'x-agent-id': AGENT_ID,
            'Content-Type': 'application/json'
          });

          if (retry.status === 200) {
            successCount++;
            console.log(`✅ [${i}/${TOTAL_REQUESTS}] Retry SUCCESS after payment! Got data.`);
          } else {
            console.log(`⚠️  [${i}/${TOTAL_REQUESTS}] Retry got ${retry.status} — burst window may need a moment`);
          }
        }

      } else if (status === 429) {
        // 🚫 Hard rate limit — no payment option (bad agent or payments disabled)
        blockedCount++;
        console.log(`🚫 [${i}/${TOTAL_REQUESTS}] BLOCKED 429 — ${body.message || 'Rate limited'}`);
        if (body.tip && i === 1) {
          console.log(`   💡 ${body.tip}`);
        }

      } else {
        console.log(`⚠️  [${i}/${TOTAL_REQUESTS}] Unexpected status ${status}: ${JSON.stringify(body)}`);
      }

    } catch (err) {
      console.error(`❌ [${i}/${TOTAL_REQUESTS}] Request error: ${err.message}`);
    }

    // Wait before next request
    if (i < TOTAL_REQUESTS) {
      await new Promise(r => setTimeout(r, REQUEST_INTERVAL_MS));
    }
  }

  // ── Final Summary ─────────────────────────────────────────────────────────
  console.log('');
  divider('═');
  console.log(`📊 Agent Run Complete — Summary`);
  divider('─');
  console.log(`   ✅ Successful data fetches : ${successCount}`);
  console.log(`   💸 Payment invoices received: ${paymentCount}`);
  console.log(`   💰 Payments completed       : ${paymentPaidCount}`);
  console.log(`   🚫 Hard blocks (429)        : ${blockedCount}`);
  console.log(`   📡 Total requests           : ${TOTAL_REQUESTS}`);
  divider('═');

  if (paymentPaidCount > 0) {
    console.log(`\n🏆 Demo complete! The agent autonomously paid ${paymentPaidCount} invoice(s) and continued working.`);
    console.log(`   No human approved any payment. This is agentic finance.\n`);
  } else if (isBadAgent) {
    console.log(`\n🛡️  Demo complete! Untrusted agent was blocked every time — no payment option given.`);
    console.log(`   ERC-8004 identity verification protected the API from bad bots.\n`);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
runAgent().catch(err => {
  console.error('Agent crashed:', err);
  process.exit(1);
});
