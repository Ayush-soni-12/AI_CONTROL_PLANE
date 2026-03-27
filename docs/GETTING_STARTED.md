# 🚀 Getting Started with AI Control Plane

Get up and running in **5 minutes** with intelligent traffic management for your microservices.

## Prerequisites

- **Node.js SDK**: Node.js >= 18.0.0
- A running AI Control Plane instance (or use Docker Compose)
- Terminal access (for generating tenant ID)

## Step 1: Start the Control Plane

### Option A: Docker Compose (Recommended)

```bash
git clone https://github.com/Ayush-soni-12/AI_CONTROL_PLANE.git
cd AI_CONTROL_PLANE
docker-compose up -d
```

**Services will be available at:**

- Control Plane API: http://localhost:8000
- Dashboard: http://localhost:3000
- Redis Insight: http://localhost:5540
- pgAdmin: http://localhost:5051

### Option B: Manual Setup

See [Installation Guide](./README.md#option-2-manual-setup) for detailed instructions.

---

## Step 2: Generate Your API Key

1. **Open the dashboard** at http://localhost:3000
2. **Sign up** or log in to your account
3. Navigate to **API Keys** section
4. Click **"Generate New Key"**
5. **Copy and save** your API key securely

```
Example API Key: acp_2d936ad37aae3cea5635b46db3708d93897c96af
```

> [!IMPORTANT]
> **API Key Security**
>
> - Never commit API keys to version control
> - Use environment variables for storage
> - Generate different keys for each service/environment
> - Rotate keys regularly

---

## Step 3: Generate Your Tenant ID

Each service instance needs a unique tenant ID for isolation and multi-tenancy support.

**Generate using OpenSSL:**

```bash
openssl rand -hex 16
```

**Example output:**

```
bfc3aed7948e46fafacac26faf8b3159
```

> [!TIP]
> **Best Practices for Tenant IDs**
>
> - Use different tenant IDs for each service
> - Use different tenant IDs for different environments (dev, staging, prod)
> - Store in environment variables, not hardcoded
> - Keep track of which tenant ID belongs to which service

---

## Step 4: Install the SDK

### Node.js / Express

```bash
npm install neuralcontrol
```

---

## Step 5: Configure Your Service

Create a `.env` file in your project:

```bash
# .env
CONTROL_PLANE_API_KEY=acp_2d936ad37aae3cea5635b46db3708d93897c96af
CONTROL_PLANE_URL=https://api.neuralcontrol.online
TENANT_ID=bfc3aed7948e46fafacac26faf8b3159
SERVICE_NAME=my-awesome-service
```

---

## Step 6: Initialize the SDK

### Node.js / Express

```javascript
// server.js
import express from "express";
import ControlPlaneSDK from "neuralcontrol";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: process.env.SERVICE_NAME,
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
  featureFlags: true, // 👈 Enable Feature Flags
  tracing: true,      // 👈 Enable Distributed Tracing
});
```

---

## Step 7: Integrate the SDK into Your Routes

The SDK provides **4 integration methods**, each suited for a different use case. Here's a quick comparison:

| Method                                            | What it does                                       | Best for                          |
| ------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| `middleware(endpoint, options)`                   | Attaches all 6 feature flags to `req.controlPlane` | Routes where YOU handle each flag |
| `withEndpointTimeout(endpoint, handler, options)` | Same flags + auto-kills slow handlers with a 504   | Routes with slow DB calls or APIs |
| `adaptiveFetch(configEndpoint, url, options)`     | Drop-in for `fetch()` with AI timeout              | Individual external API calls     |
| `withDbTimeout(configEndpoint, fn, priority)`     | Wraps a DB query with AI timeout                   | Individual database queries       |
| `req.controlPlane.coalesce(key, fn)`              | Collapses simultaneous requests into one execution | Preventing identical DB/API calls |

### Method 1: `middleware()` — Full Feature Flags

Use this when you want to check **every feature flag yourself** and handle each one with custom logic.

```javascript
app.get(
  "/api/products",
  controlPlane.middleware("/api/products", { priority: "medium" }),
  async (req, res) => {
    const {
      shouldCache,
      shouldSkip,
      isRateLimitedCustomer,
      isLoadShedding,
      isQueueDeferral,
      retryAfter,
      estimatedDelay,
    } = req.controlPlane;

    // 1. Circuit Breaker
    if (shouldSkip) {
      return res.status(503).json({ error: "Service unavailable", retryAfter });
    }
    // 2. Rate Limiting
    if (isRateLimitedCustomer) {
      res.set("Retry-After", retryAfter);
      return res.status(429).json({ error: "Too many requests", retryAfter });
    }
    // 3. Load Shedding
    if (isLoadShedding) {
      return res
        .status(503)
        .json({ error: "System under high load", retryAfter });
    }
    // 4. Queue Deferral
    if (isQueueDeferral) {
      await queue.add("fetch-products", req.body);
      return res
        .status(202)
        .json({ message: "Request queued", estimatedDelay });
    }
    // 5. Dynamic Caching
    if (shouldCache) {
      const cached = await redis.get("cache:products");
      if (cached) return res.json({ cached: true, data: JSON.parse(cached) });
    }

    const products = await db.getProducts();
    if (shouldCache)
      await redis.setex("cache:products", 300, JSON.stringify(products));
    res.json({ cached: false, data: products });
  },
);
```

> **Note:** `middleware()` does NOT enforce adaptive timeouts automatically.
> It only provides the flags — your handler can still hang forever if the DB is slow.
> Use `withEndpointTimeout()` if you need automatic timeout enforcement.

### Method 2: `withEndpointTimeout()` — Auto-Timeout + Feature Flags

This does everything `middleware()` does **plus** automatically kills the handler if it takes longer than the AI-set timeout. If the handler exceeds the limit, the SDK returns a `504 Gateway Timeout` response.

```javascript
app.get(
  "/api/products",
  controlPlane.withEndpointTimeout(
    "/api/products",
    async (req, res) => {
      // ✅ req.controlPlane is available here (same flags as middleware)
      if (req.controlPlane.shouldSkip) {
        return res.status(503).json({ error: "Service unavailable" });
      }

      // If this DB call takes longer than the AI threshold → 504 returned automatically
      const products = await db.getProducts();
      res.json(products);
    },
    { priority: "high" },
  ),
);
```

### Method 3: `adaptiveFetch()` — For External API Calls

Drop-in replacement for `fetch()`. AI enforces the timeout + auto-tracks latency signals.

```javascript
try {
  const result = await controlPlane.adaptiveFetch(
    "/payments/gateway", // config key (for timeout lookup)
    "https://payment-api.com/charge", // actual URL
    { method: "POST", body: JSON.stringify(data) },
  );
  const data = await result.json();
} catch (err) {
  // Payment API timed out → handle gracefully
  console.error("Payment gateway slow, deferring...");
}
```

### Method 4: `withDbTimeout()` — For Database Queries

Wraps any Promise-returning DB call with the AI-tuned timeout.

```javascriptl
const users = await controlPlane.withDbTimeout(
  "/db/users", // config key
  () => prisma.user.findMany(), // any Promise-returning function
  "high", // priority (optional, default: 'medium')
);
```

> [!WARNING]
> **Endpoint Key Separation**
> Always use a **different string** for the endpoint key in `withDbTimeout` and `adaptiveFetch` than the one you use for the main route's `middleware()`. 
> 
> ❌ **BAD:** `app.get('/users', middleware('/users'), ... withDbTimeout('/users', ...))`
> This mixes the database inner-latency metrics with the outer HTTP latency metrics, destroying the AI's accuracy.
> 
> ✅ **GOOD:** `app.get('/users', middleware('/users'), ... withDbTimeout('/db/get-users', ...))`
> Cleanly isolates internal metrics from external API metrics.

### Method 5: `req.controlPlane.coalesce()` — Request Coalescing

Prevents "Cache Stampedes" by collapsing simultaneous identical requests into a single execution. The SDK strictly enforces data isolation, so you must explicitly wrap database queries or external fetches using a unique string key.

```javascript
app.get('/expensive-report', controlPlane.middleware('/report'), async (req, res) => {
  // If 50 users request this at the exact same millisecond, 
  // the inner function only runs ONCE!
  const reportData = await req.controlPlane.coalesce('daily-report-generation', async () => {
    return await generateExpensiveReport();
  });
  res.json(reportData);
});
```

### The `priority` Parameter

All middleware/timeout methods accept a **priority** level. This tells the AI which endpoints to protect FIRST during system overload:

| Priority             | Meaning                      | Example Endpoints           |
| -------------------- | ---------------------------- | --------------------------- |
| `'critical'`         | Never shed — always process  | `/checkout`, `/login`       |
| `'high'`             | Shed only under extreme load | `/products`, `/search`      |
| `'medium'` (default) | Normal shedding priority     | `/api/recommendations`      |
| `'low'`              | Shed first during overload   | `/analytics`, `/send-email` |

---

## Step 8: Pre-warm and Start 🚀

```javascript
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Service running on port ${PORT}`);
  // Pre-warm the config cache for all endpoints
  await controlPlane.initialize([
    "/api/products",
    "/api/users",
    "/payments/gateway",
  ]);
});
```

### Test Your Integration

```bash
curl http://localhost:3001/api/products
```

### View Live Metrics

1. Open dashboard at http://localhost:3000
2. Navigate to **Services** section
3. See your service with real-time metrics
4. Watch AI decisions update live via SSE

---

## 🎉 You're Done!

Your service is now protected by AI-powered traffic management with:

- **Automatic Caching** - AI decides when to cache based on latency
- **Rate Limiting** - Protects against abuse and traffic spikes
- **Load Shedding** - Graceful degradation under high load
- **Queue Deferral** - Async processing for non-critical requests
- **Circuit Breaking** - Prevents cascade failures
- **Adaptive Timeout** - Dynamically enforces strict latency boundaries
- **Request Coalescing** - Automatically collapses simultaneous identical requests
- **Feature Flags** - Zero-latency feature rollout with AI auto-kill
- **Distributed Tracing** - OpenTelemetry-compatible internal span tracking
- **Real-time Monitoring** - Live dashboards with SSE updates

---

## Multi-Service Setup

### Different API Keys for Each Service

```bash
# Service A (.env)
CONTROL_PLANE_API_KEY=acp_key_for_service_a
TENANT_ID=tenant_id_for_service_a
SERVICE_NAME=user-service

# Service B (.env)
CONTROL_PLANE_API_KEY=acp_key_for_service_b
TENANT_ID=tenant_id_for_service_b
SERVICE_NAME=product-service
```

**Why different keys?**

- Independent rate limits and quotas
- Isolated metrics and analytics
- Better security (key compromise affects only one service)
- Easier debugging and monitoring

---

## Next Steps

- 📖 [Learn about Rate Limiting](./RATE_LIMITING.md)
- 📖 [Learn about Feature Flags](./FEATURE_FLAGS.md)
- 📖 [Learn about Distributed Tracing](./TRACING.md)
- 📖 [Learn about Load Shedding](./LOAD_SHEDDING.md)
- 📖 [Learn about Queue Deferral](./QUEUE_DEFERRAL.md)
- 📖 [Understand AI Decisions](./AI_DECISIONS.md)
- 📖 [Full Configuration Guide](./CONFIGURATION.md)
- 📖 [SDK Quick Reference](./SDK_QUICK_REFERENCE.md)
- 📖 [Learn about Circuit Breaker](./CIRCUIT_BREAKER.md)
- 📖 [Learn about Caching Strategy](./CACHING.md)
- 📖 [Learn about Adaptive Timeout](./ADAPTIVE_TIMEOUT.md)
- 📖 [Learn about Request Coalescing](./REQUEST_COALESCING.md)
- 📖 [Learn about MCP Integration](./MCP.md)

---

## Troubleshooting

### "API key invalid" error

**Solution:**

1. Verify your API key is correct (check dashboard)
2. Ensure it's properly loaded from `.env`
3. Check for extra spaces or quotes in the key

```javascript
// Debug API key loading
console.log("API Key:", process.env.CONTROL_PLANE_API_KEY);
```

### "Connection refused" error

**Solution:**

1. Ensure Control Plane is running: `docker-compose ps`
2. Check the URL is correct: `http://localhost:8000`
3. Verify network connectivity

```bash
# Test Control Plane health
curl http://localhost:8000/
```

### Dashboard not showing my service

**Solution:**

1. Ensure you've sent at least one request
2. Check tenant ID is correct
3. Verify service name in SDK config matches dashboard filter

### `req.controlPlane` is undefined (Node.js)

**Solution:**

1. Make sure middleware is applied to the route
2. Check middleware is called before route handler
3. Verify SDK initialization is complete

```javascript
// Correct order
app.get(
  "/api/data",
  controlPlane.middleware("/api/data"), // Middleware first
  async (req, res) => {
    // Handler second
    console.log(req.controlPlane); // Should be defined
  },
);
```

---

## Support

- 📖 [Full Documentation](./README.md)
- 🐛 [Report Issues](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/issues)
- 💬 [GitHub Discussions](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/discussions)

---

**Ready for production?** Check out our [Configuration Guide](./CONFIGURATION.md) for deployment best practices.
