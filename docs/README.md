# 🚀 AI Control Plane

An intelligent control plane that uses AI to automatically optimize microservices performance through dynamic caching, circuit breaking, and adaptive decision-making.

## ✨ Features

- 🤖 **AI-Powered Decisions**: Uses Gemini API to analyze metrics and make intelligent optimization decisions
- 📊 **Real-time Monitoring**: SSE-based live updates with p50/p95/p99 latency tracking
- 🔄 **Dynamic Caching**: AI decides when to cache based on latency patterns
- 🚦 **Rate Limiting**: AI-tuned rate limits to protect against abuse
- ⚖️ **Load Shedding**: Graceful degradation during traffic spikes
- 📋 **Queue Deferral**: Async processing for non-critical operations
- ⚡ **Circuit Breaker**: Protects services from cascade failures
- 👥 **Multi-Tenant Support**: Isolated metrics and decisions per tenant
- 📦 **Easy Integration**: Simple SDK integration for Node.js/Express services
- 🐳 **Docker Ready**: Complete stack with one command

---

## 🎯 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- OR: Python 3.11+, PostgreSQL, Node.js 20+ (for manual setup)

### Option 1: Docker Compose (Recommended) ⭐

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-control-plane.git
cd ai-control-plane

# Start everything with one command!
docker-compose up

# That's it! 🎉
# Control Plane: http://localhost:8000
# Demo Service: http://localhost:3001
```

### Option 2: Manual Setup

<details>
<summary>Click to expand manual setup instructions</summary>

#### 1. Setup PostgreSQL

```bash
# Install PostgreSQL
sudo apt-get install postgresql

# Create database
createdb ai_control_plane
```

#### 2. Setup Control Plane

```bash
cd control-plane

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://user:password@localhost:5432/ai_control_plane"

# Run the control plane
uvicorn app.main:app --reload
```

#### 3. Setup Demo Service

```bash
cd demo-service

# Install dependencies
npm install

# Run the demo service
npm start
```

</details>

---

## 📖 Usage

### For SDK Users (Integrate into Your App)

#### 1. Install the SDK

```bash
npm install @ayushsoni12/ai-control-plane
```

#### 2. Generate Tenant ID

```bash
# Generate unique tenant ID using OpenSSL
openssl rand -hex 16
# Output: bfc3aed7948e46fafacac26faf8b3159
```

#### 3. Use in Your Code

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";

// Initialize SDK
const sdk = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY, // From dashboard
  tenantId: process.env.TENANT_ID, // Generated above
  serviceName: "my-service",
  controlPlaneUrl: "http://localhost:8000",
});

// Use as middleware (automatic traffic management)
app.get("/products", sdk.middleware("/products"), async (req, res) => {
  // Handle rate limiting
  if (req.controlPlane.isRateLimitedCustomer) {
    return res.status(429).json({
      error: "Rate limited",
      retryAfter: req.controlPlane.retryAfter,
    });
  }

  // Handle load shedding
  if (req.controlPlane.isLoadShedding) {
    return res.status(503).json({
      error: "Service overloaded",
      retryAfter: req.controlPlane.retryAfter,
    });
  }

  // Check cache recommendation
  if (req.controlPlane.shouldCache && cache.products) {
    return res.json({ cached: true, data: cache.products });
  }

  // Fetch data
  const products = await getProductsFromDB();

  // Cache if recommended
  if (req.controlPlane.shouldCache) {
    cache.products = products;
  }

  res.json({ cached: false, data: products });
});
```

### For Contributors (Develop the Control Plane)

#### 1. Fork the Repository

Click "Fork" on GitHub to create your own copy.

#### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/ai-control-plane.git
cd ai-control-plane
```

#### 3. Start Development Environment

```bash
# Start all services
docker-compose up

# The code is mounted from your computer
# Edit files in VS Code and see changes immediately!
```

#### 4. Make Changes

```bash
# Edit code in your favorite editor
code .

# Changes are reflected immediately (hot reload)
```

#### 5. Test Your Changes

```bash
# Test the control plane
curl http://localhost:8000/

# Test the demo service
curl http://localhost:3001/products
```

#### 6. Commit and Push

```bash
# Commit your changes
git add .
git commit -m "Add awesome feature"

# Push to YOUR fork
git push origin main
```

#### 7. Create Pull Request

Go to GitHub and create a Pull Request from your fork to the original repository.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  AI Control Plane SDK                          │    │
│  │  - Tracks performance                          │    │
│  │  - Gets runtime config                         │    │
│  └────────────────┬───────────────────────────────┘    │
└───────────────────┼─────────────────────────────────────┘
                    │
                    │ HTTP
                    ▼
┌─────────────────────────────────────────────────────────┐
│              AI Control Plane (FastAPI)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Signals    │  │  AI Engine   │  │  Decisions   │ │
│  │  Collector   │─▶│  (LangGraph) │─▶│   Cache      │ │
│  │              │  │              │  │   Circuit    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                           │                             │
│                           ▼                             │
│                  ┌──────────────┐                       │
│                  │  PostgreSQL  │                       │
│                  │   Database   │                       │
│                  └──────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ai-control-plane/
├── control-plane/          # FastAPI backend
│   ├── app/
│   │   ├── main.py        # API endpoints
│   │   ├── models.py      # Database models
│   │   ├── database.py    # Database connection
│   │   └── functions/
│   │       └── decisionFunction.py  # Decision logic
│   ├── ai_engine/
│   │   └── ai_engine.py   # LangGraph AI workflow
│   ├── Dockerfile
│   └── requirements.txt
│
├── demo-service/          # Express demo app
│   ├── server.js          # Demo endpoints
│   ├── Dockerfile
│   └── package.json
│
├── sdk/                   # Node.js SDK package
│   └── nodejs/
│       └── index.js       # SDK implementation
│
├── docker-compose.yml     # Docker orchestration
└── README.md             # This file
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/ai-control-plane.git`
3. **Start** development environment: `docker-compose up`
4. **Make** your changes (edit code in VS Code)
5. **Test** your changes
6. **Commit**: `git commit -m "Add feature"`
7. **Push** to your fork: `git push origin main`
8. **Create** a Pull Request on GitHub

See [CONTRIBUTOR_WORKFLOW.md](./CONTRIBUTOR_WORKFLOW.md) for detailed instructions.

---

## 📚 Documentation

- [Contributor Workflow](./CONTRIBUTOR_WORKFLOW.md) - How to contribute
- [Cache Strategy](./REDIS_GUIDE.md) - Caching implementation details

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000

# Kill the process or change port in docker-compose.yml
```

### Database Connection Failed

```bash
# Check if postgres is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Code Changes Not Reflecting

```bash
# Rebuild containers
docker-compose up --build

# Or restart specific service
docker-compose restart control-plane
```

### Permission Denied (Docker)

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and back in
```

---

## 🎓 How It Works

1. **Your service** sends performance signals (latency, errors) to the control plane
2. **Control plane** stores signals in PostgreSQL
3. **AI engine** (LangGraph) analyzes the last 10 signals
4. **AI decides** whether to enable caching, circuit breaker, etc.
5. **Your service** gets the decision and acts accordingly
6. **Performance improves** automatically! 🎉

---

## 🌟 Features in Detail

### 🚦 AI-Powered Rate Limiting

Intelligent rate limiting that adapts to traffic patterns:

- **AI-Tuned Limits**: Automatically adjusts rate limits based on traffic patterns, error rates, and system load
- **Per-Customer Limits**: Protects against individual abusers while allowing legitimate traffic
- **Fair Usage**: Ensures equitable resource allocation across all tenants
- **HTTP 429 Compliance**: Standards-compliant rate limit responses with Retry-After headers

**When to Use**: Public APIs, resource-intensive endpoints, metered billing

📖 [Learn More](./RATE_LIMITING.md)

---

### ⚖️ Load Shedding

Graceful degradation during traffic spikes:

- **Automatic Activation**: Engages when CPU > 80%, p95 latency spikes, or error rates elevate
- **Priority-Based**: Sheds low-priority requests first, protecting critical operations
- **Fallback Strategies**: Return cached data or degraded responses instead of failures
- **HTTP 503 with Retry**: Proper status codes guide clients to retry later

**When to Use**: Flash sales, traffic spikes, resource exhaustion scenarios

📖 [Learn More](./LOAD_SHEDDING.md)

---

### 📋 Queue Deferral

Async processing for non-critical operations:

- **Smart Queuing**: AI identifies requests that can be processed asynchronously
- **Job Tracking**: User-managed job IDs with status endpoints
- **Notification Support**: Webhook and email notifications when jobs complete
- **HTTP 202 Accepted**: Standards-compliant async request handling

**When to Use**: Report generation, data exports, batch processing, background jobs

📖 [Learn More](./QUEUE_DEFERRAL.md)

---

### 🔄 Dynamic Caching

AI-driven caching decisions:

- **Latency-Based**: Automatically enables caching when p95 latency exceeds AI-tuned thresholds
- **Adaptive Thresholds**: Learns your service's normal patterns and adjusts accordingly
- **Multi-Tenant Isolation**: Separate cache recommendations per tenant
- **Real-Time Decisions**: Sub-50ms decision latency using Redis

**When to Use**: Database-heavy endpoints, slow external API calls, frequently accessed data

📖 [Learn More](./CACHING.md)

---

### ⚡ Circuit Breaker

Protects against cascade failures:

- **Error Detection**: Opens when error rate > 5% to prevent overwhelming failing services
- **Automatic Recovery**: Closes when error rates normalize
- **Fail Fast**: Returns immediate errors instead of waiting for timeouts
- **Configurable**: AI-tuned retry windows based on historical recovery times

**When to Use**: External API dependencies, microservice communication, unreliable services

📖 [Learn More](./CIRCUIT_BREAKER.md)

---

### 🤖 AI Decision Engine

Gemini-powered intelligent optimization:

- **Real-Time Metrics**: Analyzes p50/p95/p99 latencies, error rates, and traffic patterns
- **Redis Hot Data**: Sub-millisecond metric access with 60s TTL
- **Threshold Learning**: Continuously tunes cache, rate limit, and load shedding thresholds
- **SSE Updates**: Dashboard receives live AI decisions via Server-Sent Events (no polling!)
- **Multi-Factor Analysis**: Considers latency, errors, traffic, and resource utilization

📖 [Learn How AI Works](./AI_DECISIONS.md)

---

### 👥 Multi-Tenant Support

Complete isolation per tenant:

- **Separate Metrics**: Each tenant gets isolated performance tracking
- **Independent Decisions**: AI decisions tailored per tenant
- **Fair Resource Allocation**: Prevents one tenant from monopolizing resources
- **Scalable Architecture**: Handles thousands of tenants efficiently

**Best Practice**: Use different API keys and tenant IDs for each service

---

### 📊 Real-Time Monitoring

Live dashboards with SSE:

- **Server-Sent Events**: Real-time updates pushed to dashboard (no polling!)
- **Percentile Latencies**: Track p50, p95, p99 for accurate performance insights
- **Error Tracking**: Monitor 5xx errors, timeouts, and failure patterns
- **Traffic Visualization**: See request rates, trends, and anomalies
- **AI Insights**: View AI reasoning and threshold changes in real-time

**Dashboard**: http://localhost:3000

---

## 📝 License

MIT License - feel free to use this project!

---

## 🙏 Acknowledgments

- Built with FastAPI, LangGraph, PostgreSQL, and Express
- Inspired by modern microservices patterns
- Thanks to all contributors!

---

## 📧 Contact

- GitHub: [@AyushSoni](https://github.com/Ayush-soni-12)
- Email: sudhirsoni9889@gmail.com

---

**Made with ❤️ by Ayush**
