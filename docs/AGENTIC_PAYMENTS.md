# 🤖 Agentic Payments & Decentralized Trust Ecosystem

Welcome to the **NeuralControl Agentic Payment Ecosystem**. We have created a fully autonomous, decentralized network that allows AI Agents to pay for API access while simultaneously establishing a global reputation score to prevent malicious bot activity.

This ecosystem revolves around the **ERC-8004 AI Agent Identity Standard** deployed on the Avalanche blockchain.

---

## 🌟 The Core Concepts

1. **Agent Registry (ERC-8004):** Every AI agent registers on the blockchain and starts with a Trust Score of `50/100`.
2. **x402 (Payment Required):** When an agent hits a paywall or a rate limit, the API returns a `402 Payment Required` HTTP response with an AVAX invoice.
3. **Autonomous Payments (MCP):** The AI Agent uses a Model Context Protocol (MCP) tool to automatically pay the invoice via smart contract and retry the request.
4. **Decentralized Reputation:** If the agent pays, their global score increases. If the agent launches an attack (e.g., SQL Injection), their score is permanently slashed. If their score drops below `50`, they are banished from the ecosystem.

---

## 🛠️ Feature 1: The Global Agent Registry

Before an AI Agent can participate in the ecosystem, its owner must register it on the blockchain.

**How to Deploy an Agent:**
1. Navigate to the **Agent Registry** in the NeuralControl Dashboard.
2. Connect your MetaMask wallet (Avalanche Fuji Testnet).
3. Enter a unique `Agent ID` (e.g., `my_trading_bot`).
4. Click **Register Agent**.

The agent is now permanently etched onto the blockchain with a baseline trust score of 50.

---

## 🛠️ Feature 2: Full NeuralControl Integration

If you are using the full NeuralControl Cloud Platform, payments and trust scoring are completely automated.

### 1. Rate Limit Burst (x402 Pay-to-Bypass)
When you enable AI Rate Limiting on your endpoint, NeuralControl automatically intercepts AI Agents that exceed their quota. Instead of a hard `429 Too Many Requests`, they receive a `402 Payment Required`. If they pay the AVAX invoice, they are granted "Burst Access" to bypass the limit.

**Demo Service Example:**
```javascript
app.get('/api/agent-data',
  controlPlane.middleware('/api/agent-data'),
  async (req, res) => {
    // 1. Check if rate limited
    if (req.controlPlane.isRateLimitedCustomer) {
      
      const agentId = req.headers['x-agent-id'];
      if (agentId) {
        try {
          // Ask control plane for an invoice or active burst window
          const invoiceRes = await axios.post(
            `${CONTROL_PLANE_URL}/api/agentic/invoice/${SERVICE_NAME}/${ENPOINT_PATH}`, 
            { agent_id: agentId },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
          );
          const invoice = invoiceRes.data;

          if (invoice.status === 'authorized') {
            // Burst window is active! Bypass rate limit and serve data
            return res.json({ success: true, data: "Premium market data (BURST ACCESS)" });
          } else {
            // Return 402 Payment Required invoice to the agent
            return res.status(402).json({
              error: 'x402 Payment Required',
              invoice_id: invoice.invoice_id,
              pay_to_wallet: invoice.pay_to_wallet,
              amount_wei: invoice.amount_wei,
              network: 'Avalanche Fuji Testnet (C-Chain)',
              verify_url: `${CONTROL_PLANE_URL}/api/agentic/verify`,
              agent_reputation: invoice.reputation,
              instructions: [
                '1. Send the amount_wei in AVAX to pay_to_wallet on Avalanche Fuji C-Chain',
                '2. POST your tx_hash to verify_url with your invoice_id',
                '3. Retry this endpoint'
              ]
            });
          }
        } catch (err) {
          // Fall through to 429 if untrusted or error
        }
      }
      
      // Regular 429 for humans/untrusted agents
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Normal response — rate limit not hit
    res.json({ success: true, data: "Premium market data" });
  }
);
```

### 2. Pay-Per-Request (Premium Data)


```javascript
app.get('/api/pay-per-request', 
  controlPlane.middleware('/api/pay-per-request'),
  async (req, res) => {
    const agentId = req.headers['x-agent-id'];

    if (!agentId) {
      return res.status(403).json({ error: "Access Denied. Only AI Agents can buy this data." });
    }

    try {
      const invoiceRes = await axios.post(
        `${CONTROL_PLANE_URL}/api/agentic/invoice/${SERVICE_NAME}/${ENPOINT_PATH}`,
        { agent_id: agentId, mode: 'pay_per_request' },
        { headers: { Authorization: `Bearer ${API_KEY}` } }
      );
      const invoice = invoiceRes.data;

      if (invoice.status === 'authorized') {
        return res.json({ success: true, data: "Here is your highly expensive AI-generated premium data!" });
      }

      return res.status(402).json({
        error: 'x402 Payment Required',
        invoice_id: invoice.invoice_id,
        pay_to_wallet: invoice.pay_to_wallet,
        amount_wei: invoice.amount_wei,
        network: 'Avalanche Fuji Testnet',
        verify_url: `${CONTROL_PLANE_URL}/api/agentic/verify`,
        agent_reputation: invoice.reputation,
      });

    } catch (err) {
      return res.status(500).json({ error: "Failed to communicate with NeuralControl" });
    }
  }
);
```

### The Autonomous Agent Experience
The AI Agent doesn't need a human to type in a credit card. It uses the `mcp_neuralcontrol_payments_pay_402_invoice` tool. 

When the LLM sees the `402 Payment Required` JSON response, it autonomously executes the tool, pays the exact `amount_wei` to your `pay_to_wallet`, gets the `x-payment-hash`, and effortlessly retries the request!

---

## 🛠️ Feature 3: The Standalone Lite SDK (Decentralized Mode)

What if you are an independent developer who doesn't want to use the full NeuralControl backend, but you still want to charge AI agents and protect your API from hackers?

You can use the standalone **Lite SDK** ([@neuralcontrol/payments-lite on npm](https://www.npmjs.com/package/neuralcontrol-payments-lite)).

### Setting up a Decentralized Paywall & Slashing

Here is a complete, production-ready example of how a website can independently verify blockchain payments and instantly slash malicious hackers:

```javascript
const { getAgentScore, verifyOnChain, slashAgentScore } = require('@neuralcontrol/payments-lite');

const MY_WALLET = '0x708EEE9Ff754e0724B218d14671af961fA610DBC';
const PRICE_WEI = '10000000000000000'; // 0.01 AVAX
const WEBSITE_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY; // For slashing

// Local in-memory set to prevent replay attacks
const usedTxHashes = new Set();

app.get('/api/lite-generate', async (req, res) => {
  const agentId = req.headers['x-agent-id'];
  const txHash = req.headers['x-payment-hash'];

  if (!agentId) {
    return res.status(403).json({ error: "Access Denied. Only AI Agents with x-agent-id can buy this data." });
  }

  // 1. Check Global Reputation on Blockchain
  let score = await getAgentScore(agentId);
  if (score !== null && score < 40) {
    return res.status(403).json({ error: "Your global AI reputation is too low." });
  }

  // 2. If no hash provided, demand payment
  if (!txHash) {
    return res.status(402).json({
      error: "Payment Required",
      pay_to_wallet: MY_WALLET,
      amount_wei: PRICE_WEI,
      message: "Send the transaction hash in the x-payment-hash header!"
    });
  }

  // 3. Prevent replay attacks
  if (usedTxHashes.has(txHash)) {
    return res.status(403).json({ error: "Transaction hash already used!" });
  }

  // 4. Verify on-chain
  const verification = await verifyOnChain(txHash, MY_WALLET, PRICE_WEI);
  
  if (!verification.verified) {
    return res.status(400).json({ error: verification.reason });
  }

  // 5. Save hash to prevent reuse
  usedTxHashes.add(txHash);

  // 6. Detect Malicious Attack! (Simulated via query param)
  if (req.query.attack === "true") {
      console.log(`🚨 Attack detected from ${agentId}! Slashing score...`);
      
      const slashResult = await slashAgentScore(
          agentId, 
          "Simulated SQL Injection detected in prompt", 
          20, // penalty points
          WEBSITE_PRIVATE_KEY
      );
      
      return res.status(403).json({ 
          error: "Attack detected. You have been reported to the global registry and permanently slashed.",
          slashResult: slashResult
      });
  }

  // 7. Serve premium data
  return res.json({ 
    success: true, 
    data: "Highly expensive AI generated output (LITE SDK)!",
    agent_score: score 
  });
});
```

---

## ⚖️ The Trust Scoring Engine

NeuralControl acts as a global, trusted Oracle. A background Python chron job (`agent_scoring.py`) constantly monitors all AI telemetry and adjusts blockchain scores based on strict mathematical rules:

*   🟢 **+5 Points (Payment Boost):** Awarded every time an agent successfully pays an invoice (proving financial backing).
*   🟢 **+2 Points (Success Grind):** Awarded for generating hundreds of successful `200 OK` requests without incident.
*   🔴 **-1 Point (Rate Limit Penalty):** Deducted if the agent aggressively spams the API and bounces off rate limits without paying.
*   🔴 **-2 Points (Server Error Penalty):** Deducted if the agent sends malformed data that causes the server to throw `500 Internal Server Errors`.
*   💀 **-20 Points (Slashing):** Deducted instantly if a website owner catches an agent executing a direct attack (SQL injection, XSS) and uses the Lite SDK to report them.

Once a score drops below `50`, the agent enters the **Untrusted Tier** and is universally blocked by websites across the entire NeuralControl ecosystem!
