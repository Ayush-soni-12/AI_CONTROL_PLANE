# ⚖️ Load Shedding Guide

Gracefully handle traffic spikes and protect your services from overload with intelligent load shedding.

## What is Load Shedding?

Load shedding is the practice of intentionally rejecting some requests when your service is under extreme load, ensuring the service remains available for critical operations.

**Think of it as:** A restaurant limiting capacity during rush hour to maintain service quality for existing diners.

## When to Use Load Shedding

### ✅ Perfect For:

- **Traffic Spikes** - Sudden increases in request volume
- **Resource Exhaustion** - CPU, memory, or database limits reached
- **Degraded Performance** - Latency increasing beyond acceptable levels
- **Preventing Cascade Failures** - Protecting downstream services

### Example Scenarios:

```javascript
// Scenario 1: Flash sale traffic spike
app.post(
  "/api/purchase",
  controlPlane.middleware("/api/purchase"),
  async (req, res) => {
    // Shed load to protect payment processor
  },
);

// Scenario 2: Database under pressure
app.get(
  "/api/analytics",
  controlPlane.middleware("/api/analytics"),
  async (req, res) => {
    // Shed load when DB connections exhausted
  },
);

// Scenario 3: External API rate limited
app.get(
  "/api/external-data",
  controlPlane.middleware("/api/external-data"),
  async (req, res) => {
    // Shed load to avoid hitting external rate limits
  },
);
```

---

## How AI Decides to Shed Load

The AI Control Plane uses multiple signals to determine when to shed load:

### Decision Factors:

1. **System Resources**
   - CPU utilization > 80%
   - Memory usage > 85%
   - Database connection pool saturation

2. **Performance Degradation**
   - p95 latency > 2x baseline
   - p99 latency > 3x baseline
   - Increasing request queuing

3. **Error Rates**
   - 5xx error rate > 5%
   - Timeout rate increasing
   - Circuit breaker triggers

4. **Downstream Health**
   - External API failures
   - Database slow queries
   - Cache misses spiking

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

app.get("/api/data", controlPlane.middleware("/api/data"), async (req, res) => {
  // Check if load shedding is active
  if (req.controlPlane.isLoadShedding) {
    return res.status(503).json({
      error: "Service temporarily unavailable",
      message: "High load detected. Please try again shortly.",
      retryAfter: req.controlPlane.retryAfter,
    });
  }

  // Process request normally
  const data = await fetchData();
  res.json(data);
});
```

### Available SDK Properties

```javascript
req.controlPlane = {
  // Load shedding
  isLoadShedding: boolean,      // Is load shedding active?

  // Other flags
  shouldSkip: boolean,          // Circuit breaker (different from load shedding)
  isRateLimitedCustomer: boolean,
  isQueueDeferral: boolean,
  shouldCache: boolean,

  // Metadata
  statusCode: number,
  retryAfter: number,           // Seconds to wait
  reason: string,

  // Full config
  config: { ... }
}
```

---

## Handling Load Shedding

### Pattern 1: Simple Error Response

```javascript
app.get(
  "/api/products",
  controlPlane.middleware("/api/products"),
  async (req, res) => {
    if (req.controlPlane.isLoadShedding) {
      return res.status(503).json({
        error: "Service overloaded",
        retryAfter: req.controlPlane.retryAfter,
      });
    }

    res.json(await getProducts());
  },
);
```

### Pattern 2: Fallback to Cache

```javascript
app.get(
  "/api/recommendations",
  controlPlane.middleware("/api/recommendations"),
  async (req, res) => {
    if (req.controlPlane.isLoadShedding) {
      // Return stale cache instead of error
      const cached = await getStaleCache("recommendations");

      return res.status(200).json({
        data: cached || getDefaultRecommendations(),
        warning: "Showing cached results due to high load",
        stale: true,
      });
    }

    res.json(await getPersonalizedRecommendations());
  },
);
```

### Pattern 3: Graceful Degradation

```javascript
app.get(
  "/api/search",
  controlPlane.middleware("/api/search"),
  async (req, res) => {
    if (req.controlPlane.isLoadShedding) {
      // Provide basic search instead of advanced
      return res.json({
        results: await basicSearch(req.query.q),
        mode: "basic",
        note: "Advanced search temporarily unavailable",
      });
    }

    res.json({
      results: await advancedSearch(req.query.q),
      mode: "advanced",
    });
  },
);
```

---

## Circuit Breaker vs Load Shedding

**Important:** The SDK provides two different flags:

- `isLoadShedding` - Shed load when system is overloaded
- `shouldSkip` - Circuit breaker for failing endpoints

```javascript
app.get(
  "/api/external",
  controlPlane.middleware("/api/external"),
  async (req, res) => {
    // Circuit breaker - endpoint is failing
    if (req.controlPlane.shouldSkip) {
      return res.status(503).json({
        error: "Circuit breaker open",
        reason: "Too many errors",
      });
    }

    // Load shedding - system overloaded
    if (req.controlPlane.isLoadShedding) {
      return res.status(503).json({
        error: "Service overloaded",
        retryAfter: req.controlPlane.retryAfter,
      });
    }

    res.json(await callExternalAPI());
  },
);
```

---

## Best Practices

### ✅ DO

1. **Provide Clear Error Messages**

   ```javascript
   return res.status(503).json({
     error: "Service overloaded",
     message:
       "We're experiencing high traffic. Please try again in 30 seconds.",
     retryAfter: req.controlPlane.retryAfter,
   });
   ```

2. **Set Retry-After Header**

   ```javascript
   if (req.controlPlane.isLoadShedding) {
     res.set("Retry-After", req.controlPlane.retryAfter);
     return res.status(503).json({ error: "Overloaded" });
   }
   ```

3. **Log Load Shedding Events**
   ```javascript
   if (req.controlPlane.isLoadShedding) {
     logger.warn("Load shedding active", {
       endpoint: req.path,
       reason: req.controlPlane.reason,
     });
   }
   ```

### ❌ DON'T

1. **Don't Use Wrong Status Codes**

   ```javascript
   // BAD
   if (req.controlPlane.isLoadShedding) {
     return res.status(500).json(...); // Should be 503
   }
   ```

2. **Don't Shed Critical Operations**

   ```javascript
   // BAD: Never shed payment processing
   app.post('/api/payment',
     controlPlane.middleware('/api/payment'),
     async (req, res) => {
       if (req.controlPlane.isLoadShedding) {
         return res.status(503).json(...); // DON'T DO THIS
       }
     }
   );

   // GOOD: Exclude critical endpoints
   app.post('/api/payment', async (req, res) => {
     // Don't use middleware for critical operations
     await processPayment(req.body);
   });
   ```

---

## Monitoring Load Shedding

### Dashboard Metrics

1. Navigate to http://localhost:3000
2. Select your service
3. View **Load Shedding** section:
   - Current status (active/inactive)
   - Shed request count
   - System resource metrics

### Real-Time Updates

Load shedding status updates via Server-Sent Events (SSE) - no polling needed!

---



## Troubleshooting

### Load Shedding Too Aggressive?

**Check:**

- System resource usage (CPU, memory)
- Recent latency trends
- Error rates

**Solution:**

- AI will automatically reduce shedding when system recovers
- View AI insights in dashboard for reasoning

### Load Shedding Not Activating?

**Check:**

1. Middleware is applied correctly
2. System is actually under load
3. Metrics are being collected

```javascript
// Debug middleware
app.get("/debug", controlPlane.middleware("/debug"), (req, res) => {
  res.json({
    isLoadShedding: req.controlPlane.isLoadShedding,
    shouldSkip: req.controlPlane.shouldSkip,
    reason: req.controlPlane.reason,
  });
});
```

---

## Related Features

- 📖 [Rate Limiting](./RATE_LIMITING.md) - Request throttling
- 📖 [Queue Deferral](./QUEUE_DEFERRAL.md) - Async request processing
- 📖 [AI Decisions](./AI_DECISIONS.md) - How AI makes decisions

---

## Summary

Load shedding with AI Control Plane:

- ✅ Automatic activation based on system health
- ✅ Graceful degradation options
- ✅ Real-time monitoring via SSE
- ✅ Easy SDK integration
- ✅ Circuit breaker integration

**Next:** Learn about [Queue Deferral](./QUEUE_DEFERRAL.md) for async request processing.
