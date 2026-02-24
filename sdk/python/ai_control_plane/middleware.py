"""
middleware.py — FastAPI middleware for AI Control Plane Python SDK

This module provides a FastAPI-native middleware adapter using Starlette's
BaseHTTPMiddleware. It works for BOTH:

  ① Global middleware  → applied automatically to all routes
  ② Per-route dependency → applied to specific routes using FastAPI's Depends()

The two patterns mirror the Node.js Express SDK:
  - Global   = app.use(sdk.middleware(...))
  - Per-route = app.get("/products", sdk.middleware("/products"), ...)

─────────────────────────────────────────────────────────────
Pattern ①: Global middleware  (quickest setup)
─────────────────────────────────────────────────────────────
    app.add_middleware(FastAPIMiddleware, sdk=sdk, priority="medium")

    @app.get("/products")
    async def products(request: Request):
        cp = request.state.control_plane  # ← injected for you

─────────────────────────────────────────────────────────────
Pattern ②: Per-route dependency  (fine-grained control)
─────────────────────────────────────────────────────────────
    from ai_control_plane.middleware import control_plane_dep
    from fastapi import Depends

    @app.get("/products")
    async def products(cp=Depends(control_plane_dep(sdk, "/products", priority="high"))):
        #                           ↑ only THIS route gets Control Plane tracking
        if cp["should_skip"]:
            return {"products": [], "reason": cp["reason"]}
        ...
─────────────────────────────────────────────────────────────
"""

import time
import asyncio
from typing import Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


# ─────────────────────────────────────────────────────────────────────────────
# Shared helper — build the normalised control_plane dict
# ─────────────────────────────────────────────────────────────────────────────

def _build_control_plane_meta(config: dict, customer_identifier: str, priority: str) -> dict:
    """
    Convert the raw config response from the Control Plane into a clean,
    consistent dict that your route handlers read.

    This mirrors the Node SDK's req.controlPlane shape exactly so the
    mental model is the same across languages.

    Key flags your code should branch on:
        should_cache             → cache the response in Redis / memory
        should_skip              → circuit breaker open; skip upstream call
        is_rate_limited_customer → this end-user is over their rate limit
        is_queue_deferral        → defer the request (return 202 Accepted)
        is_load_shedding         → system overloaded; reject gracefully (503)
    """
    return {
        # ── Raw payload (available if you need non-standard fields) ────────
        "config": config,

        # ── Feature flags ──────────────────────────────────────────────────
        "should_cache":             config.get("cache_enabled", False),
        "should_skip":              config.get("circuit_breaker", False),
        "is_rate_limited_customer": config.get("rate_limited_customer", False),
        "is_queue_deferral":        config.get("queue_deferral", False),
        "is_load_shedding":         config.get("load_shedding", False),

        # ── Response hints ─────────────────────────────────────────────────
        "status_code":       config.get("status_code", 200),
        "retry_after":       config.get("retry_after", 60),       # seconds
        "estimated_delay":   config.get("estimated_delay", 10),   # seconds
        "priority_required": config.get("priority_required", "high"),
        "reason":            config.get("reason", ""),

        # ── Request metadata ───────────────────────────────────────────────
        "customer_identifier": customer_identifier,
        "priority":            priority,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Pattern ①: Global Middleware (BaseHTTPMiddleware)
# ─────────────────────────────────────────────────────────────────────────────

class FastAPIMiddleware(BaseHTTPMiddleware):
    """
    Global FastAPI middleware — applied to EVERY route on the app.

    Injects `request.state.control_plane` before your route handler runs,
    then fire-and-forgets a signal track after the response is sent.

    Setup:
        app.add_middleware(FastAPIMiddleware, sdk=sdk, priority="medium")

    In any route:
        @app.get("/products")
        async def products(request: Request):
            cp = request.state.control_plane
            if cp["should_skip"]:
                return {"data": [], "reason": cp["reason"]}
            ...

    Args:
        sdk:      Your initialised ControlPlaneSDK instance.
        priority: Default priority tier for ALL routes ("critical"/"high"/"medium"/"low").
                  To override per-route, use the per-route dependency (Pattern ②) instead.
    """

    def __init__(self, app, sdk, priority: str = "medium"):
        super().__init__(app)
        self.sdk = sdk
        self.priority = priority

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Called for every incoming request.

        Flow:
          1. Extract end-user IP for per-customer rate limiting.
          2. Ask the AI for the runtime config for this endpoint.
          3. Attach config to request.state.control_plane.
          4. Run the actual route handler.
          5. After response, track latency + status (fire-and-forget).
        """
        start_time = time.monotonic()

        # Extract real client IP. Behind a proxy, consider reading
        # request.headers.get("X-Forwarded-For") instead.
        customer_identifier = request.client.host if request.client else "unknown"
        endpoint = request.url.path

        # Fetch AI config — falls back to safe defaults if Control Plane is down
        config = await self.sdk.get_config(endpoint, self.priority, customer_identifier)

        # Attach the normalised dict to request.state so every route can read it
        request.state.control_plane = _build_control_plane_meta(
            config, customer_identifier, self.priority
        )

        # ── Run the route handler ──────────────────────────────────────────
        response: Response = await call_next(request)

        # ── Track after response is sent ───────────────────────────────────
        latency_ms = (time.monotonic() - start_time) * 1000

        # Treat traffic-management responses as "success" (they are intentional)
        #   202 = Queue deferral | 429 = Rate limited | 503 = Load shedding
        traffic_mgmt = {202, 429, 503}
        status = "success" if (response.status_code < 400 or response.status_code in traffic_mgmt) else "error"

        # create_task = fire-and-forget; response is returned immediately
        asyncio.create_task(
            self.sdk.track(endpoint, latency_ms, status, self.priority, customer_identifier)
        )

        return response


# ─────────────────────────────────────────────────────────────────────────────
# Pattern ②: Per-Route Dependency (FastAPI Depends)
# ─────────────────────────────────────────────────────────────────────────────

def control_plane_dep(sdk, endpoint: str, priority: str = "medium"):
    """
    Per-route FastAPI dependency — applies Control Plane tracking to ONE specific route.

    Unlike global middleware (which runs for every request), this gives you
    fine-grained control: only the routes that use Depends(control_plane_dep(...))
    will be tracked and receive the control_plane dict.

    Use this when:
      - Different routes need different priority levels (e.g. /payments = "critical")
      - You only want to track specific endpoints, not the whole app
      - You want the control_plane dict injected as a function parameter (no request.state)

    Args:
        sdk:      Your ControlPlaneSDK instance.
        endpoint: The logical endpoint name to track, e.g. "/products".
                  This is what the Control Plane uses to look up patterns.
                  Tip: use a fixed string (not the dynamic path) so signals group correctly.
                  e.g. use "/products" not "/products/42".
        priority: Priority tier for THIS route: "critical", "high", "medium", "low".

    Returns:
        A FastAPI dependency function that yields the control_plane dict.

    Usage:
        from fastapi import Depends
        from ai_control_plane.middleware import control_plane_dep

        @app.get("/products/{id}")
        async def get_product(
            request: Request,
            cp=Depends(control_plane_dep(sdk, "/products", priority="high"))
        ):
            if cp["should_skip"]:
                return {"product": None, "reason": cp["reason"]}
            ...

        @app.post("/checkout")
        async def checkout(
            request: Request,
            cp=Depends(control_plane_dep(sdk, "/checkout", priority="critical"))
        ):
            if cp["is_load_shedding"]:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=503, content={"error": "Try again shortly"})
            ...

    The dependency also fires a tracking signal after the route finishes,
    using FastAPI's BackgroundTasks mechanism (via asyncio.create_task).
    """

    async def dependency(request: Request):
        """
        This inner function is what FastAPI calls when it resolves the Depends().
        It is async so it doesn't block the event loop.
        """
        start_time = time.monotonic()
        customer_identifier = request.client.host if request.client else "unknown"

        # Fetch AI-driven config for this specific endpoint + priority
        config = await sdk.get_config(endpoint, priority, customer_identifier)

        # Build the normalised control_plane meta dict
        cp = _build_control_plane_meta(config, customer_identifier, priority)

        # Also write to request.state for consistency with global middleware pattern
        # (handy if you mix both patterns in the same app)
        request.state.control_plane = cp

        # yield instead of return so we can run code AFTER the route finishes
        yield cp

        # ── After route handler returns ────────────────────────────────────
        latency_ms = (time.monotonic() - start_time) * 1000

        traffic_mgmt = {202, 429, 503}
        # We don't have the response status here, so we infer from the cp dict
        status_code = cp.get("status_code", 200)
        status = "success" if (status_code < 400 or status_code in traffic_mgmt) else "error"

        asyncio.create_task(
            sdk.track(endpoint, latency_ms, status, priority, customer_identifier)
        )

    return dependency
