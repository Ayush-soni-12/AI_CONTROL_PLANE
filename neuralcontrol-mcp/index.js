import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import "dotenv/config";

// Configuration
const FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error("FATAL: AGENT_PRIVATE_KEY is not set in .env");
  process.exit(1);
}

// Initialize the MCP Server
const server = new Server(
  {
    name: "NeuralControl-Agentic-Payments",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define the tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "pay_402_invoice",
        description:
          "Pay an AI API invoice autonomously using the agent's Web3 wallet. Use this tool when you receive a 402 Payment Required response from an API.",
        inputSchema: {
          type: "object",
          properties: {
            amount: {
              type: "string",
              description: "The amount of AVAX to pay, e.g. '0.01'",
            },
            pay_to: {
              type: "string",
              description: "The destination wallet address to send the payment to.",
            },
            invoice_id: {
              type: "string",
              description: "The invoice ID to pay.",
            },
            verify_url: {
              type: "string",
              description: "Optional. The URL to POST the transaction hash to for verification. If omitted, the tool will just return the transaction hash.",
            },
          },
          required: ["amount", "pay_to", "invoice_id"],
        },
      },
    ],
  };
});

// 2. Execute the tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "pay_402_invoice") {
    const { amount, pay_to, invoice_id, verify_url } = request.params.arguments;

    try {
      const provider = new ethers.JsonRpcProvider(FUJI_RPC);
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

      const valueWei = ethers.parseEther(amount);

      // Send the transaction
      const tx = await wallet.sendTransaction({
        to: pay_to,
        value: valueWei,
      });

      // Wait for confirmation
      await tx.wait();

      // Web3 Race Condition Fix: Wait 3 seconds to ensure the network syncs
      await new Promise(resolve => setTimeout(resolve, 3000));

      // ── UNIVERSAL MODE vs NEURALCONTROL MODE ──
      // If the server didn't provide a verify_url, we just return the hash!
      if (!verify_url) {
        return {
          content: [
            {
              type: "text",
              text: `Payment of ${amount} AVAX was successful! Transaction Hash: ${tx.hash}. Please attach this hash to your next API request according to the server's instructions.`,
            },
          ],
        };
      }

      // ── NEURALCONTROL MODE ──
      // Sanitize invoice_id (LLMs sometimes pass "#45" instead of "45")
      const cleanInvoiceId = String(invoice_id).replace(/[^0-9]/g, '');

      // Submit verification to the control plane
      const verifyRes = await fetch(verify_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: cleanInvoiceId, tx_hash: tx.hash })
      });
      
      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        throw new Error(`Control Plane verification failed [HTTP ${verifyRes.status}]: ${errText}`);
      }

      const verifyBody = await verifyRes.json();
      
      if (!verifyBody.verified) {
        throw new Error(`Payment succeeded on-chain (${tx.hash}), but Control Plane verification failed.`);
      }

      return {
        content: [
          {
            type: "text",
            text: `Payment of ${amount} AVAX for invoice ${invoice_id} was successful and verified! Transaction Hash: ${tx.hash}. Burst access has been granted for ${verifyBody.expires_in_minutes} minutes. You may now retry your API request.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Payment failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error("Tool not found");
});

// 3. Start the server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NeuralControl Agentic Payments MCP Server running on stdio");
}

run().catch(console.error);
