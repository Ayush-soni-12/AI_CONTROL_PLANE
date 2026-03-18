# EC2 Backend Deployment Guide

## AI Control Plane — Full Production Setup

> **Stack:** Ubuntu 22.04 LTS · FastAPI · PostgreSQL · Redis · RabbitMQ · Nginx · Cloudflare SSL · GitHub Actions

---

## Prerequisites

- ✅ EC2 instance (Ubuntu 22.04, 8GB RAM, ap-south-1)
- ✅ Domain purchased (`neuralcontrol.online`)
- ✅ Cloudflare account (free plan with SSL)
- ✅ GitHub repo with your code
- ✅ SSH access to EC2

---

## Part 1 — Initial EC2 Setup

### 1.1 Connect to EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### 1.2 Update system & install essentials

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget unzip build-essential
```

### 1.3 Open EC2 Security Group Ports

In AWS Console → EC2 → Security Groups → Inbound Rules, add:

| Port | Protocol | Source    | Purpose                  |
| ---- | -------- | --------- | ------------------------ |
| 22   | TCP      | Your IP   | SSH                      |
| 80   | TCP      | 0.0.0.0/0 | HTTP (Cloudflare)        |
| 443  | TCP      | 0.0.0.0/0 | HTTPS (Cloudflare)       |
| 8000 | TCP      | 127.0.0.1 | FastAPI (localhost only) |

> **Important:** Do NOT expose port 8000 to the public. Nginx will proxy it.

---

## Part 2 — Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create database and user

```bash
sudo -u postgres psql
```

Inside psql:

```sql
CREATE USER aiuser WITH PASSWORD 'your_strong_password';
CREATE DATABASE aicontrolplane OWNER aiuser;
GRANT ALL PRIVILEGES ON DATABASE aicontrolplane TO aiuser;
\q
```

### Test connection

```bash
psql -U aiuser -d aicontrolplane -h localhost
# Enter your password — if it connects, you're good
\q
```

Your `DATABASE_URL` will be:

```
postgresql://aiuser:your_strong_password@localhost:5432/aicontrolplane
```

---

## Part 3 — Install Redis

```bash
sudo apt install -y redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Secure Redis (optional but recommended)

```bash
sudo nano /etc/redis/redis.conf
```

Find and set:

```
bind 127.0.0.1
requirepass your_redis_password
```

```bash
sudo systemctl restart redis
redis-cli -a your_redis_password ping   # should return PONG
```

Your `REDIS_URL` will be:

```
redis://:your_redis_password@localhost:6379
```

---

## Part 4 — Install RabbitMQ

```bash
sudo apt install -y rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Create user and vhost
sudo rabbitmqctl add_user aiuser your_rabbit_password
sudo rabbitmqctl add_vhost aicontrolplane
sudo rabbitmqctl set_permissions -p aicontrolplane aiuser ".*" ".*" ".*"
sudo rabbitmqctl delete_user guest   # remove default insecure user
```

Your `RABBITMQ_URL` will be:

```
amqp://aiuser:your_rabbit_password@localhost:5672/aicontrolplane
```

---

## Part 5 — Deploy FastAPI Backend

### 5.1 Install Python & pip

```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
```

### 5.2 Clone the repo

```bash
cd /home/ubuntu
git clone https://github.com/Ayush-soni-12/AI_CONTROL_PLANE.git
cd AI_CONTROL_PLANE/control-plane
```

### 5.3 Create virtual environment

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5.4 Create .env file

```bash
nano .env
```

Paste and fill in your values:

```env
DATABASE_URL=postgresql://aiuser:your_strong_password@localhost:5432/aicontrolplane
REDIS_URL=redis://:your_redis_password@localhost:6379
RABBITMQ_URL=amqp://aiuser:your_rabbit_password@localhost:5672/aicontrolplane
SECRET_KEY=your_very_long_random_secret_key_here
GEMINI_API_KEY=your_gemini_api_key
```

### 5.5 Run database migrations

```bash
source venv/bin/activate
alembic upgrade head
```

### 5.6 Test it runs

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
# Visit http://YOUR_EC2_IP:8000 — should see {"message": "Control Plane is running!"}
# Press Ctrl+C to stop
```

### 5.7 Create systemd service (auto-start on reboot)

```bash
sudo nano /etc/systemd/system/aicontrolplane.service
```

Paste:

```ini
[Unit]
Description=AI Control Plane FastAPI
After=network.target postgresql.service redis.service rabbitmq-server.service

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/AI_CONTROL_PLANE/control-plane
Environment="PATH=/home/ubuntu/AI_CONTROL_PLANE/control-plane/venv/bin"
EnvironmentFile=/home/ubuntu/AI_CONTROL_PLANE/control-plane/.env
ExecStart=/home/ubuntu/AI_CONTROL_PLANE/control-plane/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start aicontrolplane
sudo systemctl enable aicontrolplane
sudo systemctl status aicontrolplane   # should show "active (running)"
```

---

## Part 6 — Nginx Setup

### 6.1 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6.2 Create Nginx config for your API

```bash
sudo nano /etc/nginx/sites-available/aicontrolplane
```

Paste:

```nginx
server {
    listen 80;
    server_name api.neuralcontrol.online;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE specific settings (important for real-time events)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding on;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/aicontrolplane /etc/nginx/sites-enabled/
sudo nginx -t          # test config — should say "ok"
sudo systemctl reload nginx
```

---

## Part 7 — Cloudflare SSL Setup

### 7.1 Point your domain to EC2 in Cloudflare

Go to **Cloudflare → yourdomain → DNS → Add record:**

| Type | Name  | Content              | Proxy                     |
| ---- | ----- | -------------------- | ------------------------- |
| A    | `api` | `YOUR_EC2_PUBLIC_IP` | ✅ Proxied (orange cloud) |

### 7.2 Set SSL mode in Cloudflare

Go to **Cloudflare → SSL/TLS → Overview:**

Select **"Full"** mode (NOT Full Strict, since we're using HTTP on origin).

> This means: Browser ↔ Cloudflare = HTTPS ✅  
> Cloudflare ↔ EC2 = HTTP (Cloudflare encrypts the public traffic)

### 7.3 Enable HTTPS redirect

Go to **Cloudflare → SSL/TLS → Edge Certificates:**

- Turn on **"Always Use HTTPS"** ✅
- Turn on **"Automatic HTTPS Rewrites"** ✅

### 7.4 (Optional) Use Cloudflare Origin Certificate for Full Strict

For full end-to-end encryption:

1. Go to **Cloudflare → SSL/TLS → Origin Server → Create Certificate**
2. Select your domain → 15 years → Create
3. Copy the **Certificate** and **Private Key**

On EC2:

```bash
sudo nano /etc/ssl/certs/cloudflare-origin.pem   # paste Certificate
sudo nano /etc/ssl/private/cloudflare-origin-key.pem   # paste Private Key
sudo chmod 600 /etc/ssl/private/cloudflare-origin-key.pem
```

Update Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name api.neuralcontrol.online;

    ssl_certificate /etc/ssl/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare-origin-key.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        chunked_transfer_encoding on;
    }
}

server {
    listen 80;
    server_name api.neuralcontrol.online;
    return 301 https://$host$request_uri;
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Then in Cloudflare → SSL/TLS → change to **"Full (Strict)"** mode.

### 7.5 Test it

```bash
curl https://api.neuralcontrol.online/
# Should return: {"message": "Control Plane is running!"}
```

---

## Part 8 — GitHub Actions CI/CD

This auto-deploys your backend every time you push to `main`.

### 8.1 Add GitHub Secrets

Go to **GitHub → Your Repo → Settings → Secrets and variables → Actions → New repository secret:**

| Secret Name   | Value                                      |
| ------------- | ------------------------------------------ |
| `EC2_HOST`    | Your EC2 public IP                         |
| `EC2_USER`    | `ubuntu`                                   |
| `EC2_SSH_KEY` | Contents of your `.pem` file (entire file) |

### 8.2 Create the workflow file

```bash
mkdir -p /home/ayush/code/ai-control-plane/.github/workflows
```

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches: [main]
    paths:
      - "control-plane/**" # Only trigger when backend changes

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to EC2
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /home/ubuntu/AI_CONTROL_PLANE

            # Pull latest changes
            git pull origin main

            # Activate venv and update dependencies
            cd control-plane
            source venv/bin/activate
            pip install -r requirements.txt --quiet

            # Run database migrations
            alembic upgrade head

            # Restart the service
            sudo systemctl restart aicontrolplane

            # Wait and check status
            sleep 5
            sudo systemctl is-active aicontrolplane && echo "✅ Deployment successful!" || echo "❌ Service failed to start"
```

### 8.3 Commit and push the workflow

```bash
git add .github/
git commit -m "add: github actions backend deployment"
git push
```

### 8.4 Allow ubuntu to restart systemd without password

On your EC2:

```bash
sudo visudo
```

Add this line at the bottom:

```
ubuntu ALL=(ALL) NOPASSWD: /bin/systemctl restart aicontrolplane, /bin/systemctl is-active aicontrolplane
```

---

## Verification Checklist

```bash
# On EC2 — check all services are running
sudo systemctl status postgresql     # ✅ active
sudo systemctl status redis          # ✅ active
sudo systemctl status rabbitmq-server # ✅ active
sudo systemctl status aicontrolplane # ✅ active
sudo systemctl status nginx          # ✅ active

# Test API
curl https://api.neuralcontrol.online/
# → {"message": "Control Plane is running!"}

# View live logs
sudo journalctl -u aicontrolplane -f
```

---

## Summary

```
neuralcontrol.online        → Vercel (Next.js frontend)
api.neuralcontrol.online    → EC2 via Cloudflare (FastAPI backend)
                               ├── Nginx (port 80/443)
                               │     └── proxy_pass → localhost:8000
                               ├── FastAPI (uvicorn, port 8000)
                               ├── PostgreSQL (localhost:5432)
                               ├── Redis (localhost:6379)
                               └── RabbitMQ (localhost:5672)
```

Every `git push` to `main` with changes in `control-plane/`:

1. GitHub Actions SSHs into EC2
2. Pulls latest code
3. Updates dependencies
4. Runs migrations
5. Restarts the service → **Zero-downtime deploy** ✅
