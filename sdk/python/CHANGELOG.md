# Changelog

All notable changes to the AI Control Plane Python SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-02-24

> **Published on PyPI**: [`ai-control-plane-sdk`](https://pypi.org/project/ai-control-plane-sdk/)
> Install: `pip install ai-control-plane-sdk`

### ✨ Added

- **`ControlPlaneSDK` client** (`ai_control_plane/client.py`)
  - `await sdk.track(endpoint, latency_ms, status, priority, customer_identifier)` — fire-and-forget signal reporting.
  - `await sdk.get_config(endpoint, priority, customer_identifier)` — fetch AI-driven runtime config with automatic fallback to safe defaults.
  - API key sent as `Authorization: Bearer <key>` on every request.
  - Warning at startup if no `api_key` is provided.
  - 1-second default timeout — never blocks your event loop.

- **`FastAPIMiddleware`** (`ai_control_plane/middleware.py`)
  - Global Starlette `BaseHTTPMiddleware` — one line covers all routes.
  - Injects `request.state.control_plane` before your route handler runs.
  - Fires a tracking signal after response is sent via `asyncio.create_task`.

- **`control_plane_dep()`** — per-route FastAPI `Depends()` factory.
  - Apply tracking to specific endpoints only, each with its own `priority`.
  - Yields the `control_plane` dict as a typed function argument.
  - Also writes to `request.state.control_plane` for consistency when mixing patterns.

- **Multi-Tenant Support** — `tenant_id` namespaces all signals per user/tenant.

- **Priority Tiers** — `"critical"` / `"high"` / `"medium"` / `"low"` — used by the AI engine for load-shedding and queue-deferral decisions.

- **Graceful Degradation** — All methods catch exceptions and return safe defaults; the SDK never crashes your service.

- **py.typed marker** — full PEP 561 type support for IDEs and type checkers.

- **`httpx` async HTTP client** — single lightweight runtime dependency (`httpx>=0.27`).

- **Optional FastAPI extra** — `pip install "ai-control-plane-sdk[fastapi]"` to pull in Starlette if not already present.

### 📦 `control_plane` Dict Reference

All integration patterns (global middleware, per-route dep, manual) expose the same dict:

| Key                        | Type   | Description                               |
| -------------------------- | ------ | ----------------------------------------- |
| `should_cache`             | `bool` | Cache this response                       |
| `should_skip`              | `bool` | Circuit breaker open — skip upstream call |
| `is_rate_limited_customer` | `bool` | End-user exceeded rate limit              |
| `is_queue_deferral`        | `bool` | Defer request — return 202 Accepted       |
| `is_load_shedding`         | `bool` | System overloaded — drop with 503         |
| `status_code`              | `int`  | Suggested HTTP status (200/202/429/503)   |
| `retry_after`              | `int`  | Seconds client should wait                |
| `estimated_delay`          | `int`  | Estimated queue wait (seconds)            |
| `priority_required`        | `str`  | Min priority to bypass load shedding      |
| `reason`                   | `str`  | Human-readable AI explanation             |
| `customer_identifier`      | `str`  | End-user IP used for rate limiting        |
| `priority`                 | `str`  | This request's priority tier              |
| `config`                   | `dict` | Full raw Control Plane response           |

### 📝 Quick Start

```python
# .env
# CONTROL_PLANE_API_KEY=your-key
# CONTROL_PLANE_URL=http://localhost:8000
# TENANT_ID=<uuid4 hex>

import os
from fastapi import FastAPI, Request
from ai_control_plane import ControlPlaneSDK
from ai_control_plane.middleware import FastAPIMiddleware

app = FastAPI()
sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name="my-service",
    control_plane_url=os.getenv("CONTROL_PLANE_URL", "http://localhost:8000"),
)

# Global middleware — covers every route
app.add_middleware(FastAPIMiddleware, sdk=sdk, priority="medium")

@app.get("/products")
async def get_products(request: Request):
    cp = request.state.control_plane
    if cp["should_skip"]:
        return {"products": [], "note": cp["reason"]}
    if cp["is_load_shedding"]:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"error": "Try again shortly"})
    # ... normal logic
```

---

## Support

- [README](README.md) — full documentation and integration patterns
- [GitHub Repository](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- [Open an Issue](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/issues)
- **Node.js SDK**: [`@ayushsoni12/ai-control-plane`](https://www.npmjs.com/package/@ayushsoni12/ai-control-plane)
