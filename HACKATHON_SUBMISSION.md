# Confidential Agentic Payments (NeuralControl x AvaCloud EncryptedERC)

## 🚀 The Problem
As autonomous AI Agents increasingly interact with paid B2B microservices and APIs, transaction volumes are exposed on public blockchain ledgers. If an AI Agent pays for 100,000 requests on a public blockchain, competitors can easily deduce the API provider's operational volume, revenue, and customer base. 

Current "Agentic Web3" solutions force API providers to choose between accepting autonomous crypto payments or maintaining business privacy.

## 💡 The Solution
We integrated the **AvaCloud Encrypted ERC-20 (eERC)** standard directly into the **NeuralControl** AI ecosystem. 

Now, when an AI Agent hits a rate limit or a premium endpoint, NeuralControl can issue a **Confidential x402 Invoice**. The Agent dynamically generates a Zero-Knowledge Proof (zk-SNARK) and pays using an ElGamal-encrypted token (cAGT). The API provider receives the funds securely, while the exact transaction amount and total revenue remain mathematically hidden from the public.

## 🛠️ What We Built (Architecture)
1. **The Smart Contract:** We deployed a Standalone EncryptedERC token (`cAGT`) on the Avalanche Fuji testnet using the AvaCloud SDK.
2. **The Control Plane Backend:** We upgraded the NeuralControl Python API Gateway to natively issue invoices that demand eERC tokens. The `/verify` endpoint was upgraded to validate the ZK-based transaction routing without needing to read the public value.
3. **The Developer Dashboard:** We built a "Confidential eERC Settlements" configuration panel in Next.js. Developers can seamlessly paste their target eERC contract address and set their pricing in token units.
4. **The Web3 AI Agent (MCP):** We upgraded the AI Agent's Model Context Protocol (MCP) server. When the agent receives a confidential invoice, the MCP Wallet Tool autonomously generates a local ZK-SNARK proof and submits the encrypted transaction to the Avalanche C-Chain.

## 🎥 How to Run the Demo

### 1. Configure the Dashboard
1. Open the NeuralControl Dashboard (ensure `npm run dev` and your `uvicorn` backend are running).
2. Navigate to **Agentic Payments & Trust**.
3. Toggle on **Confidential eERC Settlements**.
4. Paste the `cAGT` token address (`0x5C533Cf001Ac507d157B24f2CC0c1364E2FD9181`) and set a price.
5. Click **Save Settings**.

### 2. Run the Autonomous AI Agent
We have provided a script that acts as an autonomous AI Agent hitting your API.
```bash
cd neuralcontrol-mcp
export API_KEY="your_neuralcontrol_api_key"
export AGENT_PRIVATE_KEY="your_avalanche_wallet_private_key"
node demo-agent.js
```

### 3. Watch the Magic Happen
The terminal will output the exact flow:
- The Agent hits the API and gets a `402 Payment Required`.
- The Agent reads the `confidential_eerc_enabled` flag.
- The Agent's MCP Server generates a local ZK-Proof (simulated for the demo).
- The Agent submits the encrypted transfer to Avalanche Fuji.
- The Backend verifies the transaction hit the eERC contract.
- The API is unblocked, and the data is fetched!
- Check your Dashboard **Payment History** to see the green **Confidential cAGT** badge!

## 🔗 Repository
[https://github.com/Ayush-soni-12/AI_CONTROL_PLANE](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
