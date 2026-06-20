# 🚦 Rate Limiting Guide

Protect your APIs from abuse and ensure fair usage across all users with AI-powered rate limiting.

## What is Rate Limiting?

Rate limiting controls how many requests a user or service can make within a time window. It prevents:

- API abuse and DoS attacks
- Resource exhaustion
- Unfair usage patterns
- Cost overruns from excessive API calls

## When to Use Rate Limiting

###  Perfect For:

- **Public APIs** - Prevent abuse from external users
- **Resource-Intensive Endpoints** - Protect database-heavy operations
- **Billing/Metered APIs** - Enforce usage limits
- **Multi-Tenant Systems** - Ensure fair resource allocation

### Example Scenarios:

```javascript
// Scenario 1: Public API endpoint
app.get(
  "/api/search",
  controlPlane.middleware("/api/search"),
  async (req, res) => {
    // AI sets rate limits based on traffic patterns
  },
);

// Scenario 2: Resource-intensive endpoint
app.post(
  "/api/ml-inference",
  controlPlane.middleware("/api/ml-inference"),
  async (req, res) => {
    // Prevents overwhelming ML servers
  },
);

// Scenario 3: Paid API with quotas
app.get(
  "/api/premium-data",
  controlPlane.middleware("/api/premium-data"),
  async (req, res) => {
    // Enforces subscription limits
  },
);
```

---

## How AI Determines Rate Limits

The AI Control Plane analyzes multiple factors to set intelligent rate limits:

### Decision Factors:

1. **Historical Traffic Patterns**
   - Average requests per minute
   - Peak traffic times
   - Seasonal variations

2. **Resource Utilization**
   - CPU usage
   - Memory consumption
   - Database connection pool

3. **Error Rates**
   - Recent 5xx errors
   - Timeout rates
   - Failed requests

4. **Latency Trends**
   - p50, p95, p99 latencies
   - Degradation patterns
   - Response time stability

5. **Tenant Behavior**
   - Per-tenant request patterns
   - Abuse indicators
   - Fair usage metrics

---

## SDK Integration

### Basic Setup

```javascript
import express from "express";
import ControlPlaneSDK from "neuralcontrol";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "my-service",
  controlPlaneUrl: "https://api.neuralcontrol.online",
});

app.get("/api/data", controlPlane.middleware("/api/data"), async (req, res) => {
  // Simple boolean check for rate limiting
  if (req.controlPlane.isRateLimitedCustomer) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: req.controlPlane.retryAfter,
    });
  }

  // Process request normally
  const data = await fetchData();
  res.json(data);
});

app.listen(3001, async () => {
  console.log("Server running on http://localhost:3001");
  await controlPlane.initialize(["/api/data"]);
});
```

### Available SDK Properties

```javascript
req.controlPlane = {
  // Rate limiting
  isRateLimitedCustomer: boolean,  // Is this customer rate limited?

  // Other traffic management
  isLoadShedding: boolean,
  isQueueDeferral: boolean,
  shouldCache: boolean,
  shouldSkip: boolean,  // Circuit breaker

  // Metadata
  statusCode: number,
  retryAfter: number,      // Seconds to wait
  estimatedDelay: number,
  reason: string,

  // Full config (if needed)
  config: { ... }
}
```

---

## Handling Rate Limit Responses

### Pattern 1: Simple Error Response

```javascript
app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
  async (req, res) => {
    if (req.controlPlane.isRateLimitedCustomer) {
      return res.status(429).json({
        error: "Too many requests",
        retryAfter: req.controlPlane.retryAfter,
      });
    }

    res.json(await getProducts());
  },
);
```

### Pattern 2: Include Retry-After Header

```javascript
app.get(
  "/api/users",
  controlPlane.middleware("/api/users"),
  async (req, res) => {
    if (req.controlPlane.isRateLimitedCustomer) {
      res.set("Retry-After", req.controlPlane.retryAfter);
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Please try again in ${req.controlPlane.retryAfter} seconds`,
      });
    }

    res.json(await getUsers());
  },
);
```

### Pattern 3: Graceful Degradation

```javascript
app.get(
  "/api/recommendations",
  controlPlane.middleware("/api/recommendations"),
  async (req, res) => {
    if (req.controlPlane.isRateLimitedCustomer) {
      // Return cached or fallback data instead of error
      return res.json({
        recommendations: getCachedRecommendations(),
        note: "Showing cached results due to rate limit",
      });
    }

    res.json({
      recommendations: await getPersonalizedRecommendations(),
    });
  },
);
```

---

## Agentic Pay-to-Bypass (x402) 🤖

Standard rate limits (HTTP 429) work perfectly for humans and bad bots. However, when an autonomous AI agent hits a rate limit, it breaks. NeuralControl supports the **x402 Pay-to-Bypass** protocol to allow highly trusted AI agents to autonomously pay for temporary burst access.

### How it Works:
1. The agent sends an `x-agent-id` header with its request.
2. If rate-limited, NeuralControl checks the agent's **ERC-8004** on-chain reputation score.
3. If the agent is highly trusted, it returns an **HTTP 402 Payment Required** with an invoice, instead of a 429.
4. The agent autonomously pays AVAX on the Avalanche Fuji network and submits the transaction hash.
5. NeuralControl verifies the transaction on-chain and grants temporary "Burst Access" allowing the agent to bypass the rate limits.

> **⚠️ Setup Requirement:** To use this feature, you must deploy the `ERC8004Registry.sol` smart contract (using Remix or Hardhat) to the Avalanche Fuji C-Chain and set the `ERC8004_CONTRACT_ADDRESS` in your Control Plane `.env` file. Without this, NeuralControl cannot verify agent reputations.

### Implementation Example:

```javascript
import axios from 'axios';

app.get(
  "/api/data",
  controlPlane.middleware("/api/data"),
  async (req, res) => {
    
    // 1. If NeuralControl flags the request as rate-limited
    if (req.controlPlane.isRateLimitedCustomer) {
      
      const agentId = req.headers['x-agent-id'];
      
      // 2. If it's an AI Agent, ask NeuralControl for a payment invoice
      if (agentId) {
        try {
          const invoiceRes = await axios.post(
            `https://api.neuralcontrol.online/api/agentic/invoice/my-service/api/data`,
            { agent_id: agentId },
            { headers: { Authorization: `Bearer ${process.env.CONTROL_PLANE_API_KEY}` } }
          );
          
          const invoice = invoiceRes.data;

          // 3. If they already paid, override the rate limit and grant burst access
          if (invoice.status === 'authorized') {
            return res.json(await getData()); 
          }

          // 4. Otherwise, return the x402 invoice
          return res.status(402).json({
            error: 'x402 Payment Required',
            invoice_id: invoice.invoice_id,
            pay_to_wallet: invoice.pay_to_wallet,
            amount_wei: invoice.amount_wei,
            verify_url: invoice.verify_url,
            reason: 'Agent rate limit reached. Pay to unlock burst access.'
          });
        } catch (err) {
          // Untrusted agent or payment system disabled -> fall through to normal 429
        }
      }

      // Normal human or untrusted bot -> standard 429 block
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // Normal processing if no rate limits are hit
    res.json(await getData());
  }
);
```

---

## Multi-Tenant Rate Limiting

Each tenant gets isolated rate limits for fair resource allocation.

### Different Limits per Tenant

```javascript
// Tenant A (Free tier)
const sdkA = new ControlPlaneSDK({
  apiKey: process.env.API_KEY_FREE,
  tenantId: "tenant-free-123",
  serviceName: "api-service",
});

// Tenant B (Premium tier)
const sdkB = new ControlPlaneSDK({
  apiKey: process.env.API_KEY_PREMIUM,
  tenantId: "tenant-premium-456",
  serviceName: "api-service",
});
```

**AI automatically adjusts limits based on:**

- Tenant tier (detected from API key)
- Historical usage patterns
- Fair usage policies

---

## Best Practices

###  DO

1. **Always Include Retry Information**

   ```javascript
   if (req.controlPlane.isRateLimitedCustomer) {
     res.set("Retry-After", req.controlPlane.retryAfter);
   }
   ```

2. **Log Rate Limit Events**

   ```javascript
   if (req.controlPlane.isRateLimitedCustomer) {
     logger.warn("Rate limit hit", {
       endpoint: req.path,
       tenant: tenantId,
       retryAfter: req.controlPlane.retryAfter,
     });
   }
   ```

3. **Provide Clear Error Messages**
   ```javascript
   return res.status(429).json({
     error: "Rate limit exceeded",
     message: `Too many requests. Please try again in ${req.controlPlane.retryAfter} seconds.`,
     retryAfter: req.controlPlane.retryAfter,
   });
   ```

###  DON'T

1. **Don't Ignore Rate Limits**

   ```javascript
   // BAD: Ignoring rate limit
   app.get(
     "/api/data",
     controlPlane.middleware("/api/data"),
     async (req, res) => {
       // Not checking req.controlPlane.isRateLimitedCustomer
       res.json(await getData());
     },
   );
   ```

2. **Don't Use Generic 500 Errors**

   ```javascript
   // BAD: Wrong status code
   if (req.controlPlane.isRateLimitedCustomer) {
     return res.status(500).json({ error: "Error" }); // Should be 429
   }
   ```

3. **Don't Hide Limit Information**
   ```javascript
   // BAD: Not telling user why they're limited
   if (req.controlPlane.isRateLimitedCustomer) {
     return res.status(429).send("Error");
   }
   ```

---

## Monitoring Rate Limits

### View in Dashboard

1. Open dashboard at http://localhost:3000
2. Navigate to **Services** → Your Service
3. View **Rate Limit Metrics**:
   - Current rate limit status
   - Limit violations
   - Historical trends

### Real-Time Updates via SSE

The dashboard uses Server-Sent Events for live rate limit updates:

```javascript
// Dashboard automatically receives updates
// No polling needed!
```

---

## Troubleshooting

### Rate Limits Too Strict?

**Check:**

- Is your service under high load?
- Are error rates elevated?
- Is latency degrading?

**Solution:**

- AI will automatically relax limits when conditions improve
- View AI insights in dashboard to understand why limits changed

### Rate Limits Too Lenient?

**Check:**

- Is traffic lower than usual?
- Are resources underutilized?

**Solution:**

- AI adapts to traffic patterns over time
- Limits will tighten automatically during traffic spikes

### Rate Limit Not Working?

**Check:**

1. Middleware is applied to route
2. `req.controlPlane.isRateLimitedCustomer` exists
3. API key is valid
4. Tenant ID is correct

```javascript
// Debug middleware
app.get("/api/test", controlPlane.middleware("/api/test"), (req, res) => {
  console.log("Control Plane Data:", req.controlPlane);
  res.json(req.controlPlane);
});
```

---

## Related Features

- 📖 [Load Shedding](./LOAD_SHEDDING.md) - Graceful degradation under extreme load
- 📖 [Queue Deferral](./QUEUE_DEFERRAL.md) - Async request processing
- 📖 [AI Decisions](./AI_DECISIONS.md) - How AI determines limits

---

## Summary

Rate limiting with AI Control Plane:

- Automatic, AI-driven limits
- Per-tenant isolation
- Real-time adjustments
- Standards-compliant (HTTP 429, Retry-After)
- Easy SDK integration
- Live monitoring via SSE

**Next:** Learn about [Load Shedding](./LOAD_SHEDDING.md) for handling traffic spikes.
