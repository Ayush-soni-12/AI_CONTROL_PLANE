# 0006. AI Decision Engine Optimization and Feature Flag Auto Rollback

**Date**: 2026-09-12
**Status**: Decided

## Summary

This decision optimizes the AI decision pipeline by introducing a multi signal anomaly pre filtering gate to eliminate unnecessary LLM calls on healthy endpoints, adding proactive 1 hour versus 24 hour trend analysis, and establishing automatic feature flag rollbacks when a new rollout causes error rate or latency spikes.

## Context

In the previous codebase:
1. **Unfiltered AI Invocations**: The background analyzer and decision pipelines triggered expensive Gemini LLM calls across all services even when services were performing well below error and latency thresholds.
2. **Reactive Threshold Adjustments**: Without comparing short term (1h) sliding metrics against daily (24h) baseline metrics, the system only detected issues after critical thresholds were breached rather than catching rising degradation trends early.
3. **Manual Feature Flag Rollbacks**: When a microservice deployed a new feature flag that introduced a regression or memory leak, operators had to manually discover the anomaly and toggle off the flag.

## Requirements

**User stories**:
- As a platform operator, I want the system to skip expensive Gemini API calls on healthy microservices, so that token consumption and operating costs remain low without sacrificing safety.
- As a service owner, I want the decision engine to detect rising latency and error trends by comparing 1h metrics against 24h baselines, so that protective actions activate before an incident causes user facing failures.
- As a developer deploying a feature flag, I want NeuralControl to automatically disable the flag in Redis if it spikes error rates or latency, so that production rollouts fail safe automatically.

**Acceptance criteria**:
- **AC-1**: Implement a multi signal anomaly pre filtering gate in `app/ai_engine/ai_engine.py` and `app/ai_engine/background_analyzer.py` that skips Gemini LLM invocations when endpoints are healthy (error rate < 3%, latency < 1.5x baseline, and stable 1h vs 24h trends).
- **AC-2**: Implement multi window trend analysis comparing 1h sliding metrics to 24h baselines to calculate latency, error, and traffic trend directions (`rising`, `falling`, `stable`).
- **AC-3**: Implement per flag performance tracking and anomaly attribution that isolates flag specific latency and error metrics against baseline traffic with a minimum sample size of 20 signals.
- **AC-4**: Implement automatic feature flag rollback in `app/ai_engine/ai_engine.py`, `app/router/flags.py`, and `app/functions/decisionFunction.py` that writes flag disable overrides in Redis (`nc:tenant:{tenant_id}:service:{service_name}:overrides` and `flag:disabled:{flag_name}`) and emits an incident record when flag error rate > 10% or latency increases by more than 200%.

## Decision

We chose Option 1: Multi Signal Anomaly Gate with Automated Rollback.
We have implemented the anomaly pre filtering gate in `control-plane/app/ai_engine/ai_engine.py` and `background_analyzer.py`, trend computation across 1h vs 24h windows, and automated feature flag rollbacks with Redis overrides.

## Consequences

**Positive**:
- Drastic reduction in LLM operating costs and token usage on healthy services.
- Sub millisecond decision speed on healthy traffic paths.
- Proactive trend detection before service outages occur.
- Safe automated rollbacks for canary releases and feature flag rollouts.

**Tradeoffs**:
- Rollback evaluation requires at least 20 signal samples to prevent premature rollbacks on temporary network jitter.
