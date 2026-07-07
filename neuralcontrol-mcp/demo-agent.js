import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import "dotenv/config";

// Configuration
const API_PROVIDER_URL = "http://localhost:3001"; // The demo-service port
const AGENT_ID = "bot_2"; // The agent's identity

async function runAgent() {
  console.log("\n🤖 [AI Agent] Starting autonomous task: Fetching data from API...");
  
  // ── Step 1: Hit the API Provider ──
  // You can test either Rate Limit mode or Pay-Per-Request mode here:
  // Option A (Rate Limit): /api/agent-data
  // Option B (Pay Per Request): /api/pay-per-request
  
  const targetEndpoint = `${API_PROVIDER_URL}/api/agent-data`;
  
  let response;
  
  // Keep fetching until we hit the rate limit or paywall
  while (true) {
    console.log(`🤖 [AI Agent] Fetching ${targetEndpoint}...`);
    response = await fetch(targetEndpoint, {
      headers: { "x-agent-id": AGENT_ID }
    });

    if (response.status === 200) {
      const data = await response.json();
      console.log("🤖 [AI Agent] Success! Fetched Data:", data);
      
      // If it's the pay-per-request endpoint, it shouldn't be free.
      // If it's the rate-limit endpoint, we keep going until we get blocked!
      if (data.data && data.data.rate_limit_remaining !== undefined) {
        console.log(`   (Rate Limit Remaining: ${data.data.rate_limit_remaining}) -> Fetching again...`);
        await new Promise(resolve => setTimeout(resolve, 500)); // wait 0.5s before spamming
      } else {
        return; // Stop and exit completely if we got the data (e.g., after paying!)
      }
    } else if (response.status === 429) {
      // Regular rate limit hit (no burst access offered by customer)
      console.log("🤖 [AI Agent] 🛑 Hit 429 Rate Limit (No x402 offered).");
      return;
    } else {
      break; // Stop the loop on 402 or 500
    }
  }

  if (response.status === 402) {
    const invoice = await response.json();
    console.log(`\n🛑 [Agent Interface] 402 Payment Required!`);
    console.log(`   Invoice ID: ${invoice.invoice_id}`);
    
    if (invoice.confidential_eerc_enabled) {
      console.log(`   Confidential eERC Mode: ACTIVE 🔒`);
      console.log(`   Target Token: ${invoice.eerc_token_address}`);
      console.log(`   Amount to Pay: ${invoice.eerc_payment_amount} cAGT tokens`);
    } else {
      console.log(`   Amount to Pay: ${Number(invoice.amount_wei) / 1e18} AVAX`);
    }
    
    console.log("\n🤖 [AI Agent] I need to pay this invoice. Loading MCP Web3 Wallet Tool...");

    // ── Step 2: Connect to our MCP Server ──
    const transport = new StdioClientTransport({
      command: "node",
      args: ["index.js"], // runs neuralcontrol-mcp
      env: process.env // pass down AGENT_PRIVATE_KEY
    });

    const mcpClient = new Client(
      { name: "demo-agent", version: "1.0.0" },
      { capabilities: {} }
    );

    await mcpClient.connect(transport);
    console.log("🔌 [MCP] Connected to Wallet Tool.");

    // ── Step 3: Call the payment tool ──
    console.log("🤖 [AI Agent] Executing tool: pay_402_invoice...");
    try {
      const result = await mcpClient.callTool({
        name: "pay_402_invoice",
        arguments: {
          amount: String(Number(invoice.amount_wei) / 1e18),
          pay_to: invoice.pay_to_wallet,
          invoice_id: invoice.invoice_id,
          verify_url: invoice.verify_url,
          confidential_eerc_enabled: invoice.confidential_eerc_enabled,
          eerc_token_address: invoice.eerc_token_address,
          eerc_payment_amount: invoice.eerc_payment_amount
        }
      });

      console.log("\n✅ [MCP Tool Result]");
      console.log(result.content[0].text);

      // ── Step 4: Retry the API Request ──
      console.log("\n🤖 [AI Agent] Payment verified on blockchain! Retrying API request...");
      response = await fetch(targetEndpoint, {
        headers: { "x-agent-id": AGENT_ID }
      });
      
      const finalData = await response.json();
      console.log("🤖 [AI Agent] Success! Fetched Data:", finalData);
      console.log("🎉 Task Complete!");

    } catch (error) {
      console.error("❌ MCP Tool Error:", error.message);
    } finally {
      await transport.close();
    }
  } else {
    // Fallback if the server returns 500, 404, 429, etc.
    const text = await response.text();
    console.error(`\n❌ [AI Agent] Unexpected response: HTTP ${response.status}`);
    console.error(`   Body: ${text}`);
    console.error(`   Please check the demo-service logs!`);
  }
}

// Run the simulation
runAgent().catch(console.error);
