# Changelog

All notable changes to the neuralcontrol Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-03-27

### ✨ Added
- **Distributed Tracing**: The SDK now supports end-to-end distributed tracing. It automatically generates a `trace_id` per request and provides a `req.controlPlane.startSpan(name)` helper to track internal operations.
- **Span Management**: High-performance, async span buffering and batch flushing to the Control Plane.
- **Automatic Root Spans**: The `middleware` and `withEndpointTimeout` now automatically capture a root span reflecting the full HTTP request lifecycle.
- **Enhanced Signal Tracking**: `track` signals now include `trace_id` and `flagName` for better correlation between performance metrics and traces.
- **Feature Flag System**: New standalone feature flag system (`isEnabled(flagName, userId)`) with:
    - **Consistent Hashing**: MD5-based deterministic user bucketing.
    - **SSE Real-time Sync**: Instant rollout updates via Server-Sent Events.
    - **AI Feedback Loop**: Flags are linked to performance signals via `flagName` in `track`, enabling AI to auto-disable buggy flags.
    - **Auto-Refresh**: Background 30s polling fallback for reliability.

### ⚡️ Performance
- **No-op Tracing**: When tracing is disabled, the SDK uses zero-overhead no-op stubs to ensure no performance impact.

---

## [1.2.0] - 2026-03-19

### ✨ Added
- **Request Coalescing**: Request coalescing is now automatically enforced globally via `middleware` and `withEndpointTimeout` to collapse identical HTTP requests. For manual coalescing of isolated downstream fetches or database queries, use the new `req.controlPlane.coalesce('key', fn)` method. (For full details and examples, see the docs!).
- **Data Isolation Guarantee**: Explicitly removed implicit coalescing from `adaptiveFetch` and `withDbTimeout` to mathematically guarantee no data leaks between specific users.

### 📝 Documentation
- Updated `GETTING_STARTED.md` with explicit warnings about namespace metric isolation for DB and fetch timeouts.
- Mapped Request Coalescing into the MCP server documentation for Cursor and Claude.

---

## [1.1.0] - 2026-03-12

### ✨ Added

- **Adaptive Timeouts**: Added `withEndpointTimeout` for Express, `adaptiveFetch` for HTTP requests, and `withDbTimeout` for DB queries to automatically enforce AI-calculated timeouts and track latency/status.
- **Traffic Management Tools**: Added support for Load Shedding (`isLoadShedding`), Queue Deferral (`isQueueDeferral`), and Edge Rate Limiting (`isRateLimitedCustomer`) via local sliding window counter.
- **Priority Tiering**: Added `priority` parameter (`'critical'`, `'high'`, `'medium'`, `'low'`) to `middleware`, `track`, and other methods to influence load shedding rules.
- **Axios Integration**: Added `getAdaptiveAxiosConfig` helper method.

---

## [1.0.0] - 2026-03-01

> **Published on npm**: [`neuralcontrol`](https://www.npmjs.com/package/neuralcontrol)

### ✨ Added

- Initial release of `neuralcontrol` (formerly AI Control Plane SDK).
- **API Key Authentication** — All SDK operations now require a valid API key obtained from the Control Plane dashboard.
- **Performance Tracking** (`track`) — Reports latency, success/error status, endpoint, priority, and customer identifier to the Control Plane AI engine.
- **AI Runtime Config** (`getConfig`) — Fetches live AI-driven decisions (cache, circuit breaker, rate limit, queue deferral, load shedding) for any endpoint.
- **Express Middleware** — One-line global middleware that auto-injects `req.controlPlane` before route handlers and fires a signal after the response.
- **Multi-Tenant Support** — `tenantId` namespaces signals per user/tenant.
- **TypeScript Definitions** — Ships `index.d.ts` for full type support out of the box.

---

## Support

- [README](README.md) — full documentation
- [GitHub Repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- [Open an Issue](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/issues)
