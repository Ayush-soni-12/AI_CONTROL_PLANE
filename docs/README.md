# AI Control Plane Documentation

Autonomous runtime control system for microservices.

## What is AI Control Plane?

A service that monitors your microservices and automatically applies performance optimizations without code changes or redeployment.

## How It Works

```
1. Your service sends performance signals → Control Plane
2. Control Plane analyzes patterns with AI
3. Control Plane makes decisions (enable cache, circuit breaker, etc.)
4. Your service receives new config
5. Your service adapts behavior automatically
```

## Key Features

- ✅ **Automatic Caching** - Enables cache when endpoints are slow
- ✅ **Circuit Breaker** - Protects services when dependencies fail
- ✅ **AI Decisions** - Uses LangGraph for intelligent reasoning
- ✅ **Multi-Tenant** - Isolate data per customer/environment
- ✅ **Easy Integration** - 2-line SDK setup

## Quick Links

- [5-Minute Quick Start](QUICK_START.md) - Get started immediately
- [Integration Guide](INTEGRATION_GUIDE.md) - Detailed setup
- [Redis Production Guide](REDIS_GUIDE.md) - Production caching
- [Multi-Tenant Setup](MULTI_TENANT.md) - Multiple customers
- [API Reference](API_REFERENCE.md) - All endpoints
- [Use Cases](USE_CASES.md) - Real-world examples

## Architecture

```
┌─────────────────────────────────────────────┐
│          Your Microservices                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Service  │  │ Service  │  │ Service  │ │
│  │    A     │  │    B     │  │    C     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │ SDK        │ SDK         │ SDK    │
└───────┼────────────┼─────────────┼─────────┘
        │            │             │
        └────────────┴─────────────┘
                     │
        ┌────────────▼─────────────┐
        │   AI Control Plane       │
        │   - Collects signals     │
        │   - AI analysis          │
        │   - Makes decisions      │
        └────────┬─────────────────┘
                 │
        ┌────────▼─────────────────┐
        │   PostgreSQL             │
        │   (Signal storage)       │
        └──────────────────────────┘
```

## Who Should Use This?

✅ Teams running microservices in production
✅ Services with performance issues
✅ Teams wanting autonomous optimization
✅ Anyone needing circuit breakers, caching, rate limiting

## Installation

### SDK (In Your Service)

```bash
npm install ai-control-plane-sdk
```

#### Basic Setup

The SDK provides a `generateTenantId()` helper function to create unique tenant identifiers:

```javascript


const ControlPlane = require("ai-control-plane-sdk");
const { generateTenantId } = require("ai-control-plane-sdk");

const controlPlane = new ControlPlane({
  tenantId: generateTenantId("user"), // Static tenant ID
  serviceName: "my-service",
  controlPlaneUrl: "http://control-plane:8000",
});

app.get(
  "/api/users",
  controlPlane.middleware("/api/users"),
  async (req, res) => {
    // Your code - automatic tracking!
    res.json(users);
  },
);
```

## Current Actions

| Action | When Applied | What It Does |
|--------|-------------|--------------|
| **Cache** | Latency > 500ms | Enables caching to speed up responses |
| **Circuit Breaker** | Error rate > 30% | Skips failing operations, returns fallback |

## Roadmap

- [x] Signal collection
- [x] AI decision engine (LangGraph)
- [x] Caching action
- [x] Circuit breaker action
- [x] Multi-tenant support
- [ ] Rate limiting action
- [ ] Queue deferral action
- [ ] Real-time dashboard
- [ ] Slack/email alerts
- [ ] Custom policies

## Support

- GitHub Issues: [Report bugs](https://github.com/your-org/ai-control-plane/issues)
- Documentation: [Full docs](https://docs.example.com)
- Email: support@example.com

## License

MIT
