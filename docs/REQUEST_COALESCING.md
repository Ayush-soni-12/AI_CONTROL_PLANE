# Request Coalescing (Collapsing) Guide

## 🤝 Overview

Request Coalescing is a performance optimization technique that ensures multiple identical, simultaneous requests for the same resource are "collapsed" into a single request. 

In a high-traffic environment, a "Cache Stampede" or "Thundering Herd" can occur when a cache entry expires and hundreds of requests hit the backend at the same millisecond. Request Coalescing solves this by making only **one** call and sharing the result with all waiting callers.

---

## 🚀 How it Works in AI Control Plane

The AI Control Plane uses an intelligent, two-tier approach to coalescing:

### 1. **AI-Driven Decision (Backend)**
The Control Plane monitors your service health. It automatically enables coalescing when:
- **Rising Latency:** If latency is trending upward.
- **Thundering Herd Detection:** When spikes in traffic are detected alongside latency variance.

### 2. **Deterministic Locking (SDK)**
The SDK maintains an in-flight tracker.
- **Key Generation:** For routes, the SDK uses the full URL (including query parameters) as the key. This ensures that different users requesting the same data are coalesced, but requests for different data (different IDs/queries) stay separate.

---

## 🛠️ Usage in Node.js SDK

### 1. **Automatic Middleware Coalescing**
When the AI enables coalescing for an endpoint, the standard `middleware()` will automatically collapse simultaneous requests. **No code changes required.**

```javascript
app.get('/products', controlPlane.middleware('/products'), (req, res) => {
    // This handler will only run ONCE even if 10 users hit it at the same time
    res.json(data);
});
```

### 2. **Opt-Out (Manual Override)**
If you have an endpoint that must **never** be shared across users (e.g., generating unique security tokens), you can opt-out by passing `{ coalesce: false }`.

```javascript
// Middleware opt-out
app.get('/mfa-token', controlPlane.middleware('/tokens', { coalesce: false }), ...)

// Wrapper opt-out
app.get('/secure-data', controlPlane.withEndpointTimeout('/secure', handler, { coalesce: false }))


```

### 3. **Manual Coalescence (`req.controlPlane.coalesce`)**
Within any middleware or route, you can manually coalesce expensive logic using a custom key. This is especially useful for isolating specific database queries or downstream fetches.

```javascript
app.get('/compute', controlPlane.middleware('/compute'), async (req, res) => {
    // 1. Wrap external fetches
    const fetchResponse = await req.controlPlane.coalesce('unique-fetch-key', async () => {
        return await controlPlane.adaptiveFetch('/external/weather-api', 'https://api.weather.com');
    });

    // 2. Wrap expensive DB queries
    const dbResult = await req.controlPlane.coalesce('unique-db-key', async () => {
        return await controlPlane.withDbTimeout('/db/complex-aggregation', () => runAggregation());
    });

    res.json({ weather: await fetchResponse.json(), data: dbResult });
});
```

### 4. **Global vs Local Protection**
- **Global Protection:** `middleware()` and `withEndpointTimeout()` automatically coalesce the *entire HTTP route pipeline* if the AI detects a stampede.
- **Data Isolation:** `adaptiveFetch` and `withDbTimeout` do **not** implicitly coalesce. This mathematically guarantees no data leaks occur between specific users. You must explicitly use `req.controlPlane.coalesce('unique-key', ...)` as shown above.

---

## 📊 Comparison

| Scenario | Without Coalescing | With Coalescing |
| :--- | :--- | :--- |
| **Simultaneous Requests** | 100 requests = 100 DB calls | 100 requests = 1 DB call |
| **Cache Miss Spike** | Load spike on backend | Stable load on backend |
| **Data Integrity** | Fresh per request | Shared for *simultaneous* callers |

> [!TIP]
> **Coalescing vs Caching:** Caching stores data for **future** requests (seconds/minutes). Coalescing only shares data with **active** requests that are happening at the exact same time.
