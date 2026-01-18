# SDK Quick Reference - Cache Invalidation

## Installation

```bash
npm install ai-control-plane-sdk
```

## Basic Usage

```javascript
import ControlPlaneSDK, { generateTenantId } from "ai-control-plane-sdk";

const sdk = new ControlPlaneSDK({
  serviceName: "my-service",
  tenantId: generateTenantId("user"),
  controlPlaneUrl: "http://localhost:8000",

  // Optional: Configure cache behavior
  configCacheTTL: 30000, // Cache lifetime (default: 30s)
  latencyThreshold: 500, // Invalidation threshold (default: 500ms)
});
```

## Configuration Options

| Option             | Type   | Default                   | Description                                   |
| ------------------ | ------ | ------------------------- | --------------------------------------------- |
| `serviceName`      | string | `'unknown-service'`       | Name of your service                          |
| `tenantId`         | string | `'null'`                  | Tenant identifier for multi-tenancy           |
| `controlPlaneUrl`  | string | `'http://localhost:8000'` | Control plane API URL                         |
| `configCacheTTL`   | number | `30000`                   | Cache lifetime in milliseconds                |
| `latencyThreshold` | number | `500`                     | Latency threshold for cache invalidation (ms) |

## Methods

### `getConfig(endpoint)`

Fetches runtime configuration for an endpoint. Uses cache when available.

```javascript
const config = await sdk.getConfig("/login");

console.log(config.cache_enabled); // true/false
console.log(config.circuit_breaker); // true/false
console.log(config.reason); // Decision reasoning
```

**Cache Behavior:**

- Returns cached config if fresh (< TTL)
- Fetches from control plane if cache is empty or expired
- Cache key includes tenant ID for isolation

### `track(endpoint, latencyMs, status)`

Sends performance signal to control plane and manages cache invalidation.

```javascript
await sdk.track("/login", 450, "success"); // No invalidation
await sdk.track("/login", 650, "success"); // Invalidates cache!
await sdk.track("/login", 300, "error"); // Invalidates cache!
```

**Automatic Cache Invalidation:**

- Invalidates when `latencyMs > latencyThreshold`
- Invalidates when `status === 'error'`
- Ensures next `getConfig()` fetches fresh data

### `invalidateCache(endpoint)`

Manually invalidate cache for an endpoint.

```javascript
sdk.invalidateCache("/login");
```

**Use Cases:**

- Force fresh config fetch
- Clear cache after deployment
- Reset cache during testing

### `middleware(endpoint)`

Express middleware for automatic tracking (recommended).

```javascript
app.post("/login", sdk.middleware("/login"), async (req, res) => {
  // Config available in req.controlPlane
  if (req.controlPlane.shouldCache && cache.login) {
    return res.json(cache.login);
  }

  if (req.controlPlane.shouldSkip) {
    return res.status(503).json({ error: "Service degraded" });
  }

  // Normal processing...
});
```

## Usage Patterns

### Pattern 1: Middleware (Automatic)

**Best for:** Most endpoints, automatic tracking

```javascript
app.get("/products", sdk.middleware("/products"), async (req, res) => {
  // Check cache
  if (req.controlPlane.shouldCache && cache.products) {
    return res.json({ cached: true, data: cache.products });
  }

  // Check circuit breaker
  if (req.controlPlane.shouldSkip) {
    return res.status(503).json({ error: "Temporarily unavailable" });
  }

  // Fetch data
  const products = await getProductsFromDB();

  // Cache if recommended
  if (req.controlPlane.shouldCache) {
    cache.products = products;
  }

  res.json({ cached: false, data: products });
});
```

### Pattern 2: Manual Tracking

**Best for:** Complex flows, custom logic

```javascript
app.post("/checkout", async (req, res) => {
  const startTime = Date.now();

  try {
    // Get config
    const config = await sdk.getConfig("/checkout");

    // Check circuit breaker
    if (config.circuit_breaker) {
      await sdk.track("/checkout", Date.now() - startTime, "success");
      return res.status(503).json({ error: "Service unavailable" });
    }

    // Check cache
    if (config.cache_enabled && cache.checkout) {
      await sdk.track("/checkout", Date.now() - startTime, "success");
      return res.json({ cached: true, data: cache.checkout });
    }

    // Process checkout
    const result = await processCheckout(req.body);

    // Cache if recommended
    if (config.cache_enabled) {
      cache.checkout = result;
    }

    // Track success
    await sdk.track("/checkout", Date.now() - startTime, "success");

    res.json({ cached: false, data: result });
  } catch (error) {
    // Track error (will invalidate cache)
    await sdk.track("/checkout", Date.now() - startTime, "error");
    res.status(500).json({ error: error.message });
  }
});
```

## Cache Invalidation Examples

### Example 1: High Latency

```javascript
// Request 1: Good performance
await sdk.track("/api/users", 200, "success");
// ✓ Cache remains valid

// Request 2: Poor performance
await sdk.track("/api/users", 800, "success");
// ⚡ Cache invalidated! (800ms > 500ms threshold)

// Request 3: Next getConfig fetches fresh data
const config = await sdk.getConfig("/api/users");
// 📡 Fetches from control plane (cache was invalidated)
```

### Example 2: Error Status

```javascript
// Request 1: Success
await sdk.track("/api/payment", 300, "success");
// ✓ Cache remains valid

// Request 2: Error
await sdk.track("/api/payment", 250, "error");
// ⚡ Cache invalidated! (error status)

// Request 3: Fresh config
const config = await sdk.getConfig("/api/payment");
// 📡 Fetches from control plane
```

### Example 3: Manual Invalidation

```javascript
// After deployment or config change
sdk.invalidateCache("/api/users");
sdk.invalidateCache("/api/products");

// Next requests will fetch fresh config
```

## Multi-Tenant Usage

```javascript
// Tenant A
const sdkA = new ControlPlaneSDK({
  serviceName: "my-service",
  tenantId: "tenant-A",
  controlPlaneUrl: "http://localhost:8000",
});

// Tenant B
const sdkB = new ControlPlaneSDK({
  serviceName: "my-service",
  tenantId: "tenant-B",
  controlPlaneUrl: "http://localhost:8000",
});

// Each tenant has isolated cache
await sdkA.track("/login", 800, "success"); // Invalidates only tenant-A cache
await sdkB.track("/login", 200, "success"); // Tenant-B cache unaffected
```



## Best Practices

### ✅ DO

- Use middleware for automatic tracking
- Set appropriate `latencyThreshold` for your service
- Use tenant IDs for multi-tenant applications
- Track errors with `status: 'error'`
- Monitor cache hit/miss rates in logs

### ❌ DON'T

- Set `configCacheTTL` too low (< 5 seconds)
- Set `latencyThreshold` too low (< 200ms)
- Ignore circuit breaker recommendations
- Share SDK instances across tenants
- Disable cache without measuring impact

## Performance Tips

1. **Tune the threshold**: Set `latencyThreshold` based on your SLA

   ```javascript
   latencyThreshold: 1000; // For services with 1s SLA
   ```

2. **Adjust TTL**: Longer TTL = fewer API calls, but slower adaptation

   ```javascript
   configCacheTTL: 60000; // 1 minute for stable services
   ```

3. **Use middleware**: Less code, automatic tracking
   ```javascript
   app.use("/api/*", sdk.middleware("/api"));
   ```

## Troubleshooting

### Cache not invalidating?

Check:

- Is latency actually > threshold?
- Is status set to 'error' correctly?
- Are you using the same SDK instance?

### Too many control plane calls?

Increase:

- `configCacheTTL` (longer cache lifetime)
- `latencyThreshold` (less aggressive invalidation)

### Stale config being served?

Check:

- Is cache being invalidated on errors?
- Is TTL too long?
- Are you tracking all requests?

## Migration from Old Version

If upgrading from a version without cache invalidation:

```javascript
// Old code (still works!)
const sdk = new ControlPlaneSDK({
  serviceName: "my-service",
  controlPlaneUrl: "http://localhost:8000",
});

// New code (with cache invalidation)
const sdk = new ControlPlaneSDK({
  serviceName: "my-service",
  controlPlaneUrl: "http://localhost:8000",
  latencyThreshold: 500, // Add this for cache invalidation
});
```

**No breaking changes!** The new features work automatically.
