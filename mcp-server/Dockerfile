# ──────────────────────────────────────────────────────────────────────────────
# neuralcontrol-mcp — Dockerfile for hosted SSE deployment
#
# Build:  docker build -t neuralcontrol-mcp .
# Run:    docker run -p 8080:8080 \
#           -e CONTROL_PLANE_URL=https://api.yourdomain.com \
#           -e NEURALCONTROL_API_KEY=acp_xxx \
#           neuralcontrol-mcp
#
# Then configure your AI editor to connect via SSE:
#   { "url": "http://localhost:8080/sse" }
# ──────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY pyproject.toml .
RUN pip install --no-cache-dir "fastmcp>=2.0.0" "httpx>=0.27.0" "python-dotenv>=1.0.0"

# Copy source
COPY server.py .
COPY .env.example .

# Environment defaults (override at runtime)
ENV CONTROL_PLANE_URL=http://localhost:8000
ENV NEURALCONTROL_API_KEY=""
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Run in SSE (HTTP) mode so AI editors can connect via URL instead of subprocess
CMD ["python", "server.py", "--transport", "sse", "--host", "0.0.0.0", "--port", "8080"]
