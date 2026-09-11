# Verify: AI Decision Engine Optimization and Feature Flag Auto Rollback · spec 0006 · updated 2026-09-12
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## Commands
- [x] `/home/ayush/code/ai-control-plane/control-plane/venv/bin/python -c "import app.ai_engine.background_analyzer as bg; assert bg.is_endpoint_anomalous_or_trending({'avg_latency': 45.0, 'p95': 60.0, 'error_rate': 0.005, 'requests_per_minute': 10.0}, {'latency_trend': 'stable', 'error_trend': 'stable', 'rpm_trend': 'stable'}, {'circuit_breaker_error_rate': 0.3, 'cache_latency_ms': 500, 'queue_deferral_rpm': 80}) is False"` → Skips LLM on healthy endpoint (AC-1)
- [x] `/home/ayush/code/ai-control-plane/control-plane/venv/bin/python -c "import app.ai_engine.background_analyzer as bg; t = bg._compute_trends_from_windows({'avg_latency': 180.0, 'error_rate': 0.08, 'requests_per_minute': 40.0}, {'avg_latency': 100.0, 'error_rate': 0.01, 'requests_per_minute': 30.0, 'count': 100}); assert t['latency_trend'] == 'rising' and t['error_trend'] == 'rising'"` → Calculates 1h vs 24h trends correctly (AC-2)
- [x] `/home/ayush/code/ai-control-plane/control-plane/venv/bin/python -c "import asyncio, app.ai_engine.ai_engine as ai; res = asyncio.run(ai.get_ai_tuned_decision('svc', '/api', 200.0, 0.05, 50.0, 2.0, flag_performance={'v2': {'avg_latency': 650.0, 'error_rate': 0.15, 'count': 35}}, total_count=100, total_errors=5)); assert res['disable_flag'] is True and res['flag_to_disable'] == 'v2'"` → Identifies degraded flag and triggers rollback with sample size >= 20 (AC-3, AC-4)
- [x] `/home/ayush/code/ai-control-plane/control-plane/venv/bin/python -c "import app.redis.cache as c; assert c.get_tenant_key('t1', 'svc', 'flag:disabled', 'f1') == 'nc:tenant:t1:service:svc:flag:disabled:f1'"` → Constructs multi tenant flag override Redis key (AC-4)

## Acceptance criteria coverage
- AC-1 (Multi signal anomaly pre filtering gate) covered by Step 1
- AC-2 (Multi window 1h vs 24h trend computation) covered by Step 2
- AC-3 (Per flag performance attribution with minimum 20 samples) covered by Step 3
- AC-4 (Automated feature flag rollback and Redis override) covered by Step 3 and Step 4
