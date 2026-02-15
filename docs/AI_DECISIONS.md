# 🤖 AI Decisions Guide

Understand how the AI Control Plane makes intelligent traffic management decisions.

## Overview

The AI Control Plane uses real-time metrics and historical patterns to automatically optimize your microservices. Unlike static rule-based systems, it continuously learns and adapts to changing conditions.

**Key Features:**

- Real-time decision making (< 50ms)
- AI-tuned thresholds
- Multi-factor analysis
- Server-Sent Events for live updates
- No polling needed

---

## Decision Engine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Your Service                          │
│              (Sends metrics via SDK)                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Control Plane API                          │
│         (Receives signals via HTTP)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Redis Real-Time Store                      │
│    (Aggregates: p50/p95/p99, error rates, counts)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              AI Decision Engine                         │
│         (Gemini API + LangGraph)                        │
│                                                         │
│  Analyzes:                                              │
│  • Latency percentiles                                  │
│  • Error rates                                          │
│  • Traffic patterns                                     │
│  • Resource utilization                                 │
│  • Historical trends                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          AI-Tuned Thresholds (PostgreSQL)               │
│                                                         │
│  Stores:                                                │
│  • Cache thresholds                                     │
│  • Rate limits                                          │
│  • Load shedding triggers                               │
│  • Queue deferral rules                                 │
│  • Circuit breaker settings                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         SSE Stream to Dashboard                         │
│         (Real-time updates, no polling)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Decision Factors

### 1. Latency Analysis

**Metrics Considered:**

- **p50 (median)**: Typical response time
- **p95**: 95th percentile - catches most slowness
- **p99**: 99th percentile - extreme cases

**Example Decision:**

```
If p95 latency > 500ms for last 10 requests:
  → Enable caching
  → AI suggests threshold: cache_latency_threshold = 450ms

If p99 latency > 2000ms:
  → Enable load shedding
  → Shed lowest priority requests first
```

### 2. Error Rate Monitoring

**Tracked Errors:**

- 5xx server errors
- Timeouts
- Failed requests

**Example Decision:**

```
If error rate > 5% in last minute:
  → Open circuit breaker
  → AI suggests: retry_after = 30s

If error rate drops below 1%:
  → Close circuit breaker
  → Resume normal operation
```

### 3. Traffic Patterns

**Analyzed Patterns:**

- Requests per minute
- Burst detection
- Daily/weekly trends
- Seasonal variations

**Example Decision:**

```
If traffic spike detected (3x normal):
  → Enable rate limiting
  → AI suggests: rate_limit = baseline_rps * 1.5

If traffic normalizes:
  → Adjust rate limits
  → AI relaxes limits gradually
```

### 4. Resource Utilization

**Monitored Resources:**

- CPU usage (from system metrics)
- Memory consumption
- Database connections
- Cache hit rates

**Example Decision:**

```
If CPU > 80% and latency increasing:
  → Enable load shedding
  → Defer non-critical requests to queue

If resources recover:
  → Disable load shedding
  → Process queued requests
```

---

## AI-Tuned Thresholds

The AI doesn't use static thresholds. Instead, it continuously tunes them based on your service's behavior.

### Cache Threshold Example

```javascript
// Traditional static approach
if (latency > 500) enableCache(); // Always 500ms

// AI-tuned approach
if (latency > ai_threshold.cache_latency) enableCache();
// Threshold adapts: 350ms → 450ms → 600ms based on patterns
```

### How Thresholds Are Updated

1. **Initial Values** (Day 1)
   - AI uses conservative defaults
   - cache_latency: 500ms
   - rate_limit: 100 req/min

2. **Learning Phase** (Days 2-7)
   - AI observes actual performance
   - Adjusts based on p95 patterns
   - cache_latency: 420ms (optimized)

3. **Continuous Tuning** (Ongoing)
   - Adapts to traffic changes
   - Responds to incidents
   - Seasonal adjustments

---

## Real-Time Metrics with Redis

Instead of querying PostgreSQL for every decision, the AI uses Redis for hot data:

### Redis Data Structures

```redis
# Real-time aggregates (60s TTL)
service:my-service:endpoint:/api/products:latency:p50 → 250
service:my-service:endpoint:/api/products:latency:p95 → 480
service:my-service:endpoint:/api/products:latency:p99 → 620
service:my-service:endpoint:/api/products:error_rate → 2.5
service:my-service:endpoint:/api/products:request_count → 145

# AI thresholds (no expiry)
ai:thresholds:my-service:/api/products:cache_latency → 450
ai:thresholds:my-service:/api/products:rate_limit → 120
```

**Benefits:**

- Sub-millisecond reads
- Automatic expiration (TTL)
- Atomic operations
- Pub/sub for SSE

---

## Server-Sent Events (SSE)

The dashboard uses SSE for real-time updates, not polling.

### SSE Flow

```
1. Dashboard opens SSE connection
   GET /api/sse/services

2. Control Plane pushes updates when:
   • New metric data arrives
   • AI decision changes
   • Threshold updated
   • Status change occurs

3. Dashboard updates UI immediately
   (No 5-second polling delays!)
```

### Example SSE Message

```json
{
  "event": "ai_decision",
  "data": {
    "service": "my-service",
    "endpoint": "/api/products",
    "timestamp": "2026-02-15T22:00:00Z",
    "decisions": {
      "cache_enabled": true,
      "rate_limit_active": false,
      "load_shedding": false,
      "queue_deferral": false
    },
    "metrics": {
      "latency_p95": 520,
      "error_rate": 1.2,
      "requests_per_minute": 85
    },
    "reason": "Elevated p95 latency detected (520ms > threshold 450ms)"
  }
}
```

---

## Viewing AI Insights

### Dashboard Navigation

1. **Open Dashboard**: http://localhost:3000
2. **Navigate to Services** → Select your service
3. **AI Insights Tab** shows:
   - Current decisions
   - Active thresholds
   - Recent threshold changes
   - Decision reasoning

### AI Insights Display

```
┌─────────────────────────────────────────────────────────┐
│ AI Insights - my-service                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Current Decisions:                                      │
│  ✅ Caching: ENABLED                                    │
│     Reason: p95 latency 520ms > threshold 450ms        │
│                                                         │
│  ⏸️  Rate Limiting: INACTIVE                            │
│     Current: 85 req/min (limit: 120)                   │
│                                                         │
│  ✅ Load Shedding: ACTIVE                               │
│     Reason: CPU 82%, shedding low-priority requests    │
│                                                         │
│ Recent Threshold Updates:                              │
│  • cache_latency: 500ms → 450ms (2h ago)               │
│  • rate_limit: 100 → 120 req/min (1d ago)              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Interpreting AI Recommendations

### Cache Enabled

**What It Means:**

- AI detected latency above acceptable threshold
- Recommends caching to improve response time

**Action:**

```javascript
if (req.controlPlane.shouldCache) {
  // Check cache first
  // Store results if cache miss
}
```

### Rate Limiting Active

**What It Means:**

- Traffic exceeds normal patterns
- AI sets protective rate limits

**Action:**

```javascript
if (req.controlPlane.isRateLimitedCustomer) {
  return res.status(429).json({
    error: "Rate limited",
    retryAfter: req.controlPlane.retryAfter,
  });
}
```

### Load Shedding Active

**What It Means:**

- System under stress (high CPU, memory, latency)
- AI shedding non-critical requests

**Action:**

```javascript
if (req.controlPlane.isLoadShedding) {
  return res.status(503).json({
    error: "Service overloaded",
    retryAfter: req.controlPlane.retryAfter,
  });
}
```

### Queue Deferral Suggested

**What It Means:**

- Non-critical operation during high load
- Better to process asynchronously

**Action:**

```javascript
if (req.controlPlane.isQueueDeferral) {
  const jobId = generateJobId();
  await queueJob(jobId, req.body);
  return res.status(202).json({ jobId });
}
```

---



```
```


---

## Best Practices

### ✅ DO

1. **Trust the AI Initially**
   - Let it learn your patterns
   - Monitor for first week
   - Adjust only if needed

2. **Review AI Insights Regularly**
   - Check dashboard weekly
   - Understand decision reasoning
   - Look for patterns

3. **Provide Good Metrics**
   - Track all requests
   - Include error details
   - Send accurate latencies

4. **Use Tenant IDs Properly**
   - Different ID per service
   - Consistent tenant naming
   - Don't share IDs

### ❌ DON'T

1. **Don't Override Every Decision**

   ```javascript
   // BAD: Ignoring AI recommendations
   if (req.controlPlane.shouldCache) {
     // Ignoring cache recommendation
   }
   ```

2. **Don't Change Sensitivity Too Often**
   - Let AI learn (at least 48 hours)
   - Don't adjust daily

3. **Don't Mix Tenant IDs**
   - Confuses AI's learning
   - Breaks isolation

---

## Troubleshooting

### AI Making Wrong Decisions?

**Check:**

1. Are metrics accurate?
2. Is tenant ID consistent?
3. Has AI had time to learn? (24-48 hours minimum)

**Solution:**

- Review metrics in dashboard
- Check AI insights for reasoning
- Contact support if persistent

### Decisions Too Slow/Fast?

**Adjust sensitivity:**

```bash
AI_SENSITIVITY=conservative  # Slower decisions
AI_SENSITIVITY=aggressive    # Faster decisions
```

### Want to Reset AI Learning?

Contact admin to reset thresholds (will use defaults until relearned).

---

## Related Documentation

- 📖 [Getting Started](./GETTING_STARTED.md) - Quick setup
- 📖 [Rate Limiting](./RATE_LIMITING.md) - Rate limiting details
- 📖 [Load Shedding](./LOAD_SHEDDING.md) - Load shedding guide
- 📖 [Queue Deferral](./QUEUE_DEFERRAL.md) - Async processing

---

## Summary

The AI Control Plane:

- ✅ Analyzes real-time metrics from Redis
- ✅ Uses Gemini AI for intelligent decisions
- ✅ Continuously tunes thresholds
- ✅ Delivers updates via SSE (no polling)
- ✅ Provides detailed insights and reasoning
- ✅ Adapts to your service's unique patterns

**The AI works best when you trust it and provide accurate metrics!**
