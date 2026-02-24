# 🛡️ Config Override — How It Works

## What Is It?

A **Config Override** lets you manually set specific **numeric thresholds** that the AI engine uses for traffic-management decisions — for a specific service endpoint, for a set duration.

Instead of waiting for the AI to react and tune thresholds on its own, you set the exact numbers you want **immediately**. The AI engine still runs for every request — it just uses **your value** for the thresholds you set, and keeps full control of the ones you don't.

---

## The Problem It Solves

The AI engine auto-tunes thresholds based on real-time metrics (latency, error rate, RPM). But sometimes **you know something the AI doesn't**:

| Situation                                | Without Override                                | With Override                                                |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------ |
| Big sale starting in 1 hour              | AI waits until latency spikes to enable caching | Set `cache_latency_ms=100` — cache kicks in much earlier     |
| Deploying a CPU-intensive change         | AI doesn't know circuit-breaker risk is higher  | Set `circuit_breaker_error_rate=0.05` — trips breaker faster |
| Expecting 5× normal traffic              | AI's queue deferral threshold is too high       | Set `queue_deferral_rpm=40` — queue traffic earlier          |
| VIP customers must never be rate-limited | AI's per-customer limit is too aggressive       | Set `rate_limit_customer_rpm=500` — raise the limit          |

---

## How It Works — Step by Step

### 1. You Create an Override (Dashboard or API)

Each threshold field is a **number** (or `null` to leave it AI-controlled):

```http
POST /api/overrides
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "service_name": "demo-service",
  "endpoint": "/api/products",
  "duration_minutes": 30,
  "reason": "Sale event — lower cache latency threshold",

  "cache_latency_ms": 100,           ← your value (AI default ~500ms)
  "circuit_breaker_error_rate": null, ← AI still decides
  "queue_deferral_rpm": null,         ← AI still decides
  "load_shedding_rpm": null,          ← AI still decides
  "rate_limit_customer_rpm": null     ← AI still decides
}
```

This stores a row in `config_overrides`:

```
id | service | endpoint      | cache_latency_ms | circuit_breaker_error_rate | expires_at          | is_active
1  | demo    | /api/products | 100              | NULL                       | 2026-02-23 13:00:00 | true
```

---

### 2. Every Request Checks for an Override First

When your service calls `GET /api/config/demo-service/products`, the backend runs `make_decision()`.

**The very first thing** `make_decision()` does is check `config_overrides`:

```python
# decisionFunction.py — runs BEFORE any Redis or AI logic
override = await _get_active_override(db, user_id, service_name, endpoint)

if override is not None:
    # Run AI decision as normal, but replace thresholds with override values
    # wherever a non-null override exists:
    effective_cache_threshold = override.cache_latency_ms ?? ai_threshold.cache_latency_ms
    effective_error_rate      = override.circuit_breaker_error_rate ?? ai_threshold.circuit_breaker_error_rate
    effective_queue_rpm       = override.queue_deferral_rpm ?? ai_threshold.queue_deferral_rpm
    effective_shed_rpm        = override.load_shedding_rpm ?? ai_threshold.load_shedding_rpm
    effective_rate_rpm        = override.rate_limit_customer_rpm ?? ai_threshold.rate_limit_customer_rpm

    return make_decision_with_thresholds(
        ...,
        cache_latency_ms=effective_cache_threshold,
        ...
        reason=f"[Manual Override] {override.reason} ({override.minutes_remaining}m remaining)"
    )

# Only reaches here if NO active override exists
# → runs normal AI decision logic with AI-tuned thresholds
```

**Key design choices:**

- `null` threshold = AI still decides that specific threshold. Only the values you explicitly set are overridden.
- Override is checked **before** any Redis reads or Gemini calls — adds ~1ms max.
- Override check uses a covering index (`idx_override_active_lookup`) — single fast DB lookup per request.

---

### 3. Override Expires Automatically

No cleanup needed. The lookup always filters by `expires_at > NOW()`:

```python
models.ConfigOverride.expires_at > now   # ← expired overrides are ignored
```

When the duration passes, the next request finds no active override and the AI resumes full control automatically.

You can also cancel early from the dashboard (or `DELETE /api/overrides/{id}`).

---

## The Threshold Fields

Each field is a **numeric value** or `null`:

| Field                        | What it controls                                        | Example value | AI default |
| ---------------------------- | ------------------------------------------------------- | ------------- | ---------- |
| `cache_latency_ms`           | Enable caching when avg latency exceeds this (ms)       | `100`         | ~500ms     |
| `circuit_breaker_error_rate` | Open circuit breaker when error rate exceeds this (0–1) | `0.05`        | ~0.3       |
| `queue_deferral_rpm`         | Defer requests to queue when global RPM exceeds this    | `40`          | ~80 rpm    |
| `load_shedding_rpm`          | Shed load when global RPM exceeds this                  | `120`         | ~150 rpm   |
| `rate_limit_customer_rpm`    | Rate-limit a single customer above this RPM             | `500`         | ~15 rpm    |

**Setting a lower value** = more aggressive / earlier trigger.  
**Setting a higher value** = more relaxed / later trigger.  
**`null`** = AI keeps full control of that threshold.

---

## API Reference

### Create Override

```http
POST /api/overrides
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "service_name": "string",
  "endpoint": "/api/path",
  "duration_minutes": 30,               (1 – 480)
  "reason": "Why you're doing this",
  "cache_latency_ms": 100 | null,
  "circuit_breaker_error_rate": 0.05 | null,
  "queue_deferral_rpm": 40 | null,
  "load_shedding_rpm": 120 | null,
  "rate_limit_customer_rpm": 500 | null
}
```

### List All Overrides

```http
GET /api/overrides
```

Returns last 50 overrides (active + expired), ordered by creation time.

### Get Active Override for One Endpoint

```http
GET /api/overrides/{service_name}/{endpoint}
```

Returns the active override or `null` if none.

### Cancel Override

```http
DELETE /api/overrides/{override_id}
```

Immediately deactivates the override. AI resumes control on the next request.

---

## Dashboard UI

Go to **Dashboard → Overrides** (Shield icon in sidebar).

- **New Override** button — opens the create form
- **Per-threshold toggles** — enable each threshold individually; only enabled ones are sent
- **Number input** — type the exact value you want; shows the AI's current default for reference
- **Duration slider** — 1 minute to 8 hours
- **Active override cards** — show green countdown badge with minutes remaining, and the exact threshold values in effect
- **Cancel button** — red trash icon on each active card
- **Expired section** — collapsible history of past overrides

---

## Files

| File                                              | What it does                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `control-plane/app/database/models.py`            | `ConfigOverride` SQLAlchemy model — numeric threshold columns                        |
| `control-plane/app/router/overrides.py`           | FastAPI router — CRUD endpoints                                                      |
| `control-plane/app/functions/decisionFunction.py` | `_get_active_override()` + threshold merge logic in `make_decision()`                |
| `dashboard/hooks/useOverrides.ts`                 | React Query hooks (list, create, cancel)                                             |
| `dashboard/components/dashboard/overrides/`       | Split UI components (ThresholdRow, ThresholdInput, CreateOverrideForm, OverrideCard) |
| `dashboard/app/dashboard/overrides/page.tsx`      | Next.js page — directly uses the above components                                    |

---

## FAQ

**Q: What happens if both Redis data and an override exist?**  
A: The override wins — it replaces specific thresholds before Redis metrics are even evaluated.

**Q: Can I have two active overrides for the same endpoint?**  
A: No. Creating a new override automatically deactivates any existing one for that endpoint.

**Q: What if I don't set any thresholds (all `null`)?**  
A: The override is created but has no effect — all thresholds still come from the AI. The dashboard warns you if you try to submit with no thresholds set.

**Q: Does the override affect the AI background analyzer?**  
A: No. The background analyzer (Gemini) still updates AI thresholds every 5 minutes. The override only affects real-time request decisions.

**Q: Can I set a threshold higher than the AI's current value?**  
A: Yes. For example, setting `rate_limit_customer_rpm=500` raises the bar — customers won't be rate-limited until they hit 500 RPM instead of the AI's default ~15 RPM.
