# Changelog

All notable changes to the neuralcontrol Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
