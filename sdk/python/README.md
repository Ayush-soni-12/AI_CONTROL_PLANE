# AI Control Plane SDK — Python

Easy integration for autonomous runtime control in your **FastAPI** microservices.

The SDK tracks API performance and receives intelligent AI-driven configuration
from the Control Plane — automatically deciding caching, circuit breaking,
rate limiting, and load shedding for your routes.

## Installation

```bash
pip install ai-control-plane-sdk
```

> **Requirements**: Python ≥ 3.9, FastAPI/Starlette ≥ 0.27, httpx ≥ 0.27

## Links

- **GitHub**: [https://github.com/Ayush-soni-12/AI_CONTROL_PLANE](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE)
- **npm SDK**: [@ayushsoni12/ai-control-plane](https://www.npmjs.com/package/@ayushsoni12/ai-control-plane)

---

## What Does This SDK Do?

| Feature                     | Description                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| 🔑 **API Key Auth**         | Every request is authenticated with your API key                  |
| 📊 **Performance Tracking** | Tracks latency + success/error rate per endpoint                  |
| 🤖 **AI Runtime Config**    | Receives live AI decisions (cache / circuit breaker / rate limit) |
| 🛡️ **Traffic Management**   | Know if a request should be queued, load-shed, or rate-limited    |
| 🔌 **Middleware + Depends** | Global middleware OR per-route `Depends()` — your choice          |
| 🛟 **Graceful Degradation** | Never crashes your app if the Control Plane is unreachable        |

---

## Quick Start

### 0. Get Your API Key

1. Open the Control Plane dashboard (`http://localhost:3000`)
2. Go to **API Keys** → **Generate New Key**
3. Copy the key and add it to your `.env`

### 1. Generate a Tenant ID

```bash
python -c "import uuid; print(uuid.uuid4().hex)"
# e.g.  bfc3aed7948e46fafacac26faf8b3159
```

Store it in your `.env`. It uniquely identifies your service/user — **don't change it**.

### 2. Initialize the SDK

```python
# main.py
import os
from ai_control_plane import ControlPlaneSDK

sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),       # ⚠️ REQUIRED
    tenant_id=os.getenv("TENANT_ID"),                 # ⚠️ REQUIRED — generate above
    service_name="my-service",
    control_plane_url=os.getenv("CONTROL_PLANE_URL", "http://localhost:8000"),
)
```

**.env file:**

```bash
CONTROL_PLANE_API_KEY=your-api-key-here
CONTROL_PLANE_URL=http://localhost:8000
TENANT_ID=bfc3aed7948e46fafacac26faf8b3159
```

---

## Two Integration Patterns

### Pattern ① — Global Middleware (all routes)

Applies Control Plane tracking to **every** route with one line.
Config is available as `request.state.control_plane` in any route.

```python
from fastapi import FastAPI, Request
from ai_control_plane import ControlPlaneSDK
from ai_control_plane.middleware import FastAPIMiddleware

app = FastAPI()
sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name="product-service",
)

# ✅ One line — covers all routes
app.add_middleware(FastAPIMiddleware, sdk=sdk, priority="medium")

@app.get("/products")
async def get_products(request: Request):
    cp = request.state.control_plane   # ← injected by middleware

    if cp["should_skip"]:
        # Circuit breaker: upstream is degraded — return fallback
        return {"products": [], "note": cp["reason"]}

    if cp["is_load_shedding"]:
        # System is overloaded — reject this request gracefully
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"error": "Service busy, try again shortly"})

    if cp["is_rate_limited_customer"]:
        # This specific end-user has exceeded their rate limit
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(cp["retry_after"])},
            content={"error": "Too many requests"},
        )

    # --- your normal business logic ---
    products = await db.get_products()

    # AI detected repeated identical requests → cache the response
    if cp["should_cache"]:
        await redis.set("products", products, ex=60)

    return {"products": products}

@app.get("/orders")
async def get_orders(request: Request):
    cp = request.state.control_plane   # same dict available here too
    # ...
```

---

### Pattern ② — Per-Route Dependency (specific routes only)

Use FastAPI's `Depends()` to apply tracking to **one specific route** at a time.
This gives you:

- Different `priority` levels per route (e.g. `/checkout` = `"critical"`)
- Opt-in tracking — only the routes you choose are monitored
- The `control_plane` dict as a typed function argument (instead of `request.state`)

```python
from fastapi import FastAPI, Request, Depends
from ai_control_plane import ControlPlaneSDK
from ai_control_plane.middleware import control_plane_dep

app = FastAPI()
sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name="product-service",
)

# ── Endpoint: /products  (priority = "medium") ─────────────────────────────
@app.get("/products/{product_id}")
async def get_product(
    product_id: int,
    request: Request,
    cp=Depends(control_plane_dep(sdk, "/products", priority="medium")),
    #           ↑ Only this route is tracked. "/products" is the endpoint
    #             key that groups signals in the Control Plane — use a
    #             fixed string, not the dynamic path ("/products/42").
):
    if cp["should_skip"]:
        return {"product": None, "reason": cp["reason"]}

    product = await db.get_product(product_id)
    return {"product": product}


# ── Endpoint: /checkout  (priority = "critical") ───────────────────────────
@app.post("/checkout")
async def checkout(
    request: Request,
    cp=Depends(control_plane_dep(sdk, "/checkout", priority="critical")),
    #           ↑ Critical priority → Control Plane will protect this
    #             route last when load-shedding starts.
):
    if cp["is_load_shedding"]:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=503, content={"error": "Try again shortly"})

    if cp["is_rate_limited_customer"]:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            headers={"Retry-After": str(cp["retry_after"])},
            content={"error": "Too many requests"},
        )

    result = await process_checkout(request)
    return {"success": True, "order_id": result.id}


# ── Endpoint: /health  (NOT tracked — no Depends) ─────────────────────────
@app.get("/health")
async def health():
    # Health check doesn't need AI tracking — just return 200
    return {"status": "ok"}
```

---

### Pattern ③ — Manual Tracking (full control)

No middleware at all — call `track()` and `get_config()` yourself.
Useful for background tasks, batch jobs, or any non-HTTP code.

```python
import time

@app.get("/reports")
async def get_report(request: Request):
    start = time.monotonic()
    try:
        # Ask AI for config before doing any work
        config = await sdk.get_config("/reports", priority="low",
                                      customer_identifier=request.client.host)

        if config["circuit_breaker"]:
            return {"data": [], "reason": config["reason"]}

        report = await generate_report()

        # Track success explicitly
        await sdk.track("/reports", (time.monotonic() - start) * 1000, "success")
        return {"data": report}

    except Exception as e:
        # Track error explicitly
        await sdk.track("/reports", (time.monotonic() - start) * 1000, "error")
        raise
```

---

## `control_plane` Dict Reference

All patterns expose the same fields:

| Key                        | Type   | Description                                         |
| -------------------------- | ------ | --------------------------------------------------- |
| `should_cache`             | `bool` | Cache this response (AI detected repeated requests) |
| `should_skip`              | `bool` | Circuit breaker open — skip upstream call           |
| `is_rate_limited_customer` | `bool` | This end-user exceeded their rate limit             |
| `is_queue_deferral`        | `bool` | Defer request — return 202 Accepted                 |
| `is_load_shedding`         | `bool` | System overloaded — drop request with 503           |
| `status_code`              | `int`  | Suggested HTTP status (200 / 429 / 503 / 202)       |
| `retry_after`              | `int`  | Seconds client should wait before retrying          |
| `estimated_delay`          | `int`  | Estimated queue wait (seconds)                      |
| `priority_required`        | `str`  | Min priority to bypass load shedding now            |
| `reason`                   | `str`  | Human-readable explanation of the AI decision       |
| `customer_identifier`      | `str`  | End-user IP used for rate limiting                  |
| `priority`                 | `str`  | This request's priority tier                        |
| `config`                   | `dict` | Full raw response from the Control Plane            |

---

## `ControlPlaneSDK` API

### `ControlPlaneSDK(control_plane_url, service_name, tenant_id, api_key, timeout)`

| Param               | Default                   | Description             |
| ------------------- | ------------------------- | ----------------------- |
| `control_plane_url` | `"http://localhost:8000"` | Control Plane base URL  |
| `service_name`      | `"unknown-service"`       | Your service name       |
| `tenant_id`         | `"null"`                  | Your tenant ID          |
| `api_key`           | `None`                    | API key from dashboard  |
| `timeout`           | `1.0`                     | HTTP timeout in seconds |

### `await sdk.track(endpoint, latency_ms, status, priority, customer_identifier)`

Send a performance signal. Fire-and-forget — never raises.

### `await sdk.get_config(endpoint, priority, customer_identifier)`

Fetch AI-driven runtime config. Returns safe defaults if unreachable.

---

## Error Handling

The SDK **never crashes your service**:

| Scenario                  | Behaviour                                           |
| ------------------------- | --------------------------------------------------- |
| Control Plane unreachable | Returns safe defaults (all flags `False`)           |
| Invalid API key           | Logs error silently, returns safe defaults          |
| Timeout                   | Returns safe defaults (configurable via `timeout=`) |

---

## License

MIT
