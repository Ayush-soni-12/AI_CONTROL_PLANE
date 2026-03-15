# 🚀 AI Control Plane

> **Intelligent runtime protection for microservices** — AI-driven circuit breaking, rate limiting, caching, and load shedding that adapts automatically without manual tuning.

---

## 🎯 What Problem This Solves

Microservices fail under unpredictable traffic spikes. Traditional static rate limits and caching rules don't adapt to real-time performance signals. Operators either over-provision (wasteful) or reactively tune under fire (risky).

**AI Control Plane** eliminates manual tuning by continuously analyzing p50/p95/p99 latency, error rates, and traffic patterns — then using LLM-guided decision logic to adjust protection thresholds dynamically. Services self-optimize without touching a config file.

---

## ✨ Features

- 🤖 **AI-Powered Decisions** — Analyzes the last N performance signals and adjusts thresholds dynamically using Gemini-guided decision logic
- 📊 **Real-Time Monitoring** — SSE-based live dashboard with p50/p95/p99 latency tracking
- 🔄 **Dynamic Caching** — AI enables caching when p95 latency exceeds adaptive thresholds
- ⏱️ **Adaptive Timeout** — Fails fast on latency spikes to prevent connection pool exhaustion
- 🚦 **Rate Limiting** — AI-tuned per-tenant rate limits, enforced via HTTP 429 with Retry-After
- ⚖️ **Load Shedding** — Graceful degradation under traffic spikes; sheds low-priority requests first
- 📋 **Queue Deferral** — Async processing for non-critical operations via RabbitMQ
- ⚡ **Circuit Breaker** — Opens at >5% error rate; auto-recovers when metrics normalize
- 👥 **Multi-Tenant** — Isolated metrics, thresholds, and decisions per tenant
- 📦 **SDK** — Drop-in Express middleware (`npm install neuralcontrol`)
- 🐳 **Docker Ready** — Full stack with one command

---

## 📊 Performance Benchmarks

Measured locally under simulated load (3,000 requests, 3 services):

| Metric                             | Value         |
| ---------------------------------- | ------------- |
| End-to-end control plane decision  | **~42ms avg** |
| Redis lookup (real-time aggregate) | **< 2ms**     |
| Gemini LLM decision generation     | **30–40ms**   |
| SSE dashboard update latency       | **< 100ms**   |
| p95 signal ingestion (REST)        | **< 60ms**    |
| PostgreSQL fanout (8-table delete) | **< 80ms**    |

> These numbers reflect local development with Docker Compose. Production numbers on EC2 (t3.medium) are comparable — Redis and Postgres are co-located to minimize network RTT.

---

## 🎯 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- OR: Python 3.11+, PostgreSQL, Node.js 20+ (for manual setup)

### Option 1: Docker Compose (Recommended) ⭐

```bash
git clone https://github.com/yourusername/ai-control-plane.git
cd ai-control-plane
docker-compose up
# Control Plane: http://localhost:8000
# Dashboard:     http://localhost:3000
```

### Option 2: Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

#### 1. Setup PostgreSQL

```bash
sudo apt-get install postgresql
createdb ai_control_plane
```

#### 2. Setup Control Plane

```bash
cd control-plane
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql://user:password@localhost:5432/ai_control_plane"
uvicorn app.main:app --reload
```

#### 3. Setup Demo Service

```bash
cd demo-service
npm install
npm start
```

</details>

---

## 📖 SDK Usage

```bash
npm install neuralcontrol
```

The SDK provides two main integration methods for Express routes:

### `middleware()` — Feature Flags Only

Attaches all 6 AI feature flags to `req.controlPlane`. You handle each flag in your route.

```javascript
import express from "express";
import ControlPlaneSDK from "neuralcontrol";

const app = express();
const controlPlane = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "my-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL,
});

app.get(
  "/products",
  controlPlane.middleware("/products", { priority: "high" }),
  async (req, res) => {
    const {
      shouldSkip,
      isRateLimitedCustomer,
      isLoadShedding,
      isQueueDeferral,
      shouldCache,
      retryAfter,
    } = req.controlPlane;

    if (shouldSkip)
      return res.status(503).json({ error: "Service unavailable" });
    if (isRateLimitedCustomer)
      return res.status(429).json({ error: "Rate limited", retryAfter });
    if (isLoadShedding)
      return res.status(503).json({ error: "System overloaded" });
    if (shouldCache && cache.products)
      return res.json({ cached: true, data: cache.products });

    const products = await getProductsFromDB();
    if (shouldCache) cache.products = products;
    res.json({ cached: false, data: products });
  },
);
```

### `withEndpointTimeout()` — Feature Flags + Auto-Timeout

Same as `middleware()`, **plus** kills the handler if it takes longer than the AI-set timeout (returns `504 Gateway Timeout`).

```javascript
app.get(
  "/products",
  controlPlane.withEndpointTimeout(
    "/products",
    async (req, res) => {
      // Same req.controlPlane flags available
      if (req.controlPlane.shouldSkip)
        return res.status(503).json({ error: "Unavailable" });

      // If this DB call is slow → SDK returns 504 automatically
      const products = await db.getProducts();
      res.json(products);
    },
    { priority: "high" },
  ),
);
```

Pre-warm at startup:

```javascript
app.listen(3001, async () => {
  await controlPlane.initialize(["/products", "/checkout", "/search"]);
});
```

> 📖 Full guide → [GETTING_STARTED.md](./GETTING_STARTED.md) | Priority levels → `'critical'` > `'high'` > `'medium'` > `'low'`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  neuralcontrol SDK (Express middleware)         │    │
│  │  - Sends performance signals                   │    │
│  │  - Reads runtime decisions per request          │    │
│  └────────────────┬───────────────────────────────┘    │
└───────────────────┼─────────────────────────────────────┘
                    │ HTTP (batch signals, decision fetch)
                    ▼
┌─────────────────────────────────────────────────────────┐
│           AI Control Plane (FastAPI + Nginx)            │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Signals    │  │  AI Engine   │  │    Redis     │  │
│  │  Ingestion   │─▶│  (Gemini)    │─▶│  Aggregates  │  │
│  │  RabbitMQ    │  │  Decisions   │  │  + Decisions │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                           │                             │
│           ┌───────────────┘                             │
│           ▼                                             │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  PostgreSQL  │  │  Dashboard   │                    │
│  │  (history +  │  │  (Next.js +  │                    │
│  │   incidents) │  │   SSE live)  │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🛡️ Resilience Strategy

What happens when things go wrong:

| Failure                        | Behavior                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gemini API down / timeout**  | Falls back to last known thresholds stored in Redis. If none, uses hardcoded safe defaults (rate limit: 100 rps, circuit breaker: 5%). Zero downtime. |
| **Redis unavailable**          | Falls back to PostgreSQL aggregates for decision data. Slower (~10ms vs <2ms) but correct.                                                            |
| **PostgreSQL connection drop** | API returns 503. SQLAlchemy async pool is bounded (max 20 connections) to prevent cascade exhaustion.                                                 |
| **RabbitMQ queue full**        | Signals are dropped with a logged warning. Signal loss is acceptable — decisions use aggregate metrics, not individual signals.                       |
| **Dashboard SSE disconnect**   | Client auto-reconnects with exponential backoff (1s → 30s max, 10 retries).                                                                           |

---

## 🎯 How It Works

1. **SDK** sends performance signals (latency, status code, endpoint) to the control plane after each request
2. **RabbitMQ** queues signals for async processing — the SDK call never blocks your endpoint
3. **Redis** maintains real-time rolling aggregates (1m, 5m, 1h windows) with p50/p95/p99
4. **AI Engine** (every cycle) reads aggregates, builds a structured prompt, and calls Gemini for a decision payload: `{ cache: true, rate_limit: false, circuit_breaker: false, reasoning: "..." }`
5. **SDK** fetches the latest decision on each request (from Redis, <2ms) and exposes it via `req.controlPlane`
6. **Dashboard** receives live updates via SSE — no polling

---

## 🤔 Design Trade-offs

**Why SSE instead of WebSockets?**
The dashboard only needs server→client pushes. SSE is simpler, HTTP/1.1 compatible, auto-reconnects, and works through Nginx without extra config. WebSockets would add complexity with no benefit here.

**Why FastAPI instead of Node.js for the backend?**
FastAPI's async model (asyncpg + asyncio) handles 1,000+ concurrent SSE connections with minimal overhead. Python also has first-class AI/ML library support. The SDKs (where developer UX matters) are in Node.js.

**Why RabbitMQ instead of Kafka?**
Kafka is optimized for millions of events/sec with long retention. This system targets hundreds of signals/sec per service with short retention. RabbitMQ is simpler to operate, fits Docker Compose deployment, and has sufficient throughput for the scale.

**Why not Kubernetes?**
The current deployment runs 2 FastAPI replicas behind Nginx with Docker Compose on EC2. K8s would add significant operational complexity (RBAC, Helm, node pools) for a system that scales horizontally by just adding replicas in `docker-compose.yml`. The architecture is K8s-ready when needed.

---

## 🌟 Features in Detail

### 🚦 AI-Powered Rate Limiting

- Analyzes last N signals per endpoint; if error rate or latency crosses LLM-decided thresholds, rate limiting engages
- **Per-customer limits**: identifies individual tenant abusers while allowing legitimate burst traffic
- HTTP 429 with `Retry-After` header — SDK handles retry automatically

📖 [Learn More](./RATE_LIMITING.md)

---

### ⚖️ Load Shedding

- Activates when p95 latency spikes or error rate elevates beyond AI-tuned thresholds
- **Priority-based**: sheds low-priority requests first; critical endpoints continue serving
- HTTP 503 with retry guidance

📖 [Learn More](./LOAD_SHEDDING.md)

---

### 📋 Queue Deferral

- AI identifies requests safe to process asynchronously; returns HTTP 202 with job ID
- Non-critical tasks (reports, exports) don't block hot paths

📖 [Learn More](./QUEUE_DEFERRAL.md)

---

### 🔄 Dynamic Caching

- Caching enabled when p95 latency exceeds AI-adjusted threshold (not a static rule)
- Thresholds are re-evaluated each analysis cycle based on recent performance history
- Per-tenant cache recommendations for full isolation

📖 [Learn More](./CACHING.md)

---

### ⏱️ Adaptive Timeout

- Eliminates hardcoded timeouts that cause resource leaks or premature failures
- AI calculates a stable optimal threshold based on trailing p99 latency to prevent timeouts expanding during incidents
- Enforces strict limits during latency spikes to fail fast and protect DB/Redis connection pools
- Works at 3 levels: Global Express Routes (`withEndpointTimeout`), granular external APIs (`adaptiveFetch`), and specific DB queries (`withDbTimeout`)

📖 [Learn More](./ADAPTIVE_TIMEOUT.md)

---

### ⚡ Circuit Breaker

- Opens when error rate > 5% to prevent overwhelming a degraded service
- Closes automatically when metrics normalize — no manual reset
- Fail-fast: returns immediate 503 instead of waiting for upstream timeout

📖 [Learn More](./CIRCUIT_BREAKER.md)

---

### 🤖 AI Decision Engine

- Reads rolling Redis aggregates (p50/p95/p99 latency, error rate, request rate)
- Builds a structured prompt and calls Gemini API — LLM outputs a JSON decision payload
- Decisions written to Redis with TTL; SDK fetches in <2ms
- Fallback to safe defaults if LLM call fails or times out

📖 [Learn How AI Works](./AI_DECISIONS.md)

---

## 📁 Project Structure

```
ai-control-plane/
├── control-plane/          # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── ai_engine/     # Gemini decision logic
│   │   ├── router/        # REST + SSE endpoints
│   │   ├── queue/         # RabbitMQ consumers
│   │   └── database/      # SQLAlchemy models
│   └── Dockerfile
│
├── dashboard/             # Next.js real-time dashboard
│   ├── app/               # App router pages
│   └── components/        # Service cards, charts, SSE hooks
│
├── sdk/
│   ├── nodejs/            # npm: neuralcontrol
│   └── python/            # pip: ai-control-plane-sdk
│
├── demo-service/          # Express demo app
├── docs/                  # Documentation
├── nginx/                 # Nginx reverse proxy config
└── docker-compose.yml
```

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
lsof -i :8000
```

### Database Connection Failed

```bash
docker-compose logs postgres
docker-compose restart postgres
```

### Code Changes Not Reflecting

```bash
docker-compose up --build
```

---

## 📚 Documentation

- [Getting Started](./GETTING_STARTED.md)
- [AI Decision Engine](./AI_DECISIONS.md)
- [Rate Limiting](./RATE_LIMITING.md)
- [Circuit Breaker](./CIRCUIT_BREAKER.md)
- [Caching Strategy](./CACHING.md)
- [Adaptive Timeout](./ADAPTIVE_TIMEOUT.md)
- [Load Shedding](./LOAD_SHEDDING.md)
- [Queue Deferral](./QUEUE_DEFERRAL.md)
- [MCP Integration](./MCP.md)
- [Contributor Workflow](./CONTRIBUTOR_WORKFLOW.md)

---

## 📝 License

MIT License

---

## 📧 Contact

- GitHub: [@Ayush-soni-12](https://github.com/Ayush-soni-12)
- Email: sudhirsoni9889@gmail.com

---

**Made with ❤️ by Ayush**
