# NeuralControl Agentic Payments MCP 🤖💸

This is the official Model Context Protocol (MCP) server for **NeuralControl Agentic Payments**. 

It provides the tools necessary for AI Agents (like Cursor, Claude, or custom LangGraph bots) to autonomously settle **402 Payment Required** API invoices on the Avalanche blockchain using their own crypto wallets.

## 🚀 Installation & Setup

You do not need to clone this repository! You can run it directly via `npx` inside your MCP client (like Claude Desktop).

### 1. Configure your MCP Client
Add the following to your MCP Configuration file (e.g., `claude_desktop_config.json` or `mcp_config.json`):

```json
{
  "mcpServers": {
    "neuralcontrol_payments": {
      "command": "npx",
      "args": ["-y", "neuralcontrol-mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "YOUR_AVALANCHE_FUJI_PRIVATE_KEY"
      }
    }
  }
}
```

### 2. Required Environment Variable
*   `AGENT_PRIVATE_KEY`: This is the private key to the web3 wallet that your AI agent will use to pay for API access. This wallet must be funded with **AVAX** on the **Avalanche Fuji Testnet**.

---

## 🛠️ Provided Tools

This MCP server exposes one primary tool to the AI:

### `pay_402_invoice`
When an AI agent makes an HTTP request to a NeuralControl-protected API and receives an `HTTP 402 Payment Required` response, it can autonomously invoke this tool to settle the invoice.

**Arguments:**
*   `amount` (string, required): The amount of tokens to pay (e.g., `"0.01"`).
*   `pay_to` (string, required): The destination wallet address from the invoice.
*   `invoice_id` (string, required): The unique ID of the invoice.
*   `verify_url` (string, optional): The URL provided by the server to verify the transaction hash after payment.
*   `confidential_eerc_enabled` (boolean, optional): Set to true if the invoice requires a confidential eERC token payment.
*   `eerc_token_address` (string, optional): The contract address of the eERC token.
*   `eerc_payment_amount` (string, optional): The amount of eERC tokens to pay.

**How it works (Standard AVAX):**
1. The tool connects to the Avalanche Fuji network using the provided private key.
2. It sends the AVAX payment.
3. It waits for blockchain confirmation.
4. If a `verify_url` is provided, it automatically POSTs the transaction hash back to the server to unlock burst access!

**How it works (Confidential eERC - Hackathon Build 🔒):**
If `confidential_eerc_enabled` is set to true, the tool will instead execute an ERC-20 token transfer to the `eerc_token_address`. In a full production ZK-environment, this handles the zero-knowledge proof generation to shield the B2B transaction details from public ledger analysis!

## Support
For full details on setting up Agentic Payments and decentralized rate limiting, visit the [NeuralControl GitHub Repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE).
