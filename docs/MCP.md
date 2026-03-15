# 🔌 MCP — Model Context Protocol Integration

> **Give your AI code editor full knowledge of your AI Control Plane — automatically.**

---

## What is MCP?

**MCP (Model Context Protocol)** is an open standard created by Anthropic that lets AI assistants connect to external tools and data sources. Think of it as a **USB port for AI** — any AI editor that supports MCP can plug into any MCP server and instantly gain new capabilities.

Without MCP, your AI assistant only knows what's in your open files. With MCP, it can:

- 📖 Read your project's documentation automatically
- 🔧 Call APIs — fetch live metrics, create overrides, check incidents
- 💬 Follow expert prompts — "debug this slow endpoint" or "instrument my app with the SDK"

---

## Why Does AI Control Plane Use MCP?

### The Problem

When you ask your AI assistant _"Why is /checkout slow?"_ or _"Add caching to my Express app"_, it has **no idea** about your AI Control Plane. It doesn't know:

- What features exist (adaptive timeout, caching, circuit breaker, rate limiting, load shedding, queue deferral)
- How your SDK works (`middleware()` vs `withEndpointTimeout()`)
- What's happening right now (live p99 latency, active incidents, AI decisions)

You'd have to manually copy-paste documentation, metrics, and config into the chat every time.

### The Solution

Our MCP server gives the AI **direct access** to everything:

```
┌──────────────────────────────────────────────────────┐
│              Your AI Code Editor                      │
│  (Cursor, VS Code, Windsurf, Claude Desktop, etc.)   │
│                                                      │
│  Developer asks: "Why is /checkout slow?"            │
│                      │                               │
│                      ▼                               │
│         ┌─────────────────────┐                      │
│         │    MCP Protocol     │ ← stdio connection    │
│         └─────────┬───────────┘                      │
└───────────────────┼──────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────┐
│         AI Control Plane MCP Server                   │
│                                                      │
│  📖 Resources — reads /docs/*.md automatically       │
│  🔧 Tools — calls backend API for live data          │
│  💬 Prompts — expert debugging & integration tasks   │
│                      │                               │
│                      ▼  HTTP                         │
│         ┌─────────────────────┐                      │
│         │ Control Plane API   │ (localhost:8000)      │
│         └─────────────────────┘                      │
└──────────────────────────────────────────────────────┘
```

### How It Helps You

| Without MCP                                                 | With MCP                                                                      |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| "Add caching" → AI writes generic Redis code                | AI reads your SDK docs → uses `req.controlPlane.shouldCache` correctly        |
| "Why is /checkout slow?" → AI guesses                       | AI calls `get_recent_metrics` → sees p99 is 4200ms → suggests raising timeout |
| "Set up the SDK" → AI writes boilerplate                    | AI reads GETTING_STARTED.md → generates correct `initialize()` + all 6 flags  |
| "Is anything broken?" → Developer checks dashboard manually | AI calls `get_open_incidents` → reports 2 active incidents with details       |

---

## What Our MCP Server Provides

### 📖 Resources (Documentation)

The AI reads these automatically when it needs context:

| Resource URI              | Documentation File                |
| ------------------------- | --------------------------------- |
| `docs://overview`         | README.md — full feature overview |
| `docs://getting-started`  | GETTING_STARTED.md — setup guide  |
| `docs://adaptive-timeout` | ADAPTIVE_TIMEOUT.md               |
| `docs://caching`          | CACHING.md                        |
| `docs://circuit-breaker`  | CIRCUIT_BREAKER.md                |
| `docs://rate-limiting`    | RATE_LIMITING.md                  |
| `docs://load-shedding`    | LOAD_SHEDDING.md                  |
| `docs://queue-deferral`   | QUEUE_DEFERRAL.md                 |
| `docs://ai-decisions`     | AI_DECISIONS.md                   |
| `docs://config-override`  | CONFIG_OVERRIDE.md                |
| `docs://configuration`    | CONFIGURATION.md                  |

### 🔧 Tools (Live Actions)

The AI calls these to query or modify live data:

| Tool                          | What it does                             |
| ----------------------------- | ---------------------------------------- |
| `get_endpoint_config`         | Fetch current AI config for any endpoint |
| `get_recent_metrics`          | Get p50/p95/p99 latency + error rates    |
| `get_adaptive_timeout_status` | See which endpoints have latency spikes  |
| `get_ai_thresholds`           | See the exact numbers AI is using        |
| `get_all_ai_insights`         | Read AI's reasoning for recent decisions |
| `get_open_incidents`          | Check for active incidents               |
| `get_active_overrides`        | List manual threshold overrides          |
| `create_threshold_override`   | Push a manual override from your editor  |

### 💬 Prompts (Expert Tasks)

Pre-built workflows the AI can follow:

| Prompt                    | What it does                                                |
| ------------------------- | ----------------------------------------------------------- |
| `integrate_control_plane` | Instruments your entire Express app with all 6 SDK features |
| `debug_endpoint_latency`  | Runs a live debugging session for a slow endpoint           |
| `explain_feature`         | Explains any single feature with code examples              |

---

## Installation

The easiest way to get the MCP server is via PyPI:

```bash
pip install neuralcontrol-mcp
```

## Configuration

The MCP server needs two environment variables to talk to your Control Plane. Use the **Live URL** for the standard managed experience.

| Variable | Description | Default / Example |
|----------|-------------|---------|
| `CONTROL_PLANE_URL` | URL of your control-plane backend | `https://api.neuralcontrol.online` (Live) |
| `NEURALCONTROL_API_KEY` | Your NeuralControl API key | *(required)* |

> [!TIP]
> Use `https://api.neuralcontrol.online` for the live system. Use `http://localhost:8000` only if you are running the control-plane backend locally via Docker.

---

## Integration Guides

### Cursor

Add to your `.cursor/mcp.json` (or via Settings → MCP):

```json
{
  "mcpServers": {
    "neuralcontrol": {
      "command": "neuralcontrol-mcp",
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Open Cursor Settings → MCP → you should see "ai-control-plane" with a green status.

---

### VS Code (GitHub Copilot)

VS Code supports MCP servers through GitHub Copilot's Agent mode. Add to your global **User Settings** (`settings.json`):

```json
{
  "mcp": {
    "servers": {
      "neuralcontrol": {
        "command": "neuralcontrol-mcp",
        "env": {
          "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
          "NEURALCONTROL_API_KEY": "your_key_here"
        }
      }
    }
  }
}
```

**Verify:** Open Copilot Chat → switch to **Agent** mode → the MCP tools appear as available tools.

---

### Windsurf

Windsurf supports MCP via its configuration file. Open **Windsurf Settings → MCP Configuration** or edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "neuralcontrol": {
      "command": "neuralcontrol-mcp",
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Open Cascade → the AI can now access your MCP tools and resources.

---

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "neuralcontrol": {
      "command": "neuralcontrol-mcp",
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Restart Claude Desktop → click the 🔌 plug icon → you should see "ai-control-plane" listed.

---

### Antigravity (Gemini-based)

Antigravity supports MCP servers. Add it as a stdio-based MCP server:

- **Command:** `neuralcontrol-mcp`
- **Transport:** `stdio`
- **Env Vars:** Set `CONTROL_PLANE_URL` and `NEURALCONTROL_API_KEY` in the configuration.

---

### Any Other MCP-Compatible Client

Our server uses **stdio transport** (the most widely supported). For any MCP client, simply use the `neuralcontrol-mcp` command.

```bash
# Test manually — the server starts and waits for JSON-RPC over stdin/stdout:
neuralcontrol-mcp
```

---

## Troubleshooting

### Server Not Starting

Test the server manually:

```bash
neuralcontrol-mcp
```

If it fails, ensure it's installed and in your PATH:

```bash
pip list | grep neuralcontrol-mcp
```

### Tools Not Working (Connection Refused)

The MCP server needs to reach the Control Plane API:

```bash
# Test the backend is reachable:
curl http://localhost:8000/r
```

If not running, start the control plane first:

```bash
cd control-plane && docker-compose up -d
```

### AI Not Using MCP Tools

Most editors require you to be in **Agent/Agentic mode** (not simple chat mode):

- **Cursor:** Use Agent mode, not Ask mode
- **VS Code:** Use Copilot Agent mode
- **Windsurf:** Use Cascade mode

---

## Example Conversations

Once connected, try asking your AI assistant:

- _"What features does the AI Control Plane provide?"_
- _"Why is `/api/products` slow right now?"_
- _"Add the neuralcontrol SDK to my Express app with all protections"_
- _"Are there any active incidents?"_
- _"Raise the timeout for `/checkout` to 5000ms for the next 30 minutes"_
- _"Explain how circuit breaker works and show me the code pattern"_

---

## Related

- 📖 [Getting Started with the SDK](./GETTING_STARTED.md)
- 📖 [Full Feature List](./README.md)
- 📖 [Config Overrides](./CONFIG_OVERRIDE.md)
- 🔧 [MCP Server Source Code](../mcp-server/server.py)
