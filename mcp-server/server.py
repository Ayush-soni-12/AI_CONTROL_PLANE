"""
AI Control Plane — FastMCP Server
===================================
This server exposes your AI Control Plane to AI code editors (Cursor, Windsurf,
Claude Desktop) via the Model Context Protocol (MCP).

HOW THE FLOW WORKS:
  1. AI editor starts this server as a subprocess (via stdio).
  2. When a developer asks their AI a question, the AI calls our tools/resources.
  3. Our tools call the FastAPI backend (at CONTROL_PLANE_URL) using httpx.
  4. The response is returned to the AI, which uses it to write better code.

Run:
  .venv/bin/python server.py
"""

import os
from typing import Any
import httpx
from dotenv import load_dotenv
from fastmcp import FastMCP

load_dotenv()

# ──────────────────────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────────────────────

CONTROL_PLANE_URL = os.getenv("CONTROL_PLANE_URL", "http://localhost:8000")
API_KEY = os.getenv("NEURALCONTROL_API_KEY", "acp_c3c609872e072317277d9f24d3c84b48c22cd20b")

_headers: dict[str, str] = {"Content-Type": "application/json"}
if API_KEY:
    _headers["Authorization"] = f"Bearer {API_KEY}"

# Resolve path to the /docs directory (one level up from mcp-server/)
DOCS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))


def _read_doc(filename: str) -> str:
    """Read a markdown doc from the shared /docs directory in the repo root."""
    path = os.path.join(DOCS_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"# Documentation Not Found\n\nCould not find `{filename}` at `{path}`."


def _client() -> httpx.AsyncClient:
    """Pre-configured async HTTP client for calling the backend."""
    return httpx.AsyncClient(
        base_url=CONTROL_PLANE_URL,
        headers=_headers,
        timeout=10.0,
    )


# ──────────────────────────────────────────────────────────────────────────────
# FastMCP App
# ──────────────────────────────────────────────────────────────────────────────

mcp = FastMCP(
    name="AI Control Plane",
    instructions="""
You are connected to an AI Control Plane (NeuralControl) that automatically detects
and fixes performance issues in backend services.

It provides 6 protection mechanisms:
1. Adaptive Timeouts  — kills slow requests before they hang your server
2. Dynamic Caching   — caches slow endpoints automatically
3. Circuit Breaker   — stops calling a failing downstream service
4. Rate Limiting     — throttles abusive customers per endpoint
5. Load Shedding     — rejects low-priority requests when system is overloaded
6. Queue Deferral    — defers non-critical work to background jobs

Use the resources to understand how each feature works and how to write SDK code.
Use the tools to inspect live endpoint status and make real-time changes.
""",
)


# ══════════════════════════════════════════════════════════════════════════════
# RESOURCES — Loaded directly from /docs/*.md on disk
# No duplication — when you update a doc file, the MCP server automatically
# serves the latest version.
# ══════════════════════════════════════════════════════════════════════════════

@mcp.resource("docs://overview")
def overview_docs() -> str:
    """Complete overview of the project, all 6 features, and quick-start guide."""
    return _read_doc("README.md")


@mcp.resource("docs://getting-started")
def getting_started_docs() -> str:
    """Step-by-step installation and setup guide for the neuralcontrol SDK."""
    return _read_doc("GETTING_STARTED.md")


@mcp.resource("docs://configuration")
def configuration_docs() -> str:
    """All environment variables and configuration options."""
    return _read_doc("CONFIGURATION.md")


@mcp.resource("docs://adaptive-timeout")
def adaptive_timeout_docs() -> str:
    """Adaptive Timeout: withEndpointTimeout, adaptiveFetch, withDbTimeout — with code examples."""
    return _read_doc("ADAPTIVE_TIMEOUT.md")


@mcp.resource("docs://caching")
def caching_docs() -> str:
    """Dynamic Caching: when shouldCache is true, Redis setup, cache invalidation patterns."""
    return _read_doc("CACHING.md")


@mcp.resource("docs://circuit-breaker")
def circuit_breaker_docs() -> str:
    """Circuit Breaker: shouldSkip flag, OPEN/CLOSED/HALF-OPEN states, fallback patterns."""
    return _read_doc("CIRCUIT_BREAKER.md")


@mcp.resource("docs://rate-limiting")
def rate_limiting_docs() -> str:
    """Rate Limiting: isRateLimitedCustomer flag, 429 responses, per-tenant limits."""
    return _read_doc("RATE_LIMITING.md")


@mcp.resource("docs://load-shedding")
def load_shedding_docs() -> str:
    """Load Shedding: isLoadShedding flag, priority levels, graceful degradation."""
    return _read_doc("LOAD_SHEDDING.md")


@mcp.resource("docs://queue-deferral")
def queue_deferral_docs() -> str:
    """Queue Deferral: isQueueDeferral flag, 202 Accepted pattern, BullMQ integration."""
    return _read_doc("QUEUE_DEFERRAL.md")


@mcp.resource("docs://ai-decisions")
def ai_decisions_docs() -> str:
    """How the AI engine makes decisions: thresholds, signal analysis, and reasoning."""
    return _read_doc("AI_DECISIONS.md")


@mcp.resource("docs://config-override")
def config_override_docs() -> str:
    """How to create manual threshold overrides via the dashboard or API."""
    return _read_doc("CONFIG_OVERRIDE.md")



# ══════════════════════════════════════════════════════════════════════════════
# TOOLS — Live data fetching and real-time actions
# ══════════════════════════════════════════════════════════════════════════════
# ══════════════════════════════════════════════════════════════════════════════
# TOOLS — Live data fetching and real-time actions
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def get_endpoint_config(service_name: str, endpoint: str) -> dict[str, Any]:
    """
    Fetch the live AI-tuned configuration for a specific service endpoint.
    Shows all feature flags: adaptive_timeout, cache_enabled, circuit_breaker,
    rate_limit_rule_rpm, load_shedding, queue_deferral, and theuir current values.

    Use this when the user asks:
    - "What is the AI setting for /checkout right now?"
    - "Is caching active for /products?"
    - "Why is the circuit breaker open for /payment?"

    Args:
        service_name: The name of the service (e.g. "hi-service")
        endpoint: The endpoint path (e.g. "/products")
    """
    async with _client() as client:
        try:
            r = await client.get(f"/api/config/{service_name}{endpoint}")
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except Exception as e:
            return {"error": str(e)}


@mcp.tool()
async def get_recent_metrics(
    service_name: str, endpoint: str, window: str = "1h"
) -> dict[str, Any]:
    """
    Get real-time latency metrics (p50, p95, p99) and error rates for an endpoint.

    Use this when debugging performance issues:
    - "Why is /checkout slow right now?"
    - "What's the p99 latency for /products?"
    - "Is the error rate spiking for this endpoint?"

    Args:
        service_name: The name of the service
        endpoint: The endpoint path
        window: Time window — "1h" (default) or "24h"
    """
    async with _client() as client:
        try:
            r = await client.get(
                "/api/analytics/percentiles",
                params={
                    "service_name": service_name,
                    "endpoint": endpoint,
                    "window": window,
                },
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except Exception as e:
            return {"error": str(e)}


@mcp.tool()
async def get_adaptive_timeout_status() -> list[dict[str, Any]]:
    """
    Get the live adaptive timeout status for ALL tracked endpoints.
    Returns: active status, current p99, threshold, latency trend for each endpoint.

    Use this when the user wants to see which endpoints are currently timing out.
    """
    async with _client() as client:
        try:
            r = await client.get("/api/adaptive-timeout/status")
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return [{"error": f"HTTP {e.response.status_code}: {e.response.text}"}]
        except Exception as e:
            return [{"error": str(e)}]


@mcp.tool()
async def get_ai_thresholds(service_name: str, endpoint: str) -> dict[str, Any]:
    """
    Get the AI-calculated threshold values for a specific endpoint.
    Returns all tuned values: adaptive_timeout_latency_ms, cache_latency_ms,
    circuit_breaker_error_rate, rate_limit_rpm, load_shed_latency_ms, etc.

    Use this to understand exactly what numbers the AI is using for decisions.

    Args:
        service_name: The name of the service
        endpoint: The endpoint path
    """
    async with _client() as client:
        try:
            r = await client.get(f"/api/ai/thresholds/{service_name}{endpoint}")
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except Exception as e:
            return {"error": str(e)}


@mcp.tool()
async def get_all_ai_insights() -> dict[str, Any]:
    """
    Get recent AI analysis insights — explains WHY the AI enabled/disabled each feature.
    Shows the AI's reasoning: "Enabled caching on /products because p99 exceeded 800ms"

    Use this when the user asks "Why did the AI enable the circuit breaker?"
    """
    async with _client() as client:
        try:
            r = await client.get("/api/ai/insights")
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except Exception as e:
            return {"error": str(e)}


@mcp.tool()
async def get_open_incidents(service_name: str | None = None) -> list[dict[str, Any]]:
    """
    Get currently open incidents (latency spikes, error surges) detected by the AI.

    Use this when investigating why an endpoint is degraded right now.

    Args:
        service_name: Optional — filter to a specific service. Omit for all.
    """
    async with _client() as client:
        try:
            url = (
                f"/api/incidents/service/{service_name}"
                if service_name
                else "/api/incidents/open"
            )
            r = await client.get(url)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return [{"error": f"HTTP {e.response.status_code}: {e.response.text}"}]
        except Exception as e:
            return [{"error": str(e)}]


@mcp.tool()
async def get_active_overrides() -> list[dict[str, Any]]:
    """
    List all manually created threshold overrides — these temporarily override
    the AI's decisions (e.g. "force timeout to 5000ms while DB is recovering").

    Use this to see if any manual interventions are active.
    """
    async with _client() as client:
        try:
            r = await client.get("/api/overrides")
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            return [{"error": f"HTTP {e.response.status_code}: {e.response.text}"}]
        except Exception as e:
            return [{"error": str(e)}]


@mcp.tool()
async def create_threshold_override(
    service_name: str,
    endpoint: str,
    adaptive_timeout_latency_ms: int | None = None,
    cache_latency_ms: int | None = None,
    circuit_breaker_error_rate: float | None = None,
    rate_limit_rpm: int | None = None,
    load_shed_latency_ms: int | None = None,
    reason: str = "Manual override via MCP",
) -> dict[str, Any]:
    """
    Temporarily override the AI-tuned thresholds for a specific endpoint.

    Use this when the user needs immediate manual intervention:
    - "Raise the timeout for /checkout to 5000ms while DB is recovering"
    - "Disable rate limiting for /products during a live demo"
    - "Force the circuit breaker open on /payment while it's broken"

    Only provide the fields you want to override — all are optional.

    Args:
        service_name: Name of the service
        endpoint: Endpoint path (e.g. "/checkout")
        adaptive_timeout_latency_ms: Override timeout threshold (ms)
        cache_latency_ms: Override caching latency threshold (ms)
        circuit_breaker_error_rate: Override circuit breaker threshold (0.0–1.0)
        rate_limit_rpm: Override rate limit (requests per minute)
        load_shed_latency_ms: Override load shedding latency threshold (ms)
        reason: Human-readable reason for the override
    """
    payload: dict[str, Any] = {
        "service_name": service_name,
        "endpoint": endpoint,
        "reason": reason,
    }
    if adaptive_timeout_latency_ms is not None:
        payload["adaptive_timeout_latency_ms"] = adaptive_timeout_latency_ms
    if cache_latency_ms is not None:
        payload["cache_latency_ms"] = cache_latency_ms
    if circuit_breaker_error_rate is not None:
        payload["circuit_breaker_error_rate"] = circuit_breaker_error_rate
    if rate_limit_rpm is not None:
        payload["rate_limit_rpm"] = rate_limit_rpm
    if load_shed_latency_ms is not None:
        payload["load_shed_latency_ms"] = load_shed_latency_ms

    async with _client() as client:
        try:
            r = await client.post("/api/overrides", json=payload)
            r.raise_for_status()
            return {"success": True, "override": r.json()}
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
@mcp.tool()
async def get_sdk_setup_instructions() -> dict[str, Any]:
    """
    Get the official SDK installation and setup instructions.
    Returns the markdown content from GETTING_STARTED.md and README.md
    so the AI can automatically write the integration code for the user.
    """
    try:
        getting_started = _read_doc("GETTING_STARTED.md")
        return {
            "instructions": getting_started,
            "tip": "Read the instructions to understand the required environment variables (CONTROL_PLANE_API_KEY, TENANT_ID, SERVICE_NAME) and how to apply the middleware."
        }
    except Exception as e:
        return {"error": str(e)}

@mcp.tool()
async def get_feature_documentation(feature: str) -> dict[str, Any]:
    """
    Read the official documentation for a specific AI Control Plane feature.
    Use this when the user needs help implementing or understanding a specific protection mechanism.
    
    Args:
        feature: The specific feature to look up. Must be one of:
                 "rate_limiting", "caching", "load_shedding", "circuit_breaker", 
                 "queue_deferral", "adaptive_timeout", "ai_decisions"
    """
    feature_file_map = {
        "rate_limiting": "RATE_LIMITING.md",
        "caching": "CACHING.md",
        "load_shedding": "LOAD_SHEDDING.md",
        "circuit_breaker": "CIRCUIT_BREAKER.md",
        "queue_deferral": "QUEUE_DEFERRAL.md",
        "adaptive_timeout": "ADAPTIVE_TIMEOUT.md",
        "ai_decisions": "AI_DECISIONS.md"
    }
    
    filename = feature_file_map.get(feature.lower())
    if not filename:
        return {"error": f"Unknown feature '{feature}'. Supported features: {', '.join(feature_file_map.keys())}"}
        
    try:
        doc_content = _read_doc(filename)
        return {
            "feature": feature,
            "documentation": doc_content
        }
    except Exception as e:
        return {"error": str(e)}

# ══════════════════════════════════════════════════════════════════════════════
# PROMPTS — Templates the user clicks in their AI editor for complex tasks
# ══════════════════════════════════════════════════════════════════════════════

@mcp.prompt()
def integrate_control_plane(service_name: str = "my-service") -> str:
    """
    Automatically instruments an Express.js app with ALL 6 SDK protection features.
    The user triggers this from their AI editor to get a full integration.
    """
    return f"""
Review the current Express.js server file in this project (usually server.js or app.js).

Your job is to fully instrument it with ALL 6 NeuralControl protection features.

## Step 1: Create sdk-init.js
```javascript
const ControlPlaneSDK = require('neuralcontrol');
const controlPlane = new ControlPlaneSDK({{
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || 'http://localhost:8000',
  serviceName: '{service_name}',
  apiKey: process.env.CONTROL_PLANE_API_KEY,
}});
module.exports = {{ controlPlane }};
```

## Step 2: Pre-warm at startup
Add this inside your `app.listen(...)` callback or an `async startServer()` function:
```javascript
const {{ controlPlane }} = require('./sdk-init');
await controlPlane.initialize([ /* all your endpoint paths */ ]);
```

## Step 3: Apply feature protection to each route

For each route you find:

**A. Routes that call a database** → wrap the DB call with `withDbTimeout()`:
```javascript
const users = await controlPlane.withDbTimeout('/db/users', () => db.getUsers());
```

**B. Routes that call external APIs** → replace `fetch()` with `adaptiveFetch()`:
```javascript
const result = await controlPlane.adaptiveFetch('/payments/gateway', url, options);
```

**C. Routes needing multiple protections** → use `middleware()` and check all flags:
```javascript
app.get('/products',
  controlPlane.middleware('/products'),
  async (req, res) => {{
    const {{ shouldCache, shouldSkip, isRateLimitedCustomer, isLoadShedding, isQueueDeferral }} = req.controlPlane;

    if (shouldSkip) return res.status(503).json({{ error: 'Service unavailable' }});
    if (isRateLimitedCustomer) return res.status(429).json({{ error: 'Too many requests', retryAfter: req.controlPlane.retryAfter }});
    if (isLoadShedding) return res.status(503).json({{ error: 'System overloaded' }});
    if (isQueueDeferral) {{
      await queue.add('task', req.body);
      return res.status(202).json({{ status: 'queued' }});
    }}

    const cacheKey = `cache:{service_name}${{req.path}}`;
    if (shouldCache) {{
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({{ cached: true, data: JSON.parse(cached) }});
    }}

    const data = await db.getData();
    if (shouldCache) await redis.setex(cacheKey, 300, JSON.stringify(data));
    res.json({{ cached: false, data }});
  }}
);
```

Read the full source code now and apply the correct method for each route.
"""


@mcp.prompt()
def debug_endpoint_latency(service_name: str, endpoint: str) -> str:
    """
    Starts an AI-led live debugging session for a slow or failing endpoint.
    The AI will call tools to gather live data and suggest fixes.
    """
    return f"""
The user reports that `{endpoint}` on service `{service_name}` is slow or timing out.

Debug this systematically:

1. Call `get_recent_metrics` with service_name="{service_name}", endpoint="{endpoint}" to see current p99 latency.
2. Call `get_adaptive_timeout_status` to see if the AI is detecting a latency spike right now.
3. Call `get_endpoint_config` with service_name="{service_name}", endpoint="{endpoint}" to see all active AI flags.
4. Call `get_open_incidents` with service_name="{service_name}" to check for active incidents.
5. Call `get_all_ai_insights` to see the AI's reasoning for recent decisions.

Based on results:
- If p99 latency is high → Explain the spike. Ask if you should call `create_threshold_override` to temporarily raise the timeout.
- If circuit breaker is open → Tell the user the downstream service is failing. Suggest fallback code.
- If caching is now active → Confirm the SDK is set up to use `req.controlPlane.shouldCache`.
- If no issues found → The endpoint is healthy. Suggest adding `withEndpointTimeout` or `adaptiveFetch` protection proactively.
"""


@mcp.prompt()
def explain_feature(
    feature: str = "caching",
) -> str:
    """
    Explains a specific NeuralControl feature and shows the exact SDK code pattern.

    Args:
        feature: One of: caching, circuit-breaker, rate-limiting, load-shedding, queue-deferral, adaptive-timeout
    """
    resource_map = {
        "caching": "docs://caching",
        "circuit-breaker": "docs://circuit-breaker",
        "rate-limiting": "docs://rate-limiting",
        "load-shedding": "docs://load-shedding",
        "queue-deferral": "docs://queue-deferral",
        "adaptive-timeout": "docs://adaptive-timeout",
    }
    resource = resource_map.get(feature, "docs://overview")
    return f"""
The user wants to understand the "{feature}" feature.

1. Read the resource at `{resource}` to get the full documentation.
2. Summarize what the feature does in 2-3 sentences.
3. Show the exact SDK code pattern they need to implement it.
4. Point out the ONE most important thing to get right (common mistake).
5. Ask if they want you to apply this to their current code.
"""


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
