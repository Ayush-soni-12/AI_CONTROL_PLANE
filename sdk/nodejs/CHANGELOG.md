# Changelog

All notable changes to the AI Control Plane Node.js SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-02-24

> **Published on npm**: [`@ayushsoni12/ai-control-plane`](https://www.npmjs.com/package/@ayushsoni12/ai-control-plane)

### ✨ Added

- **API Key Authentication** — All SDK operations now require a valid API key obtained from the Control Plane dashboard. Passed as `apiKey` in the config; sent as `Authorization: Bearer <key>` on every request.
- **Performance Tracking** (`track`) — Reports latency, success/error status, endpoint, priority, and customer identifier to the Control Plane AI engine.
- **AI Runtime Config** (`getConfig`) — Fetches live AI-driven decisions (cache, circuit breaker, rate limit, queue deferral, load shedding) for any endpoint.
- **Express Middleware** — One-line global middleware that auto-injects `req.controlPlane` before route handlers and fires a signal after the response.
- **Per-Route Middleware** — Apply tracking to specific routes only, with different priority levels per route.
- **Multi-Tenant Support** — `tenantId` namespaces signals per user/tenant.
- **Priority Tiers** — `"critical"` / `"high"` / `"medium"` / `"low"` — used by the AI for load-shedding and queue-deferral ordering.
- **Graceful Degradation** — Never throws; returns safe defaults (all flags `false`) if the Control Plane is unreachable.
- **Warning on Missing API Key** — Logs a console warning at startup when `apiKey` is not provided.
- **Last Used Tracking** — API key usage timestamps are updated server-side on every request.
- **TypeScript Definitions** — Ships `index.d.ts` for full type support out of the box.

### � `req.controlPlane` Shape

All middleware patterns expose the same object to your route handlers:

| Key                     | Type      | Description                          |
| ----------------------- | --------- | ------------------------------------ |
| `shouldCache`           | `boolean` | Cache this response                  |
| `shouldSkip`            | `boolean` | Circuit breaker open — skip upstream |
| `isRateLimitedCustomer` | `boolean` | End-user exceeded rate limit         |
| `isQueueDeferral`       | `boolean` | Defer request (return 202)           |
| `isLoadShedding`        | `boolean` | System overloaded — drop with 503    |
| `statusCode`            | `number`  | Suggested HTTP status                |
| `retryAfter`            | `number`  | Seconds client should wait           |
| `estimatedDelay`        | `number`  | Estimated queue wait (seconds)       |
| `reason`                | `string`  | Human-readable AI explanation        |
| `priority`              | `string`  | This request's priority tier         |
| `customerIdentifier`    | `string`  | End-user IP used for rate limiting   |

### 📝 Quick Start

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";
import dotenv from "dotenv";
dotenv.config();

const sdk = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // ← required
  tenantId: process.env.TENANT_ID,
  serviceName: "my-service",
  controlPlaneUrl: process.env.CONTROL_PLANE_URL ?? "http://localhost:8000",
});

// Global Express middleware
app.use(sdk.middleware({ priority: "medium" }));

// In any route:
app.get("/products", (req, res) => {
  const cp = req.controlPlane;
  if (cp.shouldSkip) return res.status(503).json({ error: cp.reason });
  if (cp.isLoadShedding)
    return res.status(503).json({ error: "Try again later" });
  // ... normal logic
});
```

---

## Support

- [README](README.md) — full documentation
- [GitHub Repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- [Open an Issue](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/issues)
