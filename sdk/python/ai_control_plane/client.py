"""
client.py — Core SDK class for AI Control Plane (Python)

This module is the heart of the SDK. It handles:
  1. Sending performance signals to the Control Plane ("track")
  2. Fetching AI-driven runtime config ("get_config")

Design philosophy:
  - Async-first: uses httpx.AsyncClient so it works in FastAPI, async Django, etc.
  - Fail-silent: if the Control Plane is unreachable, the SDK never crashes your service.
  - Lightweight: no heavy dependencies — just httpx.
"""

import time
import warnings
import httpx
from typing import Optional


# ─────────────────────────────────────────────────────────────────────────────
# Safe default config
# Returned whenever the Control Plane is unreachable or returns an error.
# All features are disabled (off = safe) so your service keeps running normally.
# ─────────────────────────────────────────────────────────────────────────────
_SAFE_DEFAULTS = {
    "cache_enabled": False,
    "circuit_breaker": False,
    "rate_limited_customer": False,
    "queue_deferral": False,
    "load_shedding": False,
    "status_code": 200,
    "reason": "Control plane unavailable — using safe defaults",
}


class ControlPlaneSDK:
    """
    Python SDK for the AI Control Plane.

    Usage (FastAPI example):
    ─────────────────────────
        from ai_control_plane import ControlPlaneSDK

        sdk = ControlPlaneSDK(
            control_plane_url="http://localhost:8000",
            service_name="my-service",
            tenant_id="your-tenant-id",       # generate with: python -c "import uuid; print(uuid.uuid4().hex)"
            api_key="your-api-key",            # from the dashboard
        )

    Usage (Flask example):
    ──────────────────────
        Same init, then attach the FlaskMiddleware from ai_control_plane.middleware.
    """

    def __init__(
        self,
        control_plane_url: str = "http://localhost:8000",
        service_name: str = "unknown-service",
        tenant_id: str = "null",
        api_key: Optional[str] = None,
        timeout: float = 1.0,
    ):
        """
        Initialize the SDK.

        Args:
            control_plane_url: Base URL of the running Control Plane API.
            service_name:      Your service's name, used to namespace signals.
            tenant_id:         A unique ID for your tenant / user. Generate one with:
                                   python -c "import uuid; print(uuid.uuid4().hex)"
                               Store it in your .env and never change it.
            api_key:           API key from the Control Plane dashboard.
                               All requests will include it as: Authorization: Bearer <key>
            timeout:           HTTP timeout in seconds (default 1s — fast fail so your
                               service never hangs waiting for the Control Plane).
        """
        self.control_plane_url = control_plane_url.rstrip("/")  # normalize trailing slash
        self.service_name = service_name
        self.tenant_id = tenant_id
        self.api_key = api_key
        self.timeout = timeout

        # Warn early if no API key — helps devs catch config mistakes at startup
        if not self.api_key:
            warnings.warn(
                "[ControlPlane] ⚠️  No API key provided. "
                "Initialize the SDK with api_key= to authenticate with the Control Plane.",
                stacklevel=2,
            )

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _headers(self) -> dict:
        """
        Build HTTP headers for every request.

        Always includes Content-Type. Adds Authorization header only when
        an API key is provided — so the SDK degrades gracefully without one.
        """
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    # ─────────────────────────────────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────────────────────────────────

    async def track(
        self,
        endpoint: str,
        latency_ms: float,
        status: str = "success",
        priority: str = "medium",
        customer_identifier: Optional[str] = None,
    ) -> None:
        """
        Send a performance signal to the Control Plane.

        Call this after every request completes so the AI engine can learn
        your service's latency and error patterns over time.

        Args:
            endpoint:            The API path that was hit (e.g. "/products").
            latency_ms:          How long the request took in milliseconds.
            status:              "success" or "error".
            priority:            Request priority tier: "critical", "high", "medium", "low".
                                 Used by the AI to decide load-shedding / queue-deferral.
            customer_identifier: Optional end-user IP or session ID for per-customer
                                 rate limiting. Pass request.client.host in FastAPI,
                                 or request.remote_addr in Flask.

        The call is fire-and-forget:
            - If the Control Plane is down, the error is logged but your service keeps running.
            - Responses from this endpoint are intentionally ignored.
        """
        payload = {
            "service_name": self.service_name,
            "endpoint": endpoint,
            "latency_ms": latency_ms,
            "status": status,
            "tenant_id": self.tenant_id,
            "priority": priority,
            "customer_identifier": customer_identifier,
        }

        try:
            # httpx.AsyncClient is used here instead of requests because it
            # supports async/await and doesn't block the event loop.
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.control_plane_url}/api/signals",
                    json=payload,
                    headers=self._headers(),
                )

                # Surface invalid API key errors clearly
                if response.status_code == 401:
                    print("[ControlPlane] ❌ track() failed: Invalid API key")

        except Exception as e:
            # Fail silently — never let the Control Plane take down your service
            print(f"[ControlPlane] ⚠️  track() could not reach Control Plane: {e}")

    async def get_config(
        self,
        endpoint: str,
        priority: str = "medium",
        customer_identifier: Optional[str] = None,
    ) -> dict:
        """
        Fetch the AI-driven runtime config for a given endpoint.

        The Control Plane's AI engine analyses your service's signal history and
        returns a set of feature flags that tell your code what to do right now.

        Args:
            endpoint:            The API path you're about to handle (e.g. "/products").
            priority:            The request's priority tier (affects queue-deferral /
                                 load-shedding decisions).
            customer_identifier: End-user IP or session ID for per-customer rate limiting.

        Returns a dict like:
            {
                "cache_enabled":          True,   # Should this response be cached?
                "circuit_breaker":        False,  # Should we skip the upstream call?
                "rate_limited_customer":  False,  # Is this specific customer rate-limited?
                "queue_deferral":         False,  # Should this request be deferred?
                "load_shedding":          False,  # Should this request be dropped?
                "status_code":            200,
                "reason":                 "High latency detected — caching enabled",
            }

        If the Control Plane is unreachable, returns _SAFE_DEFAULTS (all features off).
        Your service continues to work normally — it just won't have AI-tuning.
        """
        try:
            return await self._fetch_config(endpoint, priority, customer_identifier)
        except Exception as e:
            print(f"[ControlPlane] ⚠️  get_config() fell back to safe defaults: {e}")
            return dict(_SAFE_DEFAULTS)  # return a fresh copy so callers can mutate it safely

    async def _fetch_config(
        self,
        endpoint: str,
        priority: str = "medium",
        customer_identifier: Optional[str] = None,
    ) -> dict:
        """
        Internal: performs the actual HTTP GET to the Control Plane config endpoint.

        URL format: /api/config/{service_name}{endpoint}?tenant_id=...&priority=...
        """
        # Build the URL — matches the Node SDK exactly
        url = f"{self.control_plane_url}/api/config/{self.service_name}{endpoint}"

        # Build query params only for values that are actually set
        params: dict = {}
        if self.tenant_id:
            params["tenant_id"] = self.tenant_id
        if priority:
            params["priority"] = priority
        if customer_identifier:
            params["customer_identifier"] = customer_identifier

        print(f"[ControlPlane] Fetching config from {url} params={params}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params, headers=self._headers())

        # Surface auth errors clearly, then return safe defaults
        if response.status_code == 401:
            print("[ControlPlane] ❌ get_config() failed: Invalid API key")
            return dict(_SAFE_DEFAULTS)

        # Parse and return the JSON payload from the Control Plane
        return response.json()
