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
});
```

---

## Step 7: Add Middleware to Your Routes

### Node.js / Express

```javascript
// Simple endpoint with automatic traffic management
app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
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

    if (isRateLimitedCustomer) {
      return res.status(429).json({ error: "Rate limit exceeded", retryAfter });
    }
    if (isLoadShedding) {
      return res
        .status(503)
        .json({ error: "Service temporarily unavailable", retryAfter });
    }
    if (isQueueDeferral) {
      const jobId = `job-${Date.now()}`;
      await queueJob(jobId, req.body);
      return res.status(202).json({
        message: "Request queued",
        jobId,
        estimatedWait: estimatedDelay,
      });
    }
    if (shouldCache && cache.products) {
      return res.json({ source: "cache", data: cache.products });
    }

    const products = await getProductsFromDB();
    if (shouldCache) cache.products = products;
    res.json({ source: "database", data: products });
  },
);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Service running on port ${PORT}`);
  // Initialize Control Plane SDK with known endpoints
  await controlPlane.initialize(["/api/products"]);
});
```

---

## Step 8: Test Your Integration

### Node.js

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

- ✅ **Automatic Caching** - AI decides when to cache based on latency
- ✅ **Rate Limiting** - Protects against abuse and traffic spikes
- ✅ **Load Shedding** - Graceful degradation under high load
- ✅ **Queue Deferral** - Async processing for non-critical requests
- ✅ **Circuit Breaking** - Prevents cascade failures
- ✅ **Real-time Monitoring** - Live dashboards with SSE updates

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
- 📖 [Learn about Load Shedding](./LOAD_SHEDDING.md)
- 📖 [Learn about Queue Deferral](./QUEUE_DEFERRAL.md)
- 📖 [Understand AI Decisions](./AI_DECISIONS.md)
- 📖 [Full Configuration Guide](./CONFIGURATION.md)
- 📖 [SDK Quick Reference](./SDK_QUICK_REFERENCE.md)

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
