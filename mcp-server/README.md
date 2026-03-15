# neuralcontrol-mcp

> MCP Server for the [AI Control Plane](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE) — gives AI editors (Cursor, Claude, Windsurf) live access to your endpoint configs, real-time metrics, and SDK documentation.

## Installation

```bash
pip install neuralcontrol-mcp
```

## Configuration

Add this to your AI editor's MCP config (e.g. `~/.cursor/mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "neuralcontrol": {
      "command": "neuralcontrol-mcp",
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "acp_your_key_here"
      }
    }
  }
}
```

> [!NOTE]
> Use `https://api.neuralcontrol.online` (Live) or `http://localhost:8000` (Local).

Or copy `.env.example` to `.env` and fill in your values, then run directly:

```bash
neuralcontrol-mcp
# or
python -m server
```

## What you get

Once connected, your AI editor can:

| Tool | What it does |
|------|-------------|
| `get_endpoint_config` | Live AI flags (caching, circuit breaker, rate limits) for any endpoint |
| `get_recent_metrics` | Real-time p50/p95/p99 latency + error rates |
| `get_adaptive_timeout_status` | Which endpoints are currently timing out |
| `get_ai_thresholds` | Raw AI-calculated threshold values |
| `get_all_ai_insights` | Why the AI enabled/disabled each feature |
| `get_open_incidents` | Active latency spikes or error surges |
| `get_active_overrides` | Manual overrides currently in effect |
| `create_threshold_override` | Immediately override a threshold (e.g. during an incident) |
| `get_sdk_setup_instructions` | Get integration code for your service |
| `get_feature_documentation` | Full docs for any protection feature |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONTROL_PLANE_URL` | URL of your running control-plane backend | `http://localhost:8000` |
| `NEURALCONTROL_API_KEY` | Your NeuralControl API key | *(required)* |

## Hosted / Docker

To run as a persistent HTTP/SSE server (for team-wide access):

```bash
docker build -t neuralcontrol-mcp .
docker run -p 8080:8080 \
  -e CONTROL_PLANE_URL=https://your-api.yourdomain.com \
  -e NEURALCONTROL_API_KEY=acp_xxx \
  neuralcontrol-mcp
```

Then connect via URL:
```json
{ "mcpServers": { "neuralcontrol": { "url": "http://localhost:8080/sse" } } }
```

## License

MIT
