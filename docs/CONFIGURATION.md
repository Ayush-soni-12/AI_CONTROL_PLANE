# ⚙️ Configuration Guide

Complete reference for configuring AI Control Plane across all deployment scenarios.

## Environment Variables

### Control Plane (Backend)

```bash
# Database Configuration
DATABASE_URL=postgresql://Ayush:Ayush123@localhost:5432/ai_control_plane

# Redis Configuration
REDIS_URL=redis://default:Ayush@123@localhost:6379

# JWT Authentication
SECRET_KEY=09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# SMTP Email Configuration
SMTP_MAIL=your_email@gmail.com
SMTP_PASS=your_app_password_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

```

### SDK (Your Services)

```bash
# API Authentication
CONTROL_PLANE_API_KEY=acp_your_key_here
TENANT_ID=your_tenant_id_here

# Service Configuration
SERVICE_NAME=my-service
CONTROL_PLANE_URL=http://localhost:8000

# Optional: Node Environment
NODE_ENV=development  # development, production
```

---

## Generating Credentials

### 1. Tenant ID

Generate using OpenSSL:

```bash
openssl rand -hex 16
```

**Output:** `bfc3aed7948e46fafacac26faf8b3159`

### 2. Secret Key (JWT)

Generate a secure secret key:

```bash
openssl rand -hex 32
```

**Output:** `09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7`

### 3. API Key

Generated from the dashboard:

1. Visit http://localhost:3000
2. Navigate to API Keys
3. Click "Generate New Key"
4. Copy: `acp_2d936ad37aae3cea5635b46db3708d93897c96af`

---

## Multi-Service Configuration

### Separate Keys per Service (Recommended)

```bash
# user-service/.env
CONTROL_PLANE_API_KEY=acp_key_for_user_service
TENANT_ID=user_service_tenant_id
SERVICE_NAME=user-service

# product-service/.env
CONTROL_PLANE_API_KEY=acp_key_for_product_service
TENANT_ID=product_service_tenant_id
SERVICE_NAME=product-service

# order-service/.env
CONTROL_PLANE_API_KEY=acp_key_for_order_service
TENANT_ID=order_service_tenant_id
SERVICE_NAME=order-service
```

**Benefits:**

- Independent monitoring
- Isolated rate limits
- Better security
- Easier debugging

---

## SDK Configuration Options

### Full Configuration

```javascript
import ControlPlaneSDK from "@ayushsoni12/ai-control-plane";

const controlPlane = new ControlPlaneSDK({
  // Required
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: process.env.SERVICE_NAME,

  // Optional
  controlPlaneUrl: process.env.CONTROL_PLANE_URL || "http://localhost:8000",
});
```

### Configuration Reference

| Option             | Type    | Default                 | Description                          |
| ------------------ | ------- | ----------------------- | ------------------------------------ |
| `apiKey`           | string  | **Required**            | API key from dashboard               |
| `tenantId`         | string  | **Required**            | Unique tenant identifier             |
| `serviceName`      | string  | **Required**            | Name of your service                 |
| `controlPlaneUrl`  | string  | `http://localhost:8000` | Control Plane API URL                |

---

## Docker Compose Setup

### Development Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: Ayush
      POSTGRES_PASSWORD: Ayush123
      POSTGRES_DB: ai_control_plane
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass "Ayush@123"
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  control-plane:
    build: ./control-plane
    environment:
      DATABASE_URL: postgresql://Ayush:Ayush123@postgres:5432/ai_control_plane
      REDIS_URL: redis://default:Ayush@123@redis:6379
      SECRET_KEY: ${SECRET_KEY}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - control-plane

volumes:
  postgres_data:
  redis_data:
```

---

## Production Deployment

### Environment-Specific Configuration

```bash
# production.env
DATABASE_URL=postgresql://user:pass@prod-db:5432/control_plane
REDIS_URL=redis://user:pass@prod-redis:6379
CONTROL_PLANE_URL=https://api.yourdomain.com
NODE_ENV=production
SECRET_KEY=<Generated with openssl rand -hex 32>
GEMINI_API_KEY=<Your production Gemini key>
```

### Production Checklist

- [ ] Use strong passwords for DB and Redis
- [ ] Enable SSL/TLS for all connections
- [ ] Set `NODE_ENV=production`
- [ ] Use managed database (AWS RDS, Cloud SQL)
- [ ] Use managed Redis (ElastiCache, Cloud Memorystore)
- [ ] Rotate API keys regularly
- [ ] Enable monitoring and alerting
- [ ] Configure backup and disaster recovery
- [ ] Set up rate limiting at API gateway level
- [ ] Use environment-specific `.env` files (never commit!)

---

## Security Best Practices

### 1. API Key Management

```bash
# ✅ GOOD: Use environment variables
CONTROL_PLANE_API_KEY=acp_xxxxx

# ❌ BAD: Hardcode in source
const apiKey = 'acp_xxxxx';
```

### 2. Tenant ID Isolation

```bash
# ✅ GOOD: Unique per service
user-service: tenant_user_abc123
product-service: tenant_product_def456

# ❌ BAD: Shared tenant ID
both-services: tenant_shared
```

### 3. Secret Rotation

```bash
# Rotate every 90 days
1. Generate new secret: openssl rand -hex 32
2. Update environment variable
3. Restart services
4. Delete old secret from password manager
```

---





---




---





---

## Troubleshooting

### Configuration Issues

**Problem:** "API key invalid"

```bash
# Check API key is loaded
echo $CONTROL_PLANE_API_KEY

# Verify no extra spaces/quotes
CONTROL_PLANE_API_KEY=acp_xxxxx  # ✅ Good
CONTROL_PLANE_API_KEY="acp_xxxxx"  # ❌ Bad (extra quotes)
```

**Problem:** "Database connection failed"

```bash
# Test database connection
psql $DATABASE_URL

# Check connection string format
postgresql://user:pass@host:port/dbname
```

**Problem:** "Redis connection error"

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 -a "Ayush@123" PING

# Should return: PONG
```

---

## Quick Reference

### Minimum Required Config

```bash
# SDK
CONTROL_PLANE_API_KEY=<from dashboard>
TENANT_ID=<openssl rand -hex 16>
SERVICE_NAME=my-service

# Control Plane
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SECRET_KEY=<openssl rand -hex 32>
```

### Optional But Recommended

```bash
GEMINI_API_KEY=<for AI features>
SMTP_MAIL=<for notifications>
SMTP_PASS=<app password>
```

---

## Related Documentation

- 📖 [Getting Started](./GETTING_STARTED.md) - Quick setup guide
- 📖 [SDK Quick Reference](./SDK_QUICK_REFERENCE.md) - SDK usage
- 📖 [Production Deployment](./PRODUCTION.md) - Going to production

---

**Need help?** Check [Troubleshooting](#troubleshooting) or visit our [GitHub Discussions](https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/discussions).
