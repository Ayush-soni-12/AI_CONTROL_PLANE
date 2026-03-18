# AI Control Plane SDK - Node.js

Easy integration for autonomous runtime control in your microservices. The SDK automatically tracks API performance and receives intelligent runtime configurations from the AI Control Plane.

## Installation

```bash
npm install neuralcontrol
```

## Links

- **GitHub Repository**: [https://github.com/Ayush-soni-12/AI_CONTROL_PLANE](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- **npm Package**: [https://www.npmjs.com/package/neuralcontrol](https://www.npmjs.com/package/neuralcontrol)

For more information, documentation, and examples, visit the GitHub repository.

## What Does This SDK Do?

The AI Control Plane SDK provides:

1. **Secure API Key Authentication**: All operations are authenticated with your API key
2. **Automatic Performance Tracking**: Monitors API latency and success/failure rates
3. **Intelligent Runtime Configuration**: Receives AI-driven decisions for caching, circuit breaking, and more
4. **Tenant ID Generation**: Creates unique identifiers for multi-tenant applications
5. **Express Middleware**: Easy integration with Express.js applications

The SDK sends performance metrics to the AI Control Plane, which analyzes patterns and returns intelligent configuration decisions to optimize your service automatically.

## Quick Start (5 minutes)

### 0. Get Your API Key

**⚠️ IMPORTANT**: API key authentication is now required for all SDK operations.

1. **Sign up** at your Control Plane dashboard (e.g., `https://neuralcontrol.online/dashboard/api-keys`)
2. Navigate to **API Keys** page
3. Click **"Generate New Key"**
4. Copy your API key

### 1. Generate Tenant ID

**Generate a unique tenant ID using OpenSSL:**

```bash
openssl rand -hex 16
```

This will output a random 32-character hexadecimal string like: `bfc3aed7948e46fafacac26faf8b3159`

**💡 Tip**: Save this tenant ID in your environment variables or configuration file. Each service instance or user should have a unique tenant ID.

### 2. Initialize SDK with API Key

```javascript
import ControlPlaneSDK from "neuralcontrol";
import dotenv from "dotenv";

dotenv.config();

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // ⚠️ REQUIRED
  tenantId: process.env.TENANT_ID, // ⚠️ REQUIRED - Generate using: openssl rand -hex 16
  serviceName: "my-service",
  controlPlaneUrl:
    process.env.CONTROL_PLANE_URL || "https://api.neuralcontrol.online",
});

// Pre-warm config for known endpoints (Recommended for 0ms latency overlay)
await controlPlane.initialize(["/products", "/products/:id?", "/login"]);
```

### 3. Use Middleware (Automatic Tracking)

**Real Example from Demo Service:**

```javascript
import express from "express";
import ControlPlaneSDK from "neuralcontrol";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // Required
  tenantId: process.env.TENANT_ID, // Required - Generate with: openssl rand -hex 16
  serviceName: "demo-service",
  controlPlaneUrl:
    process.env.CONTROL_PLANE_URL || "https://api.neuralcontrol.online",
});

// Example: Product API with automatic tracking
app.get(
  "/products/:id?",
  controlPlane.middleware("/products"),
  async (req, res) => {
    const { id } = req.params;

    // Simulate database delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (id) {
      // Get single product
      const product = { id: parseInt(id), name: "Laptop", price: 999 };
      res.json({ product });
    } else {
      // Get all products
      const products = [
        { id: 1, name: "Laptop", price: 999 },
        { id: 2, name: "Phone", price: 699 },
      ];
      res.json({ products });
    }
  },
);

// Start server and initialize SDK
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Initialize Control Plane SDK with known endpoints
  await controlPlane.initialize(["/products", "/products/:id?"]);
});
```

**What happens automatically:**

- ✅ Tracks request latency
- ✅ Tracks success/failure status
- ✅ Sends metrics to Control Plane with API key authentication
- ✅ Receives runtime configuration (caching, circuit breaker decisions)
- ✅ Makes config available in `req.controlPlane`

## API Authentication

### Overview

All SDK operations require API key authentication. The SDK automatically includes your API key in the `Authorization` header for all requests to the Control Plane.

### Getting an API Key

1. Sign up at your Control Plane dashboard
2. Navigate to the **API Keys** page
3. Click **"Generate New Key"**
4. Copy and securely store your API key

### Authentication Flow

```
SDK Request → Authorization: Bearer <api_key> → Control Plane
                                                      ↓
                                                 Validates Key
                                                      ↓
                                              Associates with User
                                                      ↓
                                               Stores Signal
```

### Error Handling

The SDK handles authentication errors gracefully:

**Missing API Key:**

```javascript
// ⚠️ Warning logged to console
const controlPlane = new ControlPlaneSDK({
  serviceName: "my-service",
});
// Console: [ControlPlane] ⚠️ No API key provided. Please initialize the SDK with an API key.
```

**Invalid API Key:**

- Requests will fail silently (SDK doesn't crash your service)
- Errors logged to console
- Signals won't be tracked

**Best Practices:**

1. **Use Environment Variables**

   ```javascript
   apiKey: process.env.CONTROL_PLANE_API_KEY;
   ```

2. **Never Commit API Keys**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for documentation

3. **Rotate Keys Regularly**
   - Generate new keys periodically
   - Delete old keys from dashboard

4. **Monitor Key Usage**
   - Check "Last Used" timestamp in dashboard
   - Deactivate unused keys

## API Reference

### `middleware(endpoint, options)`

Express middleware for automatic tracking. You can now pass a priority level (`critical`, `high`, `medium`, `low`) for load shedding rules.

**Example:**

```javascript
app.get(
  "/products",
  controlPlane.middleware("/products", { priority: "high" }),
  (req, res) => {
    // Config available in req.controlPlane
    // Check req.controlPlane.isRateLimitedCustomer, req.controlPlane.isLoadShedding etc.
  },
);
```

### `withEndpointTimeout(endpoint, handler, options)`

Wraps an Express route handler with an AI-calculated adaptive timeout. Drops requests if they exceed the calculated baseline.

**Example:**

```javascript
app.get(
  "/slow-api",
  controlPlane.withEndpointTimeout("/slow-api", async (req, res) => {
    // Handler code here - will be terminated early if an AI timeout triggers
  }),
);
```

### `adaptiveFetch(configEndpoint, url, options)`

Drop-in replacement for `fetch()` that enforces the AI-calculated adaptive timeout automatically and tracks latency automatically.

**Example:**

```javascript
const res = await controlPlane.adaptiveFetch(
  "/external-api",
  "https://api.example.com/data",
);
```

### `withDbTimeout(configEndpoint, dbQueryFn, priority)`

Wraps any database query with the AI-calculated adaptive timeout. Works with Prisma, Sequelize, raw pg, etc.

**Example:**

```javascript
const users = await controlPlane.withDbTimeout("/db/users", () =>
  prisma.user.findMany(),
);
```

### `req.controlPlane.coalesce(key, fn)`

Prevents "Cache Stampedes" by collapsing simultaneous identical requests into a single execution. The SDK strictly enforces data isolation, so you must explicitly wrap database queries or external fetches using a unique string key.

**Example:**

```javascript
const result = await req.controlPlane.coalesce("unique-db-key", () =>
  controlPlane.withDbTimeout("/db/query", () => db.expensiveQuery())
);
```

## Use Cases

### Automatic Caching

```javascript
app.get("/products", controlPlane.middleware("/products"), async (req, res) => {
  // Check cache
  if (req.controlPlane.shouldCache && cache.products) {
    return res.json(cache.products);
  }

  // Fetch from database
  const products = await db.getProducts();

  // Cache if enabled
  if (req.controlPlane.shouldCache) {
    cache.products = products;
  }

  res.json(products);
});
```

### Circuit Breaker

```javascript
app.get(
  "/external-api",
  controlPlane.middleware("/external-api"),
  async (req, res) => {
    // Skip if circuit breaker active
    if (req.controlPlane.shouldSkip) {
      return res.json({ data: cachedData || [] });
    }

    // Call external API
    const data = await externalAPI.getData();
    res.json(data);
  },
);
```

## Current Features

This SDK currently provides:

- ✅ **API Key Authentication** - Secure authentication for all SDK operations
- ✅ **Performance Tracking** - Latency and success/error rate monitoring
- ✅ **Runtime Configuration** - AI-driven decisions from Control Plane
- ✅ **Express Middleware** - Automatic tracking with zero code changes
- ✅ **Adaptive Timeouts** - Dynamically abort requests when latency spikes using AI thresholds
- ✅ **Request Coalescing** - Auto-collapses identical simultaneous requests to protect backend capacity
- ✅ **Traffic Management** - Support for Load Shedding, Rate Limiting, and Queue Deferral natively
- ✅ **Tenant ID Generation** - Multi-tenant application support
- ✅ **Configuration Caching** - Reduces Control Plane load locally
- ✅ **Graceful Error Handling** - Fails silently without crashing your service

## AI-Powered Debugging (MCP)

Get live insights, explain performance issues, and automate SDK integration directly in your AI code editor (Cursor, Claude Desktop, Windsurf) using our **MCP Server**.

### 1. Install Global Tool
```bash
pip install neuralcontrol-mcp
```

### 2. Configure Your Editor
Add this to your editor's MCP settings:

```json
{
  "mcpServers": {
    "neuralcontrol": {
      "command": "neuralcontrol-mcp",
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

> [!TIP]
> Use `https://api.neuralcontrol.online` for the managed service.

### 3. Ask Your AI
Once connected, you can ask things like:
- *"Analyze why `/products` is slow and suggest a fix"*
- *"Set up all 6 protection flags for my new route"*
- *"Are there any active latency spikes?"*

---

## Requirements

- Node.js >= 18.0.0
- Express.js (for middleware usage)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE).

## License

MIT
