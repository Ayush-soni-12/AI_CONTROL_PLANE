# Scope: AI Control Plane

AI Control Plane (NeuralControl) provides dynamic runtime protection and governance for microservices and autonomous AI agents with adaptive timeouts, circuit breaking, rate limiting, and confidential Web3 billing.

**Build approach:** Tracer Bullet (vertical end to end slices, thin but complete through every layer).
**Workflow:** Beta (check verify, then test after develop). The project default level of rigor. `/architect` is recommended for load bearing decisions, but skippable when you know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Control plane backend | Existing | existing |
| B | Next.js dashboard UI | Existing | existing |
| C | Model Context Protocol servers | Existing | existing |
| D | Demo microservice & load tests | Existing | existing |
| E | Hardhat smart contracts | Existing | existing |
| 1 | Coding standards, alembic migrations & env config cleanup | Foundation | planned |
| 2 | Node.js SDK memory leak fix, thundering herd protection & fail-open mode | Slice 1 | planned |
| 3 | FastAPI microservices separation & worker isolation | Slice 2 | planned |
| 4 | Decoupled agentic payments & Web3 billing gateway | Slice 2 | planned |
| 5 | RabbitMQ fanout exchange, dual queue pipeline & dead-letter queue | Slice 3 | planned |
| 6 | Redis multi-tenant key namespacing & outage resilience | Slice 3 | planned |
| 7 | AI decision engine optimization & feature flag auto-rollback | Slice 3 | planned |
| 8 | Sidecar reverse proxy | Slice 4 | planned |

## Existing features

### A. Control plane backend · existing
FastAPI backend handling real time traffic signals, LLM guided decisions, rate limiting, and database persistence. code in `control-plane/`

### B. Next.js dashboard UI · existing
Next.js 16 frontend displaying real time system metrics, latency percentiles, active incidents, and Web3 payments. code in `dashboard/`

### C. Model Context Protocol servers · existing
FastMCP and Node.js MCP servers exposing control plane decision tools and invoice payments to AI agents. code in `mcp-server/`, `neuralcontrol-mcp/`

### D. Demo microservice & load tests · existing
Express demo server simulating target microservice workloads and circuit breaker load test scripts. code in `demo-service/`

### E. Hardhat smart contracts · existing
Solidity smart contracts for Encrypted ERC tokens, confidential cAGT earnings, and zero knowledge verifications. code in `contracts/`

## Foundations

### 1. Coding standards, alembic migrations & env config cleanup
Clean up hardcoded localhost/CORS configurations, replace `Base.metadata.create_all` startup hooks with deterministic `alembic upgrade head` entrypoint scripts, and enforce automated linting/formatting.
**Done when:** DB migrations run cleanly via entrypoint scripts without race conditions during multi-worker startup, environment configs load dynamically, and test suites pass.
- [ ] Capture conventions and tooling choices: `/audit`
- [ ] Check it runs clean: `/test`

## Slice 1: SDK Reliability & Fail-Open Hardening

### 2. Node.js SDK memory leak fix, thundering herd protection & fail-open mode · needs a decision
Unify config sync timers into a single background loop, parameterize dynamic route keys (`/users/:id`), fix sliding window customer rate limit resets, implement single-flight request coalescing on cache misses (thundering herd protection), and add local fail-open fallback rules when control plane is offline.
**Done when:** SDK memory usage remains flat under dynamic route paths, concurrent cache misses execute only a single network fetch, customer rate limit maps expire per-key smoothly, and SDK gracefully degrades to local fallback rules when control plane backend is unreachable.
- [ ] Design it (spec): `/architect node.js SDK memory leak fix, thundering herd protection & fail-open mode`

## Slice 2: Microservices Separation & Decoupled Billing

### 3. FastAPI microservices separation & worker isolation · needs a decision
Separate the monolithic FastAPI `main.py` entrypoint into independent microservice containers (`signals-service`, `ingestion-worker`, `ai-worker`, `billing-service`).
**Done when:** background scheduler and RabbitMQ consumers run in isolated worker processes, keeping `signals-service` web API latency under 5ms.
- [ ] Design it (spec): `/architect fastapi microservices separation & worker isolation`

### 4. Decoupled agentic payments & Web3 billing gateway · needs a decision
Isolate x402 payment protocols, AVAX billing, eERC confidential token verifications, and Razorpay webhooks into a dedicated `billing-service` microservice.
**Done when:** Web3 token verifications and invoice payments operate in an independent service boundary, ensuring billing operations never interfere with live traffic signal latency.
- [ ] Design it (spec): `/architect decoupled agentic payments & Web3 billing gateway`

## Slice 3: High Throughput Ingestion Pipeline & AI Engine Optimization

### 5. RabbitMQ fanout exchange, dual queue pipeline & dead-letter queue · needs a decision
Upgrade RabbitMQ queue processing to a fanout exchange with independent queues for real time Redis metrics (`<2ms`) and sampled PostgreSQL database logs, plus a Dead-Letter Queue (`signals_dlq`) for poison payload isolation.
**Done when:** Redis real time metrics update instantly without waiting for PostgreSQL disk writes, malformed messages are safely isolated to DLQ without clogging queues, and database downtime does not disrupt live protection logic.
- [ ] Design it (spec): `/architect rabbitmq fanout exchange, dual queue pipeline & dead-letter queue`

### 6. Redis multi-tenant key namespacing & outage resilience · needs a decision
Implement strict multi-tenant key namespacing (`tenant_id:service_id:...`) across all Redis modules, connection auto reconnection pools, in-memory fallback caches, and secondary disk buffering when Redis or RabbitMQ goes offline.
**Done when:** Redis keys strictly isolate cross-tenant metrics without key collisions, and control plane continues functioning seamlessly during Redis connection dropouts.
- [ ] Design it (spec): `/architect redis multi-tenant key namespacing & outage resilience`

### 7. AI decision engine optimization & feature flag auto-rollback · needs a decision
Add anomaly pre-filtering to skip expensive LLM calls on healthy endpoints, compute 1h vs 24h trend metrics, and automatically rollback feature flags if a flag causes latency or error rate spikes.
**Done when:** Gemini LLM calls are executed only when anomalies or rising trends are detected, and bad feature rollout flags auto-disable cleanly.
- [ ] Design it (spec): `/architect AI decision engine optimization & feature flag auto-rollback`

## Slice 4: Out of Process Sidecar Proxy

### 8. Sidecar reverse proxy · needs a decision
Build a lightweight out of process reverse proxy to protect any backend microservice without requiring application code changes.
**Done when:** microservices in any language can be protected by NeuralControl by placing the sidecar proxy in front of their container.
- [ ] Design it (spec): `/architect sidecar reverse proxy`

## Deferred
Out of scope for current refactoring pass, kept so the plan stays honest.
- **Multi-region Redis Replication**: cross-region latency sync for multi-cloud deployments · needs a decision
- **Custom AI Model Fine-tuning**: fine-tuned local LLM model for edge decision synthesis · needs a decision

## Legend

**The decision box.** Every feature carries exactly one, the sub-task whose label ends with `(spec)`. Its wording varies (`Design it (spec)` normally), so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves; each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` + **2 to 5 milestones**; the tier's closing boxes; any surfaced follow-up enrolled |
| `in-progress` (building) | `/develop` | milestone sub-boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` + milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is; `/sync` reconciles | boxes you ran ticked, skipped ones marked skipped |

- **Next step** = the first unticked box (always a command or a tracked milestone).
- **needs a decision** = run `/architect` first; otherwise straight to `/develop` (or `/audit` for standards & tooling).
- **Atomic build tasks live in the spec's `## Build plan`, not here**: the scope carries only the milestone rollup.
- **Status** `planned` → `in-progress` → `done`, plus `existing` (pre-workflow) and `dropped` (de-scoped, kept for history).
- **Approach tag** beside a heading (e.g. `· Facade`) overrides the project default for that feature; no tag = inherits it.
- **Workflow tier tag** beside a heading (e.g. `· GA`, `· Prototype`) sets that one feature's rigor above or below the project default; no tag inherits the default.
