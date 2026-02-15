# ⚡ Circuit Breaker Guide

Protect your services from cascade failures with intelligent circuit breaking that prevents overwhelming failing dependencies.

## What is a Circuit Breaker?

A circuit breaker monitors calls to external services or endpoints and "opens" (stops requests) when failure rates exceed thresholds, preventing your service from wasting resources on calls that will likely fail. After a timeout, it allows test requests through to check if the service has recovered.

**Think of it as:** An electrical circuit breaker that trips when there's too much load, protecting your house from electrical fires.

## When to Use Circuit Breaker

### ✅ Perfect For:

- **External API Dependencies** - Third-party services that may be unreliable
- **Microservice Communication** - Internal services that might fail
- **Database Connections** - Prevent overwhelming a struggling database
- **Slow/Failing Endpoints** - Any operation with unpredictable availability

### Example Scenarios:

```javascript
// Scenario 1: External payment processor ✅
app.post(
  "/api/payment",
  controlPlane.middleware("/api/payment"),
  async (req, res) => {
    // Circuit breaker protects against payment API failures
    if (req.controlPlane.shouldSkip) {
      return res.status(503).json({
        error: "Payment service unavailable",
        message: "Please try again in a few minutes",
      });
    }

    const result = await paymentAPI.process(req.body);
    res.json(result);
  },
);

// Scenario 2: External data enrichment ✅
app.get(
  "/api/user/:id/enriched",
  controlPlane.middleware("/api/user/:id/enriched"),
  async (req, res) => {
    const user = await db.getUser(req.params.id);

    // Try to enrich with external data
    if (!req.controlPlane.shouldSkip) {
      try {
        user.enrichment = await externalAPI.enrich(user);
      } catch (error) {
        // External API failed, continue with basic data
      }
    }

    res.json(user);
  },
);

// Scenario 3: Internal critical operation ❌
app.post(
  "/api/create-account",
  // DON'T use circuit breaker - critical operation must complete
  async (req, res) => {
    const account = await db.createAccount(req.body);
    res.json(account);
  },
);
```

---

## How AI Decides to Open Circuit

The AI Control Plane monitors multiple signals to determine when to open the circuit breaker:

### Decision Factors:

1. **Error Rate**
   - Error rate > 5% for endpoint
   - Consecutive failures spike
   - Timeout errors increasing

2. **Response Patterns**
   - Slow responses (p99 > 5s)
   - Connection timeouts
   - 5xx status codes

3. **Historical Behavior**
   - Previous failure patterns
   - Recovery time trends
   - Dependency health

4. **System Impact**
   - Thread pool saturation
   - Resource exhaustion
   - Cascade failure risk

---

## Circuit Breaker States

```
        Low Error Rate
  CLOSED ──────────────→ CLOSED
    │                      ↑
    │ Error Rate > 5%      │ Test Success
    ↓                      │
   OPEN ──────────────→ HALF-OPEN
        After Timeout    Test Request

        Test Fails
   OPEN ←───────────── HALF-OPEN
```

### State 1: CLOSED (Normal Operation)

- All requests pass through
- Errors are monitored
- If error rate > threshold → OPEN

### State 2: OPEN (Circuit Tripped)

- Requests are blocked immediately
- Returns fast failures (fail-fast)
- After timeout period → HALF-OPEN

### State 3: HALF-OPEN (Testing Recovery)

- Limited test requests allowed
- If tests succeed → CLOSED
- If tests fail → OPEN

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

app.post(
  "/api/external-call",
  controlPlane.middleware("/api/external-call"),
  async (req, res) => {
    // Check if circuit is open
    if (req.controlPlane.shouldSkip) {
      return res.status(503).json({
        error: "Service unavailable",
        message: "Circuit breaker is open due to high failure rate",
        retryAfter: req.controlPlane.retryAfter,
      });
    }

    // Circuit is closed - proceed with call
    try {
      const result = await externalService.call(req.body);
      res.json(result);
    } catch (error) {
      // SDK tracks this failure
      res.status(500).json({ error: error.message });
    }
  },
);
```

### Available SDK Properties

```javascript
req.controlPlane = {
  // Circuit breaker
  shouldSkip: boolean, // Is circuit open?

  // Other traffic management
  isRateLimitedCustomer: boolean,
  isLoadShedding: boolean,
  isQueueDeferral: boolean,
  shouldCache: boolean,

  // Metadata
  statusCode: number,
  retryAfter: number, // Seconds until retry
  reason: string,

  // Full config
  config: object,
};
```

---

## Implementation Patterns

### Pattern 1: Fail Fast

```javascript
app.post(
  "/api/process",
  controlPlane.middleware("/api/process"),
  async (req, res) => {
    // Return error immediately if circuit is open
    if (req.controlPlane.shouldSkip) {
      return res.status(503).json({
        error: "Service unavailable",
        reason: req.controlPlane.reason,
      });
    }

    const result = await externalAPI.process(req.body);
    res.json(result);
  },
);
```

### Pattern 2: Fallback to Cache

```javascript
app.get(
  "/api/recommendations",
  controlPlane.middleware("/api/recommendations"),
  async (req, res) => {
    // Use cached/default data if circuit is open
    if (req.controlPlane.shouldSkip) {
      const fallback = await getDefaultRecommendations();

      return res.json({
        recommendations: fallback,
        source: "fallback",
        note: "External service unavailable",
      });
    }

    const recommendations = await recommendationAPI.get(req.user.id);
    res.json({
      recommendations,
      source: "live",
    });
  },
);
```

### Pattern 3: Graceful Degradation

```javascript
app.get(
  "/api/product/:id",
  controlPlane.middleware("/api/product/:id"),
  async (req, res) => {
    const product = await db.getProduct(req.params.id);

    // Try to enrich with external data
    if (!req.controlPlane.shouldSkip) {
      try {
        product.reviews = await reviewAPI.get(product.id);
        product.pricing = await pricingAPI.get(product.id);
      } catch (error) {
        // External enrichment failed, continue with basic data
      }
    }

    res.json({
      ...product,
      enriched: !req.controlPlane.shouldSkip,
    });
  },
);
```

### Pattern 4: Retry with Exponential Backoff

```javascript
async function callWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = 100 * Math.pow(2, i);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

app.get("/api/data", controlPlane.middleware("/api/data"), async (req, res) => {
  if (req.controlPlane.shouldSkip) {
    return res.status(503).json({ error: "Circuit open" });
  }

  // Retry logic for transient failures
  const data = await callWithRetry("https://api.example.com/data");
  res.json(data);
});
```

---

## Best Practices

### ✅ DO

1. **Return Fast Failures**

   ```javascript
   if (req.controlPlane.shouldSkip) {
     // Immediate response - don't wait
     return res.status(503).json({
       error: "Circuit open",
       retryAfter: req.controlPlane.retryAfter,
     });
   }
   ```

2. **Provide Fallback Options**

   ```javascript
   if (req.controlPlane.shouldSkip) {
     return res.json({
       data: getCachedData(),
       note: "Showing cached results",
     });
   }
   ```

3. **Inform Users Clearly**

   ```javascript
   return res.status(503).json({
     error: "External service unavailable",
     message: "We're experiencing issues. Please try again in 30 seconds.",
     retryAfter: req.controlPlane.retryAfter,
   });
   ```

4. **Log Circuit Breaker Events**
   ```javascript
   if (req.controlPlane.shouldSkip) {
     logger.warn("Circuit breaker open", {
       endpoint: req.path,
       reason: req.controlPlane.reason,
     });
   }
   ```

### ❌ DON'T

1. **Don't Use for Critical Paths**

   ```javascript
   // BAD - Never skip account creation
   app.post('/api/signup',
     controlPlane.middleware('/api/signup'),
     async (req, res) => {
       if (req.controlPlane.shouldSkip) {
         return res.status(503).json({...});  // WRONG!
       }
     }
   );
   ```

2. **Don't Hide Circuit Breaker State**

   ```javascript
   // BAD - Generic error message
   if (req.controlPlane.shouldSkip) {
     return res.status(500).send("Error"); // Not helpful
   }

   // GOOD - Specific message
   if (req.controlPlane.shouldSkip) {
     return res.status(503).json({
       error: "Service temporarily unavailable due to high failure rate",
       retryAfter: req.controlPlane.retryAfter,
     });
   }
   ```

3. **Don't Ignore the Signal**
   ```javascript
   // BAD - Ignoring circuit breaker
   app.get(
     "/api/data",
     controlPlane.middleware("/api/data"),
     async (req, res) => {
       // Not checking req.controlPlane.shouldSkip
       const data = await externalAPI.call(); // May fail!
     },
   );
   ```

---

## Circuit Breaker vs Load Shedding

**Important:** These are different features!

| Feature      | Circuit Breaker (`shouldSkip`) | Load Shedding (`isLoadShedding`) |
| ------------ | ------------------------------ | -------------------------------- |
| **Trigger**  | High error rates on endpoint   | System resource exhaustion       |
| **Purpose**  | Prevent cascade failures       | Protect system from overload     |
| **Scope**    | Per-endpoint                   | System-wide                      |
| **Response** | 503 Service Unavailable        | 503 Service Unavailable          |

```javascript
app.get("/api/data", controlPlane.middleware("/api/data"), async (req, res) => {
  // Circuit breaker - endpoint is failing
  if (req.controlPlane.shouldSkip) {
    return res.status(503).json({
      error: "Circuit breaker open",
      reason: "High error rate on this endpoint",
    });
  }

  // Load shedding - system overloaded
  if (req.controlPlane.isLoadShedding) {
    return res.status(503).json({
      error: "System overloaded",
      reason: "High CPU/memory usage",
    });
  }

  const data = await fetchData();
  res.json(data);
});
```

---

## Monitoring Circuit Breaker

### Dashboard Metrics

1. Navigate to http://localhost:3000
2. Select your service
3. View **Circuit Breaker** section:
   - Current state (OPEN/CLOSED/HALF-OPEN)
   - Error rate trends
   - Failure count
   - Recovery attempts

### Real-Time Updates

Circuit breaker status updates via Server-Sent Events (SSE) - no polling needed!

---

## Testing Circuit Breaker

### Simulate Failures

```bash
#!/bin/bash
# simulate-failures.sh

ENDPOINT="http://localhost:3001/api/external-call"

echo "🧪 Simulating failures to trigger circuit breaker..."

# Send 20 requests that will fail
for i in {1..20}; do
  curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"trigger_error": true}' > /dev/null

  echo "Request $i: Triggered failure"
  sleep 0.1
done

echo "\n⚡ Circuit breaker should now be OPEN"
echo "Testing fast-fail response..."

# This should return immediately with 503
curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
```

### Expected Behavior

```
Request 1-10: Normal failures
Request 11-15: Error rate increasing
Request 16: Circuit OPENS
Request 17-20: Fast failures (503)
```

---

## Troubleshooting

### Circuit Opens Too Often?

**Check:**

- Error rate threshold (may be too sensitive)
- External service health
- Network issues

**Solution:**

- Review AI insights in dashboard for reasoning
- Fix underlying service issues
- Consider fallback strategies

### Circuit Stays Open?

**Check:**

- Is external service still failing?
- Are test requests being made?

**Solution:**

- Verify external service is healthy
- Wait for half-open state timeout
- Check AI decision logs

### Circuit Not Opening?

**Check:**

1. Middleware is applied correctly
2. Errors are being tracked
3. Error rate is truly high enough

```javascript
// Debug circuit breaker
app.get("/debug", controlPlane.middleware("/debug"), (req, res) => {
  res.json({
    shouldSkip: req.controlPlane.shouldSkip,
    reason: req.controlPlane.reason,
    statusCode: req.controlPlane.statusCode,
  });
});
```

---

## Related Features

- 📖 [Load Shedding](./LOAD_SHEDDING.md) - System overload protection
- 📖 [Caching](./CACHING.md) - Fallback data strategies
- 📖 [AI Decisions](./AI_DECISIONS.md) - How AI decides to open circuit

---

## Summary

Circuit breaker with AI Control Plane:

- ✅ Automatic failure detection (> 5% error rate)
- ✅ Fast-fail when circuit is open
- ✅ Automatic recovery testing
- ✅ Per-endpoint isolation
- ✅ Prevents cascade failures
- ✅ Real-time monitoring via SSE
- ✅ Easy SDK integration

**Next:** Learn about [AI Decisions](./AI_DECISIONS.md) to understand how the AI engine works.
