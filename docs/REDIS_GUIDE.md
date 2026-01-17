# Production Caching with Redis

## ⚠️ Why NOT Use Simple Memory Cache in Production?

### The Demo Code Problem
```javascript
// ❌ Demo code (DO NOT use in production!)
const cache = {};

cache['/products'] = products;  // Stored in JavaScript memory
```

### What Happens in Production?

**Problem 1: Data Lost on Restart**
```
12:00 PM - Server caches product list
12:30 PM - Server crashes or restarts
12:31 PM - Cache is EMPTY! All cached data LOST!
```

**Problem 2: Multiple Servers Can't Share**
```
You have 3 servers:

Server 1: cache = { '/products': [...] }
Server 2: cache = {}  ← Different memory!
Server 3: cache = {}  ← Different memory!

User request hits Server 2 → No cache → Slow!
```

**Problem 3: Memory Leaks**
```javascript
// Cache keeps growing forever
cache['/products'] = data1;
cache['/search'] = data2;
cache['/users'] = data3;
// ... grows until server runs out of memory and crashes!
```

**Problem 4: No Expiration**
```
Cache stores product price: $100
Product price changes to $80 in database
Cache still shows: $100 (stale data!)
No way to expire old data!
```

---

## ✅ Why Redis?

| Feature | Memory Cache | Redis |
|---------|-------------|-------|
| **Survives restart** | ❌ No | ✅ Yes |
| **Shared across servers** | ❌ No | ✅ Yes |
| **Auto-expiration (TTL)** | ❌ No | ✅ Yes |
| **Memory management** | ❌ Manual | ✅ Automatic |
| **Production-ready** | ❌ No | ✅ Yes |

**Redis = Separate server that ALL your app servers connect to**
```
Your App Server 1 ──┐
Your App Server 2 ──┼──→ Redis Server (stores cache)
Your App Server 3 ──┘

All servers share the SAME cache!
```

---

## Step 1: Install Redis

### On Mac
```bash
brew install redis
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

### On Ubuntu/Linux
```bash
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server

# Enable auto-start on boot
sudo systemctl enable redis-server

# Verify
redis-cli ping
# Should return: PONG
```

### On Windows

Download from: https://redis.io/download

Or use Docker:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### Verify Installation
```bash
# Connect to Redis
redis-cli

# Inside redis-cli, try:
127.0.0.1:6379> SET test "hello"
OK
127.0.0.1:6379> GET test
"hello"
127.0.0.1:6379> exit
```

**If this works, Redis is ready!** ✅

---

## Step 2: Install Redis Client in Your Project
```bash
cd your-service
npm install redis
```

**That's it!** Now your Node.js app can talk to Redis.

---

## Step 3: Create Redis Helper File

Create file: `redis-helper.js`
```javascript
const redis = require('redis');

// Create Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Connect to Redis
redisClient.connect().catch((err) => {
  console.error('❌ Redis connection failed:', err.message);
  console.log('⚠️  App will continue without cache');
});

// Handle errors
redisClient.on('error', (err) => {
  console.error('Redis error:', err.message);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

/**
 * Generate consistent cache key
 * Pattern: cache:{serviceName}:{endpoint}
 * 
 * Examples:
 * - cache:product-service:/products
 * - cache:auth-service:/login
 */
function getCacheKey(serviceName, endpoint) {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  return `cache:${serviceName}:${cleanEndpoint}`;
}

/**
 * Get data from cache
 */
async function getFromCache(key) {
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading from cache:', error.message);
    return null;  // Return null on error, app continues
  }
}

/**
 * Store data in cache with TTL
 */
async function setInCache(key, data, ttlSeconds = 300) {
  try {
    await redisClient.setEx(
      key,
      ttlSeconds,
      JSON.stringify(data)
    );
    return true;
  } catch (error) {
    console.error('Error writing to cache:', error.message);
    return false;
  }
}

/**
 * Delete from cache
 */
async function deleteFromCache(key) {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting from cache:', error.message);
    return false;
  }
}

/**
 * Delete all cache keys matching pattern
 */
async function clearCachePattern(pattern) {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log(`🗑️  Cleared ${keys.length} cache keys`);
    }
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error.message);
    return false;
  }
}

module.exports = {
  redisClient,
  getCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache,
  clearCachePattern
};
```

**Save this file.** Now you have easy helper functions!

---

## Step 4: Update Your Service to Use Redis

### Before (Demo - In-Memory Cache)
```javascript
const express = require('express');
const ControlPlane = require('ai-control-plane-sdk');

const app = express();

// ❌ Don't use in production!
const cache = {};

const controlPlane = new ControlPlane({
  serviceName: 'product-service',
  controlPlaneUrl: 'http://localhost:8000'
});

app.get('/products',
  controlPlane.middleware('/products'),
  async (req, res) => {
    // Check memory cache
    if (req.controlPlane.shouldCache && cache.products) {
      return res.json(cache.products);
    }
    
    const products = await db.getProducts();
    
    // Store in memory
    if (req.controlPlane.shouldCache) {
      cache.products = products;
    }
    
    res.json({ products });
  }
);
```

---

### After (Production - Redis)
```javascript
const express = require('express');
const ControlPlane = require('ai-control-plane-sdk');
const {
  getCacheKey,
  getFromCache,
  setInCache
} = require('./redis-helper');

const app = express();

const controlPlane = new ControlPlane({
  serviceName: 'product-service',
  controlPlaneUrl: 'http://localhost:8000'
});

app.get('/products',
  controlPlane.middleware('/products'),
  async (req, res) => {
    const cacheKey = getCacheKey('product-service', '/products');
    // cacheKey = "cache:product-service:/products"
    
    // Check if control plane says to use cache
    if (req.controlPlane.shouldCache) {
      // Try to get from Redis
      const cached = await getFromCache(cacheKey);
      
      if (cached) {
        console.log('✅ Redis cache hit!');
        return res.json({
          cached: true,
          products: cached
        });
      }
    }
    
    // Cache miss - fetch from database
    console.log('💾 Fetching from database...');
    const products = await db.getProducts();
    
    // Store in Redis if caching enabled
    if (req.controlPlane.shouldCache) {
      await setInCache(cacheKey, products, 300);  // 5 minutes TTL
      console.log('💾 Stored in Redis (expires in 5 min)');
    }
    
    res.json({
      cached: false,
      products: products
    });
  }
);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**That's it!** Now you're using Redis instead of memory cache.

---

## Step 5: Test Redis Integration

### Start Your Service
```bash
node server.js
```

**You should see:**
```
✅ Connected to Redis
Server running on port 3000
```

---

### Send Test Requests
```bash
# Request 1 - Cache miss
curl http://localhost:3000/products
```

**Server logs:**
```
💾 Fetching from database...
💾 Stored in Redis (expires in 5 min)
```

**Response:**
```json
{
  "cached": false,
  "products": [...]
}
```

---
```bash
# Request 2 - Cache hit!
curl http://localhost:3000/products
```

**Server logs:**
```
✅ Redis cache hit!
```

**Response:**
```json
{
  "cached": true,
  "products": [...]
}
```

**Much faster!** ⚡

---

### Verify in Redis CLI
```bash
redis-cli

# See the cached key
127.0.0.1:6379> KEYS cache:*
1) "cache:product-service:/products"

# See the cached data
127.0.0.1:6379> GET cache:product-service:/products
"{\"products\":[...]}"

# Check expiration time (TTL)
127.0.0.1:6379> TTL cache:product-service:/products
(integer) 287  # Seconds remaining

# Exit
127.0.0.1:6379> exit
```

---

## Step 6: Cache Invalidation

### When Product is Updated
```javascript
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  // Update in database
  await db.updateProduct(id, req.body);
  
  // Clear cache so next request gets fresh data
  const cacheKey = getCacheKey('product-service', '/products');
  await deleteFromCache(cacheKey);
  
  console.log('🗑️  Cache invalidated');
  
  res.json({ success: true });
});
```

---

### Clear All Caches for a Service
```javascript
const { clearCachePattern } = require('./redis-helper');

// Clear all product-service caches
await clearCachePattern('cache:product-service:*');
```

---

## Complete Example: Products Service with Redis

**File: `server.js`**
```javascript
const express = require('express');
const ControlPlane = require('ai-control-plane-sdk');
const {
  getCacheKey,
  getFromCache,
  setInCache,
  deleteFromCache
} = require('./redis-helper');

const app = express();
app.use(express.json());

// Initialize Control Plane
const controlPlane = new ControlPlane({
  serviceName: 'product-service',
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:8000'
});

// Simulate database
const db = {
  products: [
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Mouse', price: 29 }
  ],
  
  async getProducts() {
    // Simulate slow query
    await new Promise(resolve => setTimeout(resolve, 800));
    return this.products;
  },
  
  async updateProduct(id, data) {
    const product = this.products.find(p => p.id === parseInt(id));
    if (product) {
      Object.assign(product, data);
    }
  }
};

// GET /products - With Redis caching
app.get('/products',
  controlPlane.middleware('/products'),
  async (req, res) => {
    const cacheKey = getCacheKey('product-service', '/products');
    
    // Check cache if enabled
    if (req.controlPlane.shouldCache) {
      const cached = await getFromCache(cacheKey);
      
      if (cached) {
        console.log('✅ Redis cache hit');
        return res.json({
          cached: true,
          products: cached
        });
      }
    }
    
    // Fetch from database
    console.log('💾 Fetching from database');
    const products = await db.getProducts();
    
    // Store in cache
    if (req.controlPlane.shouldCache) {
      await setInCache(cacheKey, products, 300);
      console.log('💾 Stored in Redis (5 min TTL)');
    }
    
    res.json({
      cached: false,
      products: products
    });
  }
);

// PUT /products/:id - Update and invalidate cache
app.put('/products/:id', async (req, res) => {
  const { id } = req.params;
  
  await db.updateProduct(id, req.body);
  
  // Invalidate cache
  const cacheKey = getCacheKey('product-service', '/products');
  await deleteFromCache(cacheKey);
  
  console.log('🗑️  Cache invalidated');
  
  res.json({ success: true, message: 'Product updated' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Product service running on port ${PORT}`);
});
```

---

## Environment Variables

Create `.env` file:
```bash
# Redis connection
REDIS_URL=redis://localhost:6379

# Control Plane
CONTROL_PLANE_URL=http://localhost:8000

# Server
PORT=3000
```

**Load in your app:**
```javascript
require('dotenv').config();

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});
```

---

## Troubleshooting

### Problem 1: "ECONNREFUSED" Error
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# If not running, start it:
# Mac:
brew services start redis

# Ubuntu:
sudo systemctl start redis-server

# Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

---

### Problem 2: App Crashes When Redis is Down

**Problem:**
```javascript
// If Redis is down, this crashes your app
const data = await redisClient.get(key);
```

**Solution:** Already handled in `redis-helper.js`!
```javascript
async function getFromCache(key) {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis error:', error.message);
    return null;  // ← App continues without cache
  }
}
```

**Your app works even if Redis is down!** ✅

---

### Problem 3: Memory Running Out
```bash
# Check Redis memory usage
redis-cli INFO memory

# Set max memory (in redis.conf or via CLI)
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**What this does:**
- Max 256MB for cache
- When full, removes least recently used (LRU) keys

---

### Problem 4: Cache Shows Old Data

**Cause:** TTL too long or cache not invalidated

**Solution 1:** Shorter TTL
```javascript
await setInCache(cacheKey, data, 60);  // 1 minute instead of 5
```

**Solution 2:** Invalidate on update
```javascript
// After updating data in database
await deleteFromCache(cacheKey);
```

---

### Problem 5: Can't See Cached Data
```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# If empty, cache isn't being written
# Check:
# 1. Is control plane enabling cache?
curl http://localhost:8000/api/config/product-service/products

# 2. Is shouldCache true?
# Add logging in your code:
console.log('shouldCache:', req.controlPlane.shouldCache);
```

---

## Monitoring Redis

### Check What's Cached
```bash
redis-cli

# See all cache keys
KEYS cache:*

# Count keys
DBSIZE

# See specific key
GET cache:product-service:/products

# Check TTL
TTL cache:product-service:/products
```

---

### Monitor Real-Time Activity
```bash
# See all commands in real-time
redis-cli MONITOR

# You'll see:
# 1705520000.123456 [0 127.0.0.1:50000] "SETEX" "cache:product-service:/products" "300" "..."
# 1705520001.234567 [0 127.0.0.1:50001] "GET" "cache:product-service:/products"
```

---

## Production Checklist

Before deploying to production:

- [ ] Redis installed and running
- [ ] `redis-helper.js` created with helper functions
- [ ] All cache operations use `getCacheKey()` for consistent naming
- [ ] TTL set on all cached data (use `setEx`, not `set`)
- [ ] Error handling in place (app works if Redis fails)
- [ ] Cache invalidation on data updates
- [ ] Environment variables for Redis URL
- [ ] Redis password set (security)
- [ ] Redis maxmemory configured
- [ ] Monitoring setup

---

## Summary

✅ **What We Did:**
1. Installed Redis server
2. Created `redis-helper.js` with easy functions
3. Replaced memory cache with Redis
4. Added cache invalidation
5. Added error handling

✅ **Key Functions:**
```javascript
getCacheKey(serviceName, endpoint)  // Generate consistent key
getFromCache(key)                   // Read from cache
setInCache(key, data, ttl)          // Write to cache
deleteFromCache(key)                // Invalidate cache
```

✅ **Benefits:**
- Cache survives restarts
- Shared across servers
- Auto-expiration
- Production-ready

---

## Need Help?

**Redis not starting?**
- Check logs: `redis-cli` then `INFO server`

**App can't connect?**
- Verify URL: `echo $REDIS_URL`
- Test connection: `redis-cli -u $REDIS_URL ping`

**Cache not working?**
- Check if control plane enabled it: `curl http://localhost:8000/api/config/...`
- Check Redis: `redis-cli KEYS cache:*`