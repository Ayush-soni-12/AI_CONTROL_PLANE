# 🔄 Dynamic Caching Guide

Improve response times and reduce database load with AI-powered intelligent caching.

## What is Dynamic Caching?

Dynamic caching stores frequently accessed data in fast memory (Redis) instead of repeatedly querying slow databases. The AI Control Plane automatically decides when to cache based on real-time latency patterns.

**Think of it as:** Keeping frequently ordered items at the front of a warehouse instead of walking to the back storage every time.

## When to Use Caching

### ✅ Perfect For:

- **Database-Heavy Endpoints** - Complex queries, joins, aggregations
- **Slow External APIs** - Third-party services with high latency
- **Read-Heavy Operations** - Product catalogs, user profiles, configuration
- **Static or Semi-Static Data** - Data that doesn't change frequently

### ❌ Not Suitable For:

- **Real-Time Data** - Stock prices, live scores, sensor readings
- **User-Specific Sensitive Data** - Unless properly keyed per user
- **Frequently Updated Data** - Data that changes multiple times per second
- **Small, Fast Queries** - Already fast operations (< 50ms)

### Example Scenarios:

```javascript
// Scenario 1: Product catalog ✅
app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
  async (req, res) => {
    // AI recommends caching if latency > threshold
  },
);

// Scenario 2: User profile ✅
app.get(
  "/api/users/:id",
  controlPlane.middleware("/api/users/:id"),
  async (req, res) => {
    // Cache per user ID
  },
);

// Scenario 3: Live stock price ❌
app.get(
  "/api/stock/:symbol",
  // DON'T cache - data changes constantly
  async (req, res) => {
    const price = await getLiveStockPrice(symbol);
    res.json({ price });
  },
);
```

---

## How AI Decides to Cache

The AI Control Plane analyzes multiple factors to recommend caching:

### Decision Factors:

1. **Latency Thresholds**
   - p50 latency > baseline
   - p95 latency > AI-tuned threshold (typically 500ms)
   - Consistent slow responses

2. **Request Patterns**
   - High request frequency
   - Same data requested repeatedly
   - Read-heavy workload

3. **Resource Usage**
   - Database connection pool saturation
   - Slow query patterns
   - External API delays

4. **Error Rates**
   - Database timeout errors
   - External API failures (cache as fallback)

---

## SDK Integration

### Basic Setup

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "my-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
});

app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
  async (req, res) => {
    // AI sets shouldCache based on latency
    if (req.controlPlane.shouldCache && cache.products) {
      return res.json({
        cached: true,
        data: cache.products,
      });
    }

    // Fetch from database
    const products = await getProductsFromDB();

    // Store in cache if recommended
    if (req.controlPlane.shouldCache) {
      cache.products = products;
    }

    res.json({
      cached: false,
      data: products,
    });
  },
);
```

### Available SDK Properties

```javascript
req.controlPlane = {
  // Caching
  shouldCache: boolean, // Should this response be cached?

  // Other traffic management
  isRateLimitedCustomer: boolean,
  isLoadShedding: boolean,
  isQueueDeferral: boolean,
  shouldSkip: boolean, // Circuit breaker

  // Metadata
  statusCode: number,
  reason: string,

  // Full config
  config: object,
};
```

---

## Production Caching with Redis

### ⚠️ Why NOT Use Simple Memory Cache?

**Memory cache (`const cache = {}`) is ONLY for demos!**

#### Problems in Production:

1. **Data Lost on Restart**

   ```
   12:00 PM - Server caches product list
   12:30 PM - Server crashes/restarts
   12:31 PM - Cache is EMPTY! All data LOST!
   ```

2. **Multiple Servers Can't Share**

   ```
   Server 1: cache = { '/products': [...] }
   Server 2: cache = {}  ← Different memory!
   Server 3: cache = {}  ← Different memory!

   User hits Server 2 → No cache → Slow!
   ```

3. **Memory Leaks**

   ```javascript
   // Cache grows forever until server crashes
   cache["/products"] = data1;
   cache["/search"] = data2;
   cache["/users"] = data3;
   // ... runs out of memory!
   ```

4. **No Expiration**
   ```
   Cache shows price: $100
   Database updated to: $80
   Cache still shows: $100 (stale!)
   ```

### ✅ Why Redis?

| Feature                   | Memory Cache | Redis        |
| ------------------------- | ------------ | ------------ |
| **Survives restart**      | ❌ No        | ✅ Yes       |
| **Shared across servers** | ❌ No        | ✅ Yes       |
| **Auto-expiration (TTL)** | ❌ No        | ✅ Yes       |
| **Memory management**     | ❌ Manual    | ✅ Automatic |
| **Production-ready**      | ❌ No        | ✅ Yes       |

**Redis Architecture:**

```
Your App Server 1 ──┐
Your App Server 2 ──┼──→ Redis Server (stores cache)
Your App Server 3 ──┘

All servers share the SAME cache!
```

---

## Redis Setup



Create `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7
    container_name: redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --requirepass your_password
      --appendonly yes
    restart: unless-stopped

  redisinsight:
    image: redis/redisinsight:latest
    container_name: redisinsight
    ports:
      - "5540:5540"
    restart: unless-stopped
    depends_on:
      - redis

volumes:
  redis_data:
```

Then run:

```bash
docker-compose up -d
```

**RedisInsight**: Access at http://localhost:5540 for GUI management

### Step 2: Install Redis Client

```bash
npm install redis
```

### Step 3: Create Redis Helper

Create `redis-helper.js`:

```javascript
const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.connect().catch(console.error);

redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("✅ Connected to Redis"));

// Generate consistent cache key
function getCacheKey(serviceName, endpoint) {
  return `cache:${serviceName}:${endpoint}`;
}

// Get from cache
async function getFromCache(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Cache read error:", error.message);
    return null; // App continues without cache
  }
}

// Store in cache with TTL
async function setInCache(key, data, ttlSeconds = 300) {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Cache write error:", error.message);
    return false;
  }
}

// Delete from cache
async function deleteFromCache(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error("Cache delete error:", error.message);
    return false;
  }
}

module.exports = {
  getCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache,
};
```

---

## Production Implementation

### Complete Example with Redis

```javascript
import express from "express";
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";
import {
  getCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache,
} from "./redis-helper.js";

const app = express();
app.use(express.json());

const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "product-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
});

// GET /products - With Redis caching
app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
  async (req, res) => {
    const cacheKey = getCacheKey("product-service", "/api/products");

    // Check cache if AI recommends it
    if (req.controlPlane.shouldCache) {
      const cached = await getFromCache(cacheKey);

      if (cached) {
        console.log("✅ Redis cache hit");
        return res.json({
          cached: true,
          products: cached,
        });
      }
    }

    // Cache miss - fetch from database
    console.log("💾 Fetching from database");
    const products = await db.getProducts();

    // Store in Redis (5 minutes TTL)
    if (req.controlPlane.shouldCache) {
      await setInCache(cacheKey, products, 300);
      console.log("💾 Stored in Redis (expires in 5 min)");
    }

    res.json({
      cached: false,
      products: products,
    });
  },
);

// PUT /products/:id - Update and invalidate cache
app.put("/api/products/:id", async (req, res) => {
  // Update database
  await db.updateProduct(req.params.id, req.body);

  // Invalidate cache
  const cacheKey = getCacheKey("product-service", "/api/products");
  await deleteFromCache(cacheKey);

  console.log("🗑️  Cache invalidated");

  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
```

---

## Cache Invalidation Strategies

### Strategy 1: Time-Based (TTL)

```javascript
// Short TTL for frequently changing data
await setInCache(cacheKey, data, 60); // 1 minute

// Long TTL for static data
await setInCache(cacheKey, data, 3600); // 1 hour
```

### Strategy 2: Event-Based

```javascript
// Invalidate when data changes
app.post("/api/products", async (req, res) => {
  await db.createProduct(req.body);

  // Clear product list cache
  await deleteFromCache(getCacheKey("product-service", "/api/products"));

  res.json({ success: true });
});
```

### Strategy 3: Hybrid (Recommended)

```javascript
// Use TTL + invalidate on update
app.get("/api/products", async (req, res) => {
  if (req.controlPlane.shouldCache) {
    const cached = await getFromCache(cacheKey);
    if (cached) return res.json({ cached: true, data: cached });
  }

  const products = await db.getProducts();

  // TTL of 5 minutes
  if (req.controlPlane.shouldCache) {
    await setInCache(cacheKey, products, 300);
  }

  res.json({ cached: false, data: products });
});

// Manual invalidation on update
app.put("/api/products/:id", async (req, res) => {
  await db.updateProduct(req.params.id, req.body);
  await deleteFromCache(cacheKey); // Immediate invalidation
  res.json({ success: true });
});
```

---

## Best Practices

### ✅ DO

1. **Use Redis in Production**

   ```javascript
   // GOOD - Production-ready
   const cached = await getFromCache(cacheKey);
   ```

2. **Always Set TTL**

   ```javascript
   // GOOD - Auto-expires
   await setInCache(cacheKey, data, 300);
   ```

3. **Invalidate on Updates**

   ```javascript
   // GOOD - Fresh data
   await db.updateProduct(id, data);
   await deleteFromCache(cacheKey);
   ```

4. **Handle Redis Failures Gracefully**
   ```javascript
   // GOOD - App works even if Redis is down
   async function getFromCache(key) {
     try {
       const data = await redisClient.get(key);
       return data ? JSON.parse(data) : null;
     } catch (error) {
       console.error("Redis error:", error);
       return null; // Continue without cache
     }
   }
   ```

### ❌ DON'T

1. **Don't Use Memory Cache in Production**

   ```javascript
   // BAD - Data lost on restart
   const cache = {};
   cache[key] = data;
   ```

2. **Don't Cache Without TTL**

   ```javascript
   // BAD - Data never expires
   await redisClient.set(key, data); // Missing TTL!

   // GOOD
   await redisClient.setEx(key, 300, data);
   ```

3. **Don't Cache Everything**

   ```javascript
   // BAD - Caching real-time data
   if (req.controlPlane.shouldCache) {
     cache.stockPrice = await getLivePrice(); // Wrong!
   }
   ```

4. **Don't Ignore Cache Invalidation**
   ```javascript
   // BAD - Stale data
   app.put("/products/:id", async (req, res) => {
     await db.updateProduct(id, data);
     // Forgot to clear cache!
   });
   ```

---

## Monitoring Cache Performance

### View Cached Keys

```bash
redis-cli

# See all cache keys
KEYS cache:*

# Check specific key
GET cache:product-service:/api/products

# Check TTL
TTL cache:product-service:/api/products
```

### Monitor Cache Hit Rate

```javascript
let cacheHits = 0;
let cacheMisses = 0;

app.get("/api/products", async (req, res) => {
  if (req.controlPlane.shouldCache) {
    const cached = await getFromCache(cacheKey);

    if (cached) {
      cacheHits++;
      console.log(
        `Cache hit rate: ${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2)}%`,
      );
      return res.json({ cached: true, data: cached });
    }
  }

  cacheMisses++;
  const data = await db.getProducts();
  // ...
});
```

---

## Troubleshooting

### Cache Not Working?

**Check:**

1. Is Redis running? `redis-cli ping`
2. Is AI recommending cache? Check `req.controlPlane.shouldCache`
3. Is TTL too short? Check with `TTL key` in redis-cli

### Showing Stale Data?

**Solutions:**

1. Shorter TTL: `setInCache(key, data, 60)` // 1 minute
2. Invalidate on update: `deleteFromCache(key)`

### Redis Connection Refused?

**Verify:**

```bash
# Check Redis is running
redis-cli ping

# Check connection URL
echo $REDIS_URL

# Restart Redis
sudo systemctl restart redis-server
```

---

## Related Features

- 📖 [Rate Limiting](./RATE_LIMITING.md) - Request throttling
- 📖 [Load Shedding](./LOAD_SHEDDING.md) - Graceful degradation
- 📖 [AI Decisions](./AI_DECISIONS.md) - How AI determines caching

---

## Summary

Dynamic caching with AI Control Plane:

- ✅ AI-driven caching decisions based on latency
- ✅ Production-ready with Redis
- ✅ Automatic TTL and expiration
- ✅ Shared across multiple servers
- ✅ Graceful fallback if cache unavailable
- ✅ Cache invalidation strategies
- ✅ Real-time monitoring via SSE

**Next:** Learn about [Circuit Breaker](./CIRCUIT_BREAKER.md) for handling failures.
