# 🚀 AI Control Plane

An intelligent control plane that uses AI to automatically optimize microservices performance through dynamic caching, circuit breaking, and adaptive decision-making.

## ✨ Features

- 🤖 **AI-Powered Decisions**: Uses LangGraph to analyze performance metrics and make intelligent optimization decisions
- 📊 **Real-time Monitoring**: Tracks latency, error rates, and performance patterns across services
- 🔄 **Dynamic Caching**: Automatically enables/disables caching based on performance
- ⚡ **Circuit Breaker**: Protects services during degradation
- 👥 **Multi-Tenant Support**: Isolated metrics and decisions per tenant
- 📦 **Easy Integration**: 2-line SDK integration for any Node.js/Express service
- 🐳 **Docker Ready**: One-command setup with Docker Compose

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
npm install ai-control-plane-sdk
```

#### 2. Use in Your Code

```javascript
import ControlPlaneSDK, { generateTenantId } from "ai-control-plane-sdk";

// Initialize SDK
const sdk = new ControlPlaneSDK({
  serviceName: "my-service",
  tenantId: generateTenantId("user"),
  controlPlaneUrl: "http://localhost:8000",
});

// Use as middleware (automatic tracking)
app.get("/products", sdk.middleware("/products"), async (req, res) => {
  // Check if caching is recommended
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

## 🐳 Docker Commands

### Start Services

```bash
# Start in foreground (see logs)
docker-compose up

# Start in background
docker-compose up -d

# Rebuild and start (after code changes)
docker-compose up --build
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f control-plane
docker-compose logs -f demo-service
docker-compose logs -f postgres
```

### Stop Services

```bash
# Stop containers (keep data)
docker-compose down

# Stop and remove volumes (delete data)
docker-compose down -v
```

### Restart a Service

```bash
docker-compose restart control-plane
```

### Execute Commands in Container

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U controlplane -d controlplane

# Access Python shell
docker-compose exec control-plane python

# Access Node.js shell
docker-compose exec demo-service node
```

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://controlplane:password123@postgres:5432/controlplane

# Optional: Gemini API Key
GEMINI_API_KEY=your_api_key_here

# Control Plane URL
CONTROL_PLANE_URL=http://control-plane:8000
```

### SDK Configuration

```javascript
const sdk = new ControlPlaneSDK({
  serviceName: "my-service", // Your service name
  tenantId: "tenant-123", // Tenant identifier
  controlPlaneUrl: "http://localhost:8000",
  configCacheTTL: 10000, // Cache lifetime (ms)
});
```

---

## 📊 API Endpoints

### Control Plane

```bash
# Health check
GET http://localhost:8000/

# Send performance signal
POST http://localhost:8000/api/signals
{
  "service_name": "my-service",
  "endpoint": "/products",
  "latency_ms": 450,
  "status": "success",
  "tenant_id": "tenant-123"
}

# Get runtime config
GET http://localhost:8000/api/config/my-service/products?tenant_id=tenant-123

# Get all signals
GET http://localhost:8000/api/signals
```

### Demo Service

```bash
# Middleware approach
POST http://localhost:3001/login
GET http://localhost:3001/products

# Manual tracking approach
POST http://localhost:3001/checkout
GET http://localhost:3001/search?q=laptop
```

---

## 🧪 Testing

### Test the Control Plane

```bash
# Send a test signal
curl -X POST http://localhost:8000/api/signals \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "test-service",
    "endpoint": "/test",
    "latency_ms": 600,
    "status": "success",
    "tenant_id": "test-tenant"
  }'

# Get config
curl http://localhost:8000/api/config/test-service/test?tenant_id=test-tenant
```

### Test the Demo Service

```bash
# Test products endpoint
curl http://localhost:3001/products

# Test login endpoint
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'
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
- [SDK Quick Reference](./SDK_QUICK_REFERENCE.md) - SDK usage guide
- [Cache Strategy](./REDIS_GUIDE.md) - Caching implementation details
- [Cache Flow Diagram](./CACHE_FLOW_DIAGRAM.md) - How caching work 

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

### Dynamic Caching

- Automatically enables caching when latency > 500ms
- Reduces database load
- Improves response time

### Circuit Breaker

- Protects services during high error rates
- Prevents cascade failures
- Graceful degradation

### Multi-Tenant

- Isolated metrics per tenant
- Per-tenant decisions
- Scalable architecture

### AI-Powered

- Uses LangGraph for intelligent decisions
- Learns from performance patterns
- Adapts to changing conditions

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
