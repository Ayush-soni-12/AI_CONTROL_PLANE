# 🚀 Deployment Guide — AI Control Plane

A complete guide to deploying the AI Control Plane in a production-grade, split-server architecture.

---

## Architecture Overview

```
                         ┌─────────────────────────────────┐
                         │         Your Domain              │
                         │  api.yourdomain.com              │
                         │  dashboard.yourdomain.com        │
                         └───────────┬─────────────────────┘
                                     │
               ┌─────────────────────┴────────────────────┐
               │                                           │
               ▼                                           ▼
  ┌────────────────────────┐               ┌──────────────────────────┐
  │    AWS EC2 (Backend)   │               │   Vercel (Frontend)      │
  │                        │               │                          │
  │  Nginx (reverse proxy) │               │  Next.js Dashboard       │
  │  └─ FastAPI (Docker)   │               │  dashboard.yourdomain.com│
  │  └─ RabbitMQ (Docker)  │               │  (custom domain, free)   │
  │                        │               └──────────────────────────┘
  │  api.yourdomain.com    │
  └──────────┬─────────────┘
             │ connects to
  ┌──────────┴──────────────────────────┐
  │         Managed Services            │
  │  Neon      → PostgreSQL (free)      │
  │  Upstash   → Redis (free)           │
  │  (or RabbitMQ stays on EC2)         │
  └─────────────────────────────────────┘
```

**Why this split?**

| Component         | Where             | Reason                                             |
| ----------------- | ----------------- | -------------------------------------------------- |
| FastAPI backend   | AWS EC2           | SDKs and dashboard both hit this public URL        |
| Next.js dashboard | Vercel            | Free, zero-config Next.js hosting, instant deploys |
| PostgreSQL        | Neon (managed)    | Data survives EC2 restarts; free 0.5 GB tier       |
| Redis             | Upstash (managed) | Serverless, free 256 MB; no Redis process on EC2   |
| RabbitMQ          | Docker on EC2     | Messages are temporary; no critical data at risk   |

---

## Phase 1 — Managed Database Services

Set these up first — you'll need their connection strings for the EC2 environment variables.

### 1A. PostgreSQL → Neon

1. Go to [neon.tech](https://neon.tech) → Sign up (free)
2. Create a new project → name it `ai-control-plane`
3. Copy the **connection string** (it looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save it — this replaces `DATABASE_URL` in your `.env`

### 1B. Redis → Upstash

1. Go to [upstash.com](https://upstash.com) → Sign up (free)
2. Create a new Redis database → select the region closest to your EC2 region
3. Copy the **Redis URL** (it looks like):
   ```
   rediss://default:password@xxx.upstash.io:6379
   ```
4. Save it — this replaces `REDIS_URL` in your `.env`

> **Note on RabbitMQ:** Keep it running in Docker on EC2 for now. Messages are transient — losing them on a restart is acceptable at this stage.
> If you want managed RabbitMQ later → [cloudamqp.com](https://cloudamqp.com) has a free "Little Lemur" plan.

---

## Phase 2 — AWS EC2 Setup

### 2A. Launch the EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Settings to choose:

   | Setting        | Value                                            |
   | -------------- | ------------------------------------------------ |
   | Name           | `ai-control-plane-backend`                       |
   | AMI            | Ubuntu Server 24.04 LTS                          |
   | Instance type  | `t2.micro` (free tier, 1 year)                   |
   | Key pair       | Create new → download `.pem` file → keep it safe |
   | Security group | Allow inbound: SSH (22), HTTP (80), HTTPS (443)  |
   | Storage        | 20 GB gp3 (free tier allows 30 GB)               |

3. Launch the instance and note the **Public IPv4 address**.

### 2B. Point Your Domain to EC2

In your DNS provider (Namecheap, Cloudflare, etc.) add an **A record**:

```
Type  Name   Value               TTL
A     api    <your-EC2-IP>       Auto
```

This makes `api.yourdomain.com` point to your EC2 machine.

> **Tip:** Use Cloudflare as your DNS provider (free). It offers DDoS protection and lets you manage both your EC2 and Vercel DNS records in one place.

### 2C. Install Docker on EC2

SSH into your server:

```bash
ssh -i your-key.pem ubuntu@api.yourdomain.com
```

Install Docker:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Log out and back in for group change to take effect
exit
```

### 2D. Install Nginx + Certbot (SSL)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 2E. Clone the Repo

```bash
# Generate an SSH key on EC2 and add it to GitHub as a Deploy Key
ssh-keygen -t ed25519 -C "ec2-deploy"
cat ~/.ssh/id_ed25519.pub   # copy this to GitHub → Repo → Settings → Deploy Keys

# Clone the repo
git clone git@github.com:Ayush-soni-12/AI_CONTROL_PLANE.git
cd AI_CONTROL_PLANE
```

### 2F. Create the Production `.env` File

```bash
# In the project root on EC2
nano .env
```

Paste and fill in your real values:

```bash
# Database — from Neon
DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require

# Redis — from Upstash
REDIS_URL=rediss://default:password@xxx.upstash.io:6379

# RabbitMQ — running locally on EC2
RABBITMQ_URL=amqp://guest:guest123@localhost:5672/

# JWT — generate a strong random key
SECRET_KEY=<run: openssl rand -hex 32>

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Environment
ENVIRONMENT=production
```

> ⚠️ **Never commit `.env` to git.** It is already in `.gitignore`.

### 2G. Configure Nginx

Create the Nginx config for your backend:

```bash
sudo nano /etc/nginx/sites-available/api.yourdomain.com
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # Required for SSE (Server-Sent Events)
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        chunked_transfer_encoding on;

        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts (generous for SSE long-lived connections)
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

Enable the config and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/api.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t   # test config — should say OK
sudo systemctl reload nginx

# Get free HTTPS certificate from Let's Encrypt
sudo certbot --nginx -d api.yourdomain.com
# Follow prompts — certbot auto-updates the Nginx config with SSL
```

### 2H. Configure CORS in FastAPI

In `control-plane/app/main.py`, update the CORS allowed origins to include your Vercel dashboard domain:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dashboard.yourdomain.com",
        "http://localhost:3000",              # local dev
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2I. Start the Backend

```bash
# From the project root on EC2
docker compose up -d --build control-plane rabbitmq
```

Your backend is now live at `https://api.yourdomain.com` ✅

---

## Phase 3 — Frontend on Vercel (Custom Domain)

### 3A. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub (free)
2. Click **Add New Project** → Import your `AI_CONTROL_PLANE` repo
3. Configure the project:

   | Setting          | Value                           |
   | ---------------- | ------------------------------- |
   | Framework Preset | Next.js                         |
   | Root Directory   | `dashboard`                     |
   | Build Command    | `npm run build` (auto-detected) |
   | Output Directory | `.next` (auto-detected)         |

4. Add **Environment Variables** (click "Environment Variables" before deploying):

   | Key                             | Value                        |
   | ------------------------------- | ---------------------------- |
   | `NEXT_PUBLIC_CONTROL_PLANE_URL` | `https://api.yourdomain.com` |

5. Click **Deploy** → Vercel builds and gives you `yourproject.vercel.app`

### 3B. Add Your Custom Domain

1. In Vercel project → **Settings → Domains** → Add domain
2. Type `dashboard.yourdomain.com` → click Add

3. In your DNS provider (Cloudflare recommended), add a **CNAME record**:

   ```
   Type    Name        Value                TTL
   CNAME   dashboard   cname.vercel-dns.com Auto
   ```

4. Wait 1–5 minutes → Vercel automatically provisions HTTPS → your dashboard is live at `https://dashboard.yourdomain.com` ✅

> No Vercel branding. Visitors only see your domain.

---

## Phase 4 — GitHub Actions CI/CD

Auto-deploy whenever you push code to `main`.

### 4A. Store Secrets in GitHub

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name   | Value                                          |
| ------------- | ---------------------------------------------- |
| `EC2_HOST`    | `api.yourdomain.com`                           |
| `EC2_USER`    | `ubuntu`                                       |
| `EC2_SSH_KEY` | Contents of your `.pem` file (the whole thing) |

### 4B. Backend Deploy Workflow

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - "control-plane/**"
      - "docker-compose.yml"
      - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    name: Deploy to EC2
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd ~/AI_CONTROL_PLANE
            git pull origin main
            docker compose up -d --build control-plane
            docker image prune -f
            echo "✅ Backend deployed successfully"
```

### 4C. Frontend Deploy Workflow

**Vercel handles this automatically.** Every push to `main` that touches the `dashboard/` folder triggers a Vercel rebuild and deploy — no workflow file needed. Vercel sets this up when you connect your GitHub repo.

If you want to manually trigger or add a pre-deploy test step, create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Frontend CI

on:
  push:
    branches: [main]
    paths:
      - "dashboard/**"

jobs:
  check:
    name: Type Check & Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: dashboard/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: dashboard

      - name: Type check
        run: npm run build
        working-directory: dashboard
        env:
          NEXT_PUBLIC_CONTROL_PLANE_URL: https://api.yourdomain.com

      # Vercel auto-deploys after this job passes
```

---

## Phase 5 — Updating `docker-compose.yml` for Production

Your current `docker-compose.yml` runs Postgres and Redis in containers. In production you will remove those and only keep what runs on the EC2:

```yaml
# docker-compose.yml (production — Postgres and Redis are managed externally)

services:
  control-plane:
    build: ./control-plane
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL} # from .env → Neon
      REDIS_URL: ${REDIS_URL} # from .env → Upstash
      RABBITMQ_URL: ${RABBITMQ_URL}
      SECRET_KEY: ${SECRET_KEY}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      ENVIRONMENT: production
    depends_on:
      - rabbitmq
    restart: always

  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    restart: always

volumes:
  rabbitmq_data:
```

> **Tip:** You can keep the full `docker-compose.yml` (with Postgres/Redis) for local development. Create a separate `docker-compose.prod.yml` for production and run it with `docker compose -f docker-compose.prod.yml up -d`.

---

## Final Checklist

### Before Going Live

- [ ] Neon Postgres project created, connection string saved
- [ ] Upstash Redis database created, URL saved
- [ ] Domain bought (Namecheap/Porkbun/Cloudflare ~$10/year)
- [ ] DNS A record: `api.yourdomain.com` → EC2 IP
- [ ] DNS CNAME: `dashboard.yourdomain.com` → `cname.vercel-dns.com`

### EC2 Setup

- [ ] EC2 `t2.micro` launched, security groups allow 80/443/22
- [ ] Docker installed on EC2
- [ ] Nginx installed and configured for `api.yourdomain.com`
- [ ] SSL certificate issued by Certbot (auto-renews)
- [ ] `.env` file created on EC2 with production values
- [ ] CORS updated in FastAPI to allow `dashboard.yourdomain.com`
- [ ] `docker compose up -d` running on EC2

### Vercel

- [ ] Project imported from GitHub with `dashboard` as root directory
- [ ] `NEXT_PUBLIC_CONTROL_PLANE_URL` env var set to `https://api.yourdomain.com`
- [ ] Custom domain `dashboard.yourdomain.com` added and verified

### GitHub Actions

- [ ] `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` secrets added to repo
- [ ] `deploy-backend.yml` workflow created and pushed

---

## Cost Summary (Monthly)

| Service           | Plan                  | Cost          |
| ----------------- | --------------------- | ------------- |
| AWS EC2 t2.micro  | Free Tier (12 months) | $0            |
| Neon PostgreSQL   | Free tier             | $0            |
| Upstash Redis     | Free tier             | $0            |
| Vercel (Frontend) | Hobby plan            | $0            |
| Domain name       | .com                  | ~$1/month     |
| **Total**         |                       | **~$1/month** |

After the AWS free tier expires (~12 months), EC2 t2.micro costs ~$8–9/month, or you can move to Hetzner CX11 at ~€4/month for equivalent performance.

---

## URLs After Deployment

| What                | URL                                                             |
| ------------------- | --------------------------------------------------------------- |
| Dashboard           | `https://dashboard.yourdomain.com`                              |
| API (for SDK users) | `https://api.yourdomain.com`                                    |
| API Docs (Swagger)  | `https://api.yourdomain.com/docs`                               |
| RabbitMQ Management | `http://api.yourdomain.com:15672` (firewall this in production) |

---

## SDK Users After Deployment

Once live, any developer using your SDK will initialize it with your public backend URL:

```javascript
// Node.js
const sdk = new ControlPlaneSDK({
  apiKey: process.env.CONTROL_PLANE_API_KEY,
  tenantId: process.env.TENANT_ID,
  serviceName: "their-service",
  controlPlaneUrl: "https://api.yourdomain.com", // ← your live EC2 URL
});
```

```python
# Python
sdk = ControlPlaneSDK(
    api_key=os.getenv("CONTROL_PLANE_API_KEY"),
    tenant_id=os.getenv("TENANT_ID"),
    service_name="their-service",
    control_plane_url="https://api.yourdomain.com",  # ← your live EC2 URL
)
```
