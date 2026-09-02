# Control Plane

## Overview

The control plane is the primary Python backend for NeuralControl. It handles real time traffic signals, LLM guided decisions, rate limiting, adaptive timeouts, circuit breaking, and database persistence.

## Key files

| File | Owns |
|---|---|
| app/main.py | FastAPI entry point, middleware, background scheduler, and startup routines |
| app/config.py | Application configuration and environment variable loading |
| app/database/database.py | PostgreSQL database session and engine setup |
| app/database/models.py | SQLAlchemy database models and tables |
| app/redis/cache.py | Redis caching client and helper methods |
| app/functions/decisionFunction.py | Core decision engine logic for traffic signals |
| app/router/signals.py | Endpoint for processing and ingesting incoming traffic signals |
| app/router/billing.py | Billing endpoints for agentic pay to bypass protocols |

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Run dev server
uvicorn app.main:app --reload

# Run database migrations
alembic upgrade head
```

## Conventions

- Always wrap database table creation and migrations in safe try except blocks to handle multi container startup.
- Keep Redis operations fast with lightweight caching and fast fail logic.
- Use Pydantic schemas for request validation across all API routers.

## Gotchas

- Database connections require valid credentials configured in environment variables or docker compose settings.
- Background scheduler jobs run on fixed cron schedules, check timezone settings when debugging time based aggregations.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
