"""
client.py — Core SDK class for AI Control Plane (Python)

This module is the heart of the SDK. It handles:
  1. Sending performance signals to the Control Plane ("track")
  2. Fetching AI-driven runtime config ("get_config")

Design philosophy:
  - Async-first: uses httpx.AsyncClient so it works in FastAPI, async Django, etc.
  - Fail-silent: if the Control Plane is unreachable, the SDK never crashes your service.
  - Lightweight: no heavy dependencies — just httpx.
  - Zero-latency: uses local memory caching and sliding window rate limits.
"""

import time
import asyncio
import warnings
import httpx
from datetime import datetime, timezone
from typing import Optional, Dict


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
        timeout: float = 2.0,            # HTTP timeout (like Node configTimeout)
        config_ttl: float = 30.0,        # re-sync every 30s
        flush_interval: float = 5.0,     # flush every 5s
        max_queue_size: int = 500,       # safety cap
    ):
        """
        Initialize the SDK.
        """
        self.control_plane_url = control_plane_url.rstrip("/")  # normalize trailing slash
        self.service_name = service_name
        self.tenant_id = tenant_id
        self.api_key = api_key
        self.timeout = timeout

        # ── Local config cache (the key to zero-latency decisions) ──────────────
        self._config_cache: Dict[str, dict] = {}
        self._config_ttl = config_ttl
        
        # ── Signal batching (1 HTTP call per flush, not per request) ────────────
        self._signal_queue: list[dict] = []
        self._flush_interval = flush_interval
        self._max_queue_size = max_queue_size
        
        # ── Local Sliding Window Tracker (For Rate Limiting Edge-Side) ──────────
        self._customer_rate_limits: Dict[str, dict] = {}
        
        # ── Background Tasks ────────────────────────────────────────────────────
        self._sync_tasks: Dict[str, asyncio.Task] = {}
        self._flush_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None

        # Warn early if no API key — helps devs catch config mistakes at startup
        if not self.api_key:
            warnings.warn(
                "[ControlPlane] ⚠️  No API key provided. "
                "Initialize the SDK with api_key= to authenticate with the Control Plane.",
                stacklevel=2,
            )

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC: initialize(endpoints)
    # Call once at app startup to pre-warm config for known endpoints.
    # ═══════════════════════════════════════════════════════════════════════════

    async def initialize(self, endpoints: list[str] = None) -> None:
        """
        Pre-warm config for known endpoints and start background flush loops.
        """
        if not endpoints:
            endpoints = []

        # Start the signal flush loop immediately
        if not self._flush_task:
            self._flush_task = asyncio.create_task(self._run_flush_loop())

        # Start background cleanup task
        if not self._cleanup_task:
            self._cleanup_task = asyncio.create_task(self._run_cleanup_loop())

        if not endpoints:
            warnings.warn('[ControlPlane] initialize() called with no endpoints — nothing to pre-warm.')
            return

        print(f"[ControlPlane] Pre-warming config for {len(endpoints)} endpoint(s)...")

        # Fetch initial configs concurrently
        fetch_tasks = [self._sync_config(ep) for ep in endpoints]
        if fetch_tasks:
            await asyncio.gather(*fetch_tasks, return_exceptions=True)

        # Start periodic background refresh for each endpoint
        for ep in endpoints:
            self._start_sync_loop(ep)

        print("[ControlPlane] ✅ Config ready. Decisions will be made locally (0ms network overhead).")

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC: destroy()
    # Clean shutdown
    # ═══════════════════════════════════════════════════════════════════════════

    async def destroy(self) -> None:
        """Clean shutdown — flush remaining signals and cancel loops."""
        print("[ControlPlane] Shutting down — flushing remaining signals...")
        
        if self._flush_task:
            self._flush_task.cancel()
        if self._cleanup_task:
            self._cleanup_task.cancel()
            
        for task in self._sync_tasks.values():
            task.cancel()
            
        await self._flush_signals()
        print("[ControlPlane] ✅ Shutdown complete.")

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC: get_config(...)
    # NOW: reads from local memory — NO HTTP call — takes < 0.1ms
    # ═══════════════════════════════════════════════════════════════════════════

    async def get_config(
        self,
        endpoint: str,
        priority: str = "medium",
        customer_identifier: Optional[str] = None,
    ) -> dict:
        """
        Fetch the AI-driven runtime config for a given endpoint.
        Returns from cache if available.
        """
        cached = self._config_cache.get(endpoint)
        if cached:
            # ✅ Cache hit — return immediately, zero network I/O
            return self._apply_customer_rules(cached, customer_identifier)

        # ⚠️ Cache miss (first time seeing this endpoint) — fetch synchronously
        print(f"[ControlPlane] Cache miss for \"{endpoint}\" — fetching now (first request only)")
        await self._sync_config(endpoint)
        self._start_sync_loop(endpoint)

        # After syncing, it should be in cache
        cached_after_sync = self._config_cache.get(endpoint)
        if cached_after_sync:
            return self._apply_customer_rules(cached_after_sync, customer_identifier)

        return dict(_SAFE_DEFAULTS)

    # ═══════════════════════════════════════════════════════════════════════════
    # PUBLIC: track(...)
    # NOW: queues signal locally — NO immediate HTTP call
    # ═══════════════════════════════════════════════════════════════════════════

    async def track(
        self,
        endpoint: str,
        latency_ms: float,
        status: str = "success",
        priority: str = "medium",
        customer_identifier: Optional[str] = None,
        action_taken: str = "none",
    ) -> None:
        """
        Queue a performance signal to be sent to the Control Plane.
        """
        if len(self._signal_queue) >= self._max_queue_size:
            # Queue is full — drop oldest signal (ring buffer behavior)
            self._signal_queue.pop(0)

        self._signal_queue.append({
            "service_name": self.service_name,
            "endpoint": endpoint,
            "latency_ms": round(latency_ms),
            "status": status,
            "tenant_id": self.tenant_id,
            "priority": priority,
            "customer_identifier": customer_identifier,
            "action_taken": action_taken,
            "recorded_at": datetime.now(timezone.utc).isoformat() + "Z", # to match node behavior somewhat
        })

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────

    def _headers(self) -> dict:
        """Build HTTP headers for every request."""
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _apply_customer_rules(self, config: dict, customer_identifier: Optional[str]) -> dict:
        """
        Apply per-customer overrides to cached config.
        Runs locally in memory using a Sliding Window Counter.
        """
        clone = dict(config)
        
        limit_rpm = config.get("rate_limit_rule_rpm")
        if limit_rpm is not None and customer_identifier:
            clone["rate_limited_customer"] = self._is_customer_rate_limited(customer_identifier, limit_rpm)
            if clone["rate_limited_customer"]:
                clone["reason"] = "Customer rate limited locally by edge SDK"
        else:
            clone["rate_limited_customer"] = False
            
        return clone

    def _is_customer_rate_limited(self, customer_identifier: str, limit_rpm: int) -> bool:
        """Evaluate local sliding window rate limit counter."""
        now_ms = int(time.time() * 1000)
        current_minute_str = str(now_ms // 60000)
        previous_minute_str = str((now_ms // 60000) - 1)
        
        tracker = self._customer_rate_limits.get(customer_identifier)
        if not tracker:
            tracker = {"currentMinute": current_minute_str, "currentCount": 0, "previousCount": 0}
            self._customer_rate_limits[customer_identifier] = tracker

        # Slide the window forward if a new minute started
        if tracker["currentMinute"] != current_minute_str:
            tracker["previousCount"] = tracker["currentCount"] if tracker["currentMinute"] == previous_minute_str else 0
            tracker["currentMinute"] = current_minute_str
            tracker["currentCount"] = 0

        # Add this new request to the current minute
        tracker["currentCount"] += 1

        # Calculate the weighted sliding window score
        seconds_into_minute = (now_ms // 1000) % 60
        weight_of_previous_minute = (60 - seconds_into_minute) / 60.0
        
        estimated_rpm = int((tracker["previousCount"] * weight_of_previous_minute) + tracker["currentCount"])

        return estimated_rpm > limit_rpm

    def _build_config_url(self, endpoint: str) -> str:
        """Build the URL for fetching config."""
        url = f"{self.control_plane_url}/api/config/{self.service_name}{endpoint}"
        return url

    async def _sync_config(self, endpoint: str) -> None:
        """Fetch config from the Control Plane and update cache."""
        url = self._build_config_url(endpoint)
        params = {}
        if self.tenant_id:
            params["tenant_id"] = self.tenant_id

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=self._headers())

            if response.status_code == 401:
                print("[ControlPlane] ❌ Invalid API key — check your configuration")
                return

            if not response.is_success:
                return

            config = response.json()
            config["_fetchedAt"] = int(time.time() * 1000)
            self._config_cache[endpoint] = config

        except Exception:
            # Keep existing cache if available — stale config is better than no config
            pass

    def _start_sync_loop(self, endpoint: str) -> None:
        """Start a background task to refresh the config for an endpoint."""
        if endpoint in self._sync_tasks and not self._sync_tasks[endpoint].done():
            return
            
        async def loop():
            while True:
                await asyncio.sleep(self._config_ttl)
                await self._sync_config(endpoint)
                
        self._sync_tasks[endpoint] = asyncio.create_task(loop())

    async def _run_flush_loop(self) -> None:
        """Background task loop that periodically flushes standard signals."""
        while True:
            await asyncio.sleep(self._flush_interval)
            if self._signal_queue:
                await self._flush_signals()

    async def _flush_signals(self) -> None:
        """Drain the queue and send signals to backend."""
        if not self._signal_queue:
            return

        # Drain the queue atomically
        batch = self._signal_queue[:self._max_queue_size]
        del self._signal_queue[:len(batch)]
        
        requeued = False

        try:
            url = f"{self.control_plane_url}/api/signals/batch"
            payload = {"signals": batch}
            
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.post(url, json=payload, headers=self._headers())

            if not response.is_success and response.status_code != 401:
                print(f"[ControlPlane] Batch flush failed ({response.status_code}) — {len(batch)} signals re-queued")
                # Prepend back to queue, keeping under max size
                space_left = self._max_queue_size - len(self._signal_queue)
                if space_left > 0:
                    self._signal_queue = batch[:space_left] + self._signal_queue
                requeued = True

        except Exception as e:
            if not requeued:
                space_left = self._max_queue_size - len(self._signal_queue)
                if space_left > 0:
                    self._signal_queue = batch[:space_left] + self._signal_queue

    async def _run_cleanup_loop(self) -> None:
        """Background task to clear memory periodically."""
        while True:
            await asyncio.sleep(3600)  # Verify memory every hour
            self._customer_rate_limits.clear()

