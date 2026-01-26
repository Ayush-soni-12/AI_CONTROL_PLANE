# AI Control Plane SDK - Node.js

Easy integration for autonomous runtime control in your microservices. The SDK automatically tracks API performance and receives intelligent runtime configurations from the AI Control Plane.

## Installation

```bash
npm install @ayushsoni12/ai-control-plane-sdk
```

## Links

- **GitHub Repository**: [https://github.com/Ayush-soni-12/AI_CONTROL_PLANE](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- **npm Package**: [https://www.npmjs.com/package/@ayushsoni12/ai-control-plane-sdk](https://www.npmjs.com/package/@ayushsoni12/ai-control-plane-sdk)

For more information, documentation, and examples, visit the GitHub repository.

## What Does This SDK Do?

The AI Control Plane SDK provides:

1. **Secure API Key Authentication**: All operations are authenticated with your API key
2. **Automatic Performance Tracking**: Monitors API latency and success/failure rates
3. **Intelligent Runtime Configuration**: Receives AI-driven decisions for caching, circuit breaking, and more
4. **Tenant ID Generation**: Creates unique identifiers for multi-tenant applications
5. **Express Middleware**: Easy integration with Express.js applications
6. **Manual Tracking**: Flexible API for custom tracking scenarios

The SDK sends performance metrics to the AI Control Plane, which analyzes patterns and returns intelligent configuration decisions to optimize your service automatically.

## Quick Start (5 minutes)

### 0. Get Your API Key

**⚠️ IMPORTANT**: API key authentication is now required for all SDK operations.

1. **Sign up** at your Control Plane dashboard (e.g., `http://localhost:3000`)
2. Navigate to **API Keys** page
3. Click **"Generate New Key"**
4. Copy your API key

### 1. Initialize SDK with API Key

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane-sdk";

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // ⚠️ REQUIRED
  serviceName: "my-service",
  controlPlaneUrl: "http://localhost:8000",
  tenantId: generateTenantId("user"), // Optional: for multi-tenancy
});
```

**Best Practice**: Store your API key in environment variables:

```bash
# .env file
CONTROL_PLANE_API_KEY=your-api-key-here
CONTROL_PLANE_URL=http://localhost:8000
```

```javascript
import dotenv from "dotenv";
dotenv.config();

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  serviceName: "my-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
});
```

### 2. Use Middleware (Automatic Tracking)

**Real Example from Demo Service:**

```javascript
import express from "express";
import ControlPlaneSDK, {
  generateTenantId,
} from "@ayushsoni12/ai-control-plane-sdk";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // Required
  serviceName: "demo-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || "http://localhost:8000",
  tenantId: generateTenantId("user"),
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

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
```

**What happens automatically:**

- ✅ Tracks request latency
- ✅ Tracks success/failure status
- ✅ Sends metrics to Control Plane with API key authentication
- ✅ Receives runtime configuration (caching, circuit breaker decisions)
- ✅ Makes config available in `req.controlPlane`

### 3. Manual Tracking (Without Middleware)

````javascript
app.post("/login", async (req, res) => {
  const start = Date.now();

  try {
    // Get config from Control Plane
    const config = await controlPlane.getConfig("/login");

    // Your business logic
    const result = await authenticate(req.body);

    // Track successful request (API key sent automatically)
    await controlPlane.track("/login", Date.now() - start, "success");

    res.json(result);
  } catch (error) {
    // Track failed request
    await controlPlane.track("/login", Date.now() - start, "error");
    res.status(500).json({ error: "Login failed" });
  }
});






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
  serviceName: "my-service"
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
   apiKey: process.env.CONTROL_PLANE_API_KEY
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

### `track(endpoint, latencyMs, status)`

Send performance signal to control plane.

**Parameters:**

- `endpoint` (string) - API endpoint (e.g., '/products')
- `latencyMs` (number) - Request latency in milliseconds
- `status` (string) - 'success' or 'error'

**Example:**

```javascript
await controlPlane.track("/api/users", 245, "success");
````

### `getConfig(endpoint)`

Get runtime configuration from control plane.

**Returns:**

```javascript
{
  cache_enabled: true/false,
  circuit_breaker: true/false,
  reason: "explanation"
}
```

**Example:**

```javascript
const config = await controlPlane.getConfig("/products");
if (config.cache_enabled) {
  // Use cache
}
```

### `middleware(endpoint)`

Express middleware for automatic tracking.

**Example:**

```javascript
app.get("/products", controlPlane.middleware("/products"), (req, res) => {
  // Config available in req.controlPlane
});
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
- ✅ **Manual Tracking API** - Flexible tracking for custom scenarios
- ✅ **Tenant ID Generation** - Multi-tenant application support
- ✅ **Configuration Caching** - Reduces Control Plane load
- ✅ **Graceful Error Handling** - Fails silently without crashing your service

## Requirements

- Node.js >= 18.0.0
- Express.js (for middleware usage)

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE).

## License

MIT
