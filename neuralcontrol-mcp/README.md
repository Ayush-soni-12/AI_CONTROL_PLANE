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
*   `amount` (string, required): The amount of AVAX to pay (e.g., `"0.01"`).
*   `pay_to` (string, required): The destination wallet address from the invoice.
*   `invoice_id` (string, required): The unique ID of the invoice.
*   `verify_url` (string, optional): The URL provided by the server to verify the transaction hash after payment.

**How it works:**
1. The tool connects to the Avalanche Fuji network using the provided private key.
2. It sends the AVAX.
3. It waits for blockchain confirmation.
4. If a `verify_url` is provided, it automatically POSTs the transaction hash back to the server to unlock burst access!

## Support
For full details on setting up Agentic Payments and decentralized rate limiting, visit the [NeuralControl GitHub Repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE).
