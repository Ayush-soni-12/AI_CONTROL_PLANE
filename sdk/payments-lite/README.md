# @neuralcontrol/payments-lite

A lightweight, open-source SDK for any website (e.g., OpenAI, Anthropic, or indie APIs) to natively accept cryptocurrency payments directly from Autonomous AI Agents.

This SDK works entirely **independently of the NeuralControl Dashboard**. You do not need to connect to NeuralControl's API to use this. You only need your own Avalanche wallet!

## How it works

When an AI Agent hits your rate limit, or tries to access a premium endpoint, you return a standard `402 Payment Required` HTTP response:

```json
{
  "error": "Payment Required",
  "pay_to_wallet": "0xYourWalletAddress...",
  "amount_wei": "10000000000000000",
  "message": "Send the transaction hash in the X-Payment-Hash header!"
}
```

Any AI Agent equipped with the **Universal Agentic Payments MCP Tool** will read this JSON, autonomously execute the transaction on the Avalanche Blockchain, and retry the request providing the `tx_hash` to your server.

You then use this Lite SDK to mathematically verify that the money actually arrived in your wallet!

## Installation

```bash
npm install @neuralcontrol/payments-lite
```

## Basic Usage

```javascript
const express = require('express');
const { verifyOnChain } = require('@neuralcontrol/payments-lite');

const app = express();
const MY_WALLET = '0x742d35Cc6634C0532925a3b8D4C0C8b3d3b4e6d9';
const PRICE_WEI = '10000000000000000'; // 0.01 AVAX

app.post('/api/generate', async (req, res) => {
    const txHash = req.headers['x-payment-hash'];

    // 1. If no hash provided, demand payment
    if (!txHash) {
        return res.status(402).json({
            error: "Payment Required",
            pay_to_wallet: MY_WALLET,
            amount_wei: PRICE_WEI
        });
    }

    // 2. Use Lite SDK to verify the blockchain transaction
    const verification = await verifyOnChain(txHash, MY_WALLET, PRICE_WEI);
    
    if (!verification.verified) {
        return res.status(400).json({ error: verification.reason });
    }

    // 3. Payment is valid! Serve premium data
    return res.json({ data: "Highly expensive AI generated output!" });
});
```

---

## ⚠️ Critical Database Setup (Replay Protection)

If you only use the code above, a malicious AI Agent could pay you once, get a valid `tx_hash`, and **use that exact same hash forever** to get free data!

Because you are using the Lite SDK instead of NeuralControl's Hosted API, **you are responsible for preventing replay attacks.**

You must create a simple database table to track which transaction hashes have already been used.

### Step 1: Create a Database Table
If you use PostgreSQL, you should create a table like this:

```sql
CREATE TABLE ai_payments (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    amount_paid_wei VARCHAR(30) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Update Your Server Logic

Before serving the data, check your database to ensure the `tx_hash` hasn't been used yet. Once verified, save it to the database immediately.

```javascript
app.post('/api/generate', async (req, res) => {
    const txHash = req.headers['x-payment-hash'];
    if (!txHash) return res.status(402).json({ pay_to_wallet: MY_WALLET, amount_wei: PRICE_WEI });

    // 1. Check your database to ensure this hash hasn't been used before
    const existingPayment = await db.query('SELECT id FROM ai_payments WHERE tx_hash = $1', [txHash]);
    if (existingPayment.rows.length > 0) {
        return res.status(403).json({ error: "Transaction hash already used!" });
    }

    // 2. Verify on-chain using the Lite SDK
    const verification = await verifyOnChain(txHash, MY_WALLET, PRICE_WEI);
    if (!verification.verified) {
        return res.status(400).json({ error: verification.reason });
    }

    // 3. Save to database immediately to prevent reuse!
    await db.query(
        'INSERT INTO ai_payments (tx_hash, agent_id, amount_paid_wei) VALUES ($1, $2, $3)',
        [txHash, req.headers['x-agent-id'], verification.amount_avax * 1e18]
    );

    // 4. Serve the premium data!
    return res.json({ data: "Highly expensive AI generated output!" });
});
```

## Universal MCP Tool Support
AI Agents do not need to install any custom tools for your specific website. NeuralControl has contributed the Universal `pay_402_invoice` MCP tool to the community. Any agent equipped with this single MCP tool can seamlessly read your 402 error, pay your wallet, and return the `tx_hash` to your server autonomously.

---

## 🛡️ Decentralized Reputation System (ERC-8004)

Because NeuralControl stores Agent Reputation on a public blockchain (Avalanche), you do not need to rely on NeuralControl's servers to check if an agent is trustworthy, or to report them if they are malicious.

### 1. Check an Agent's Global Score (Free)
Before asking an agent for payment, you can check their global trust score (0-100). If their score is too low, you can block them outright.

```javascript
const { getAgentScore } = require('@neuralcontrol/payments-lite');

app.post('/api/generate', async (req, res) => {
    const agentId = req.headers['x-agent-id'];
    
    // Read the blockchain for free
    const score = await getAgentScore(agentId);
    if (score !== null && score < 50) {
        return res.status(403).json({ error: "Your global AI reputation is too low." });
    }
    
    // ... continue to payment logic
});
```

### 2. Report a Malicious Agent (Slashing)
If an agent pays for access, but then attempts an attack (e.g., SQL injection, DDoS), you can permanently slash their global reputation on the blockchain. Any other website checking their score will see the lowered score and block them.

**Important:** Slashing is a "Write" operation on the blockchain. You must provide a wallet Private Key that has a tiny amount of AVAX to pay the gas fee (usually a fraction of a cent).

```javascript
const { slashAgentScore } = require('@neuralcontrol/payments-lite');

app.post('/api/generate', async (req, res) => {
    // ... agent pays and sends input
    const userInput = req.body.prompt;
    
    // If you detect a malicious attack
    if (userInput.includes("DROP TABLE")) {
        const privateKey = process.env.WEBSITE_PRIVATE_KEY; // Wallet with some AVAX for gas
        
        // Slash their global score by 20 points!
        await slashAgentScore(
            req.headers['x-agent-id'], 
            "SQL Injection detected", 
            20, 
            privateKey
        );
        
        return res.status(403).json({ error: "Attack detected. You have been reported to the global registry." });
    }
});
```

---

## 🚀 Don't want to write this code? Use NeuralControl!
If you don't want to manually track transaction hashes in your database, and you don't want to pay gas fees to slash malicious agents, you can use the **NeuralControl Hosted Platform**.

By installing the full `neuralcontrol` Node.js middleware:
1. NeuralControl tracks all invoices and prevents replay attacks automatically.
2. NeuralControl's AI backend monitors telemetry automatically.
3. If an agent attacks your site, NeuralControl detects it and **pays the gas fees** to slash their score on the blockchain for you!

Visit [NeuralControl.gg](https://neuralcontrol.gg) to get started.
