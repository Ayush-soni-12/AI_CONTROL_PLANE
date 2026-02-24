# 🚀 Getting Started with AI Control Plane

Get up and running in **5 minutes** with intelligent traffic management for your microservices.

## Prerequisites

- **Node.js SDK**: Node.js >= 18.0.0
- **Python SDK**: Python >= 3.9 + pip
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
npm install @ayushsoni12/ai-control-plane
```

### Python / FastAPI

```bash
pip install ai-control-plane-sdk
```

> **FastAPI extra** (installs Starlette if not already present):
>
> ```bash
> pip install "ai-control-plane-sdk[fastapi]"
> ```

---

## Step 5: Configure Your Service

Create a `.env` file in your project:

```bash
# .env
CONTROL_PLANE_API_KEY=acp_2d936ad37aae3cea5635b46db3708d93897c96af
CONTROL_PLANE_URL=http://localhost:8000
TENANT_ID=bfc3aed7948e46fafacac26faf8b3159
SERVICE_NAME=my-awesome-service
```

---

## Step 6: Initialize the SDK

### Node.js / Express

```javascript
// server.js
import express from "express";
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";
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

### Python / FastAPI

```python
# main.py
import os
from fastapi import FastAPI
from dotenv import load_dotenv
from ai_control_plane import ControlPlaneSDK

load_dotenv()

app = FastAPI()

sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name=os.getenv("SERVICE_NAME", "my-awesome-service"),
    control_plane_url=os.getenv("CONTROL_PLANE_URL", "http://localhost:8000"),
)
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
      return res
        .status(202)
        .json({
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

app.listen(3001, () => console.log("🚀 Service running on port 3001"));
```

---

### Python / FastAPI — Per-Route `Depends()` (Recommended)

The Python SDK uses FastAPI's `Depends()` system instead of Express middleware.
Add it to individual routes for full per-endpoint control:

```python
from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from ai_control_plane import ControlPlaneSDK
from ai_control_plane.middleware import control_plane_dep

app = FastAPI()
sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name="my-awesome-service",
)

cache = {}

@app.get("/api/products")
async def get_products(
    request: Request,
    # Equivalent of controlPlane.middleware("/api/products") in Node.js
    cp=Depends(control_plane_dep(sdk, "/api/products", priority="medium")),
):
    # cp is the same as req.controlPlane in Node.js

    if cp["is_rate_limited_customer"]:
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(cp["retry_after"])},
            content={"error": "Rate limit exceeded", "retry_after": cp["retry_after"]},
        )

    if cp["is_load_shedding"]:
        return JSONResponse(
            status_code=503,
            content={"error": "Service temporarily unavailable", "retry_after": cp["retry_after"]},
        )

    if cp["is_queue_deferral"]:
        return JSONResponse(
            status_code=202,
            content={"message": "Request queued", "estimated_wait": cp["estimated_delay"]},
        )

    if cp["should_cache"] and "products" in cache:
        return {"source": "cache", "data": cache["products"]}

    products = await get_products_from_db()

    if cp["should_cache"]:
        cache["products"] = products

    return {"source": "database", "data": products}
```

**Run it:**

```bash
uvicorn main:app --port 4001 --reload
```

> [!TIP]
> **Node.js → Python Quick Reference**
>
> | Node.js (`req.controlPlane`) | Python (`cp` dict)               |
> | ---------------------------- | -------------------------------- |
> | `shouldCache`                | `cp["should_cache"]`             |
> | `shouldSkip`                 | `cp["should_skip"]`              |
> | `isRateLimitedCustomer`      | `cp["is_rate_limited_customer"]` |
> | `isLoadShedding`             | `cp["is_load_shedding"]`         |
> | `isQueueDeferral`            | `cp["is_queue_deferral"]`        |
> | `retryAfter`                 | `cp["retry_after"]`              |
> | `estimatedDelay`             | `cp["estimated_delay"]`          |

---

## Step 8: Test Your Integration

### Node.js

```bash
curl http://localhost:3001/api/products
```

### Python / FastAPI

```bash
curl http://localhost:4001/api/products
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

### `request.state.control_plane` is undefined (FastAPI)

**Solution:**

1. Make sure you have the `Depends()` on the route, not just imported
2. Check that the `sdk` object is initialized before the route is defined
3. Verify the SDK package is installed: `pip show ai-control-plane-sdk`

```python
# Correct ✅
@app.get("/api/products")
async def get_products(
    cp=Depends(control_plane_dep(sdk, "/api/products")),  # ← required
):
    print(cp["should_cache"])  # ✅ defined

# Wrong ❌ — no Depends, cp will not be injected
@app.get("/api/products")
async def get_products():
    ...
```

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
