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

## Prerequisites

Before connecting any editor, make sure:

1. **Control Plane is running** — `http://localhost:8000` (or your deployment URL)
2. **MCP server dependencies are installed:**
   ```bash
   cd mcp-server
   python3 -m venv .venv
   .venv/bin/pip install fastmcp httpx python-dotenv
   ```
3. **Environment variables are set** — create `mcp-server/.env`:
   ```bash
   CONTROL_PLANE_URL=http://localhost:8000
   NEURALCONTROL_API_KEY=your_api_key_here
   ```

---

## Integration Guides

### Cursor

Cursor natively supports MCP. Add a `.cursor/mcp.json` file to your **project root**:

```json
{
  "mcpServers": {
    "ai-control-plane": {
      "command": "/absolute/path/to/ai-control-plane/mcp-server/.venv/bin/python",
      "args": ["/absolute/path/to/ai-control-plane/mcp-server/server.py"],
      "env": {
        "CONTROL_PLANE_URL": "http://localhost:8000",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Open Cursor Settings → MCP → you should see "ai-control-plane" with a green status.

---

### VS Code (GitHub Copilot)

VS Code supports MCP servers through GitHub Copilot's Agent mode. Add a `.vscode/mcp.json` file to your **project root**:

```json
{
  "servers": {
    "ai-control-plane": {
      "command": "/absolute/path/to/ai-control-plane/mcp-server/.venv/bin/python",
      "args": ["/absolute/path/to/ai-control-plane/mcp-server/server.py"],
      "env": {
        "CONTROL_PLANE_URL": "http://localhost:8000",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

Or add it globally in **User Settings** (`settings.json`):

```json
{
  "mcp": {
    "servers": {
      "ai-control-plane": {
        "command": "/absolute/path/to/mcp-server/.venv/bin/python",
        "args": ["/absolute/path/to/mcp-server/server.py"],
        "env": {
          "CONTROL_PLANE_URL": "http://localhost:8000",
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
    "ai-control-plane": {
      "command": "/absolute/path/to/ai-control-plane/mcp-server/.venv/bin/python",
      "args": ["/absolute/path/to/ai-control-plane/mcp-server/server.py"],
      "env": {
        "CONTROL_PLANE_URL": "http://localhost:8000",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Open Cascade → the AI can now access your MCP tools and resources.

---

### Claude Desktop

Add to your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ai-control-plane": {
      "command": "/absolute/path/to/ai-control-plane/mcp-server/.venv/bin/python",
      "args": ["/absolute/path/to/ai-control-plane/mcp-server/server.py"],
      "env": {
        "CONTROL_PLANE_URL": "http://localhost:8000",
        "NEURALCONTROL_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Verify:** Restart Claude Desktop → click the 🔌 plug icon → you should see "ai-control-plane" listed.

---

### Antigravity (Gemini-based)

Antigravity supports MCP servers. Add the server in your workspace configuration or agent settings as a stdio-based MCP server:

- **Command:** `/absolute/path/to/mcp-server/.venv/bin/python`
- **Args:** `["/absolute/path/to/mcp-server/server.py"]`
- **Transport:** `stdio`

The environment variables (`CONTROL_PLANE_URL`, `NEURALCONTROL_API_KEY`) should be set in your `.env` file inside the `mcp-server/` directory, or passed via the MCP configuration.

---

### Any Other MCP-Compatible Client

Our server uses **stdio transport** (the most widely supported). For any MCP client:

1. **Command:** Point to the Python binary inside the virtual environment
2. **Args:** Path to `server.py`
3. **Transport:** `stdio`

```bash
# Test manually — the server starts and waits for JSON-RPC over stdin/stdout:
/path/to/mcp-server/.venv/bin/python /path/to/mcp-server/server.py
```

---

## Troubleshooting

### Server Not Starting

```bash
# Test the server manually:
cd mcp-server
.venv/bin/python server.py
# You should see the FastMCP banner
```

If it fails, check:

1. Virtual environment exists: `ls mcp-server/.venv/bin/python`
2. Dependencies installed: `.venv/bin/pip list | grep fastmcp`
3. Python version ≥ 3.10: `.venv/bin/python --version`

### Tools Not Working (Connection Refused)

The MCP server needs to reach the Control Plane API:

```bash
# Test the backend is reachable:
curl http://localhost:8000/
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
