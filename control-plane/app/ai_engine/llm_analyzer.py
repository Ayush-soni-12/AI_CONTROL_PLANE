"""
LLM Analyzer — Uses Gemini with Pydantic structured output.

Calls Gemini 2.0 Flash to analyze service metrics and recommend
optimal thresholds. Uses .with_structured_output() to force the
LLM to return validated Pydantic models — no raw JSON parsing.
"""

import os
import logging
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from app.ai_engine.schemas import ThresholdRecommendation, PatternAnalysis
from app.config import settings

logger = logging.getLogger(__name__)


def _get_llm():
    """Get configured Gemini LLM instance."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment variables")
    
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.1,  # Low temp for consistent outputs
        google_api_key=api_key
    )


async def analyze_service_thresholds(
    service_name: str,
    endpoint: str,
    metrics: dict,
    current_thresholds: dict
) -> Optional[ThresholdRecommendation]:
    """
    Use LLM to analyze metrics and recommend optimal thresholds.
    
    Returns a validated ThresholdRecommendation Pydantic model.
    The LLM is forced to match the schema — no raw JSON parsing needed.
    """
    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(ThresholdRecommendation)
        
        prompt = f"""You are a senior SRE specializing in API performance optimization and traffic management. Your task is to analyze service metrics and recommend optimal threshold values that balance performance, reliability, and cost.

## Service Context
- Service: {service_name}
- Endpoint: {endpoint}
- Analysis window: Last 5 minutes
- Data volume: {metrics.get('count', 0)} requests

## Current Performance Metrics

### Request Volume
- Total requests: {metrics.get('count', 0)}
- Requests per minute: {metrics.get('requests_per_minute', 0):.1f} RPM

### Latency Distribution
- Average: {metrics.get('avg_latency', 0):.1f}ms
- p50 (median - half of requests faster than this): {metrics.get('p50', 0):.1f}ms
- p95 (95% of requests faster than this): {metrics.get('p95', 0):.1f}ms
- p99 (99% of requests faster than this): {metrics.get('p99', 0):.1f}ms

### Reliability
- Error rate: {metrics.get('error_rate', 0) * 100:.2f}%

## Current Threshold Configuration
- Cache activation threshold: {current_thresholds.get('cache_latency_ms', 500)}ms
- Circuit breaker error threshold: {current_thresholds.get('circuit_breaker_error_rate', 0.3) * 100:.1f}%
- Queue deferral threshold: {current_thresholds.get('queue_deferral_rpm', 80)} RPM
- Load shedding threshold: {current_thresholds.get('load_shedding_rpm', 150)} RPM
- Per-customer rate limit: {current_thresholds.get('rate_limit_customer_rpm', 15)} RPM

## Threshold Calculation Rules

### 1. cache_latency_ms (10-5000)
**What it does**: When response time exceeds this value (in milliseconds), caching activates to reduce backend load
**How to calculate**:
- Start with p95 latency × 1.20 (activate caching before performance degrades)
- MUST be ≥ p50 latency (don't cache if service is already fast)
- For fast services (p50 < 50ms): use p95 × 1.30
- For slow services (p50 > 200ms): use p95 × 1.15
- Round to nearest 10ms
**Example**: If p95=80ms and p50=45ms → 80×1.3=104ms → round to 100ms

### 2. circuit_breaker_error_rate (0.01-1.0, as decimal)
**What it does**: When error rate exceeds this percentage, circuit breaker stops all requests to prevent cascading failures
**How to calculate**:
- If current error rate < 0.02 (2%): use 0.15 (15%) as baseline
- Otherwise: current error rate × 2.0, but never below 0.10 (10%)
- For critical services: never below 0.12 (12%)
**Example**: If current error rate is 0.005 (0.5%) → use 0.15. If error rate is 0.08 (8%) → 0.08×2=0.16

### 3. queue_deferral_rpm (10-1000)
**What it does**: At this traffic level (requests per minute), low/medium priority requests wait in queue instead of being processed immediately
**How to calculate**:
- Estimate capacity limit: look at current RPM vs p95 latency
- If p95 > 1.5× p50 AND traffic is high: service is stressed, set lower (current RPM × 0.7)
- Otherwise: set to 80-90% of estimated capacity
- If insufficient data (< 100 requests): use conservative estimate based on current RPM × 1.5
**Example**: Current RPM=60, p95=100ms, p50=50ms, ratio=2.0 (stressed) → 60×0.7=42

### 4. load_shedding_rpm (20-5000)
**What it does**: At this critical traffic level, low/medium priority requests are dropped to protect system stability
**How to calculate**:
- MUST be greater than queue_deferral_rpm (validate this!)
- Set to queue_deferral_rpm × 1.40 (40% buffer between queuing and dropping)
- Minimum gap of 20 RPM between queue and load shed
**Example**: If queue_deferral_rpm=60 → load_shedding_rpm=60×1.4=84

### 5. rate_limit_customer_rpm (5-500)
**What it does**: Maximum requests per minute allowed from any single customer IP address
**How to calculate**:
- Calculate average requests per customer: total RPM ÷ estimated unique IPs
- If total RPM < 50: be generous, use 20-30 RPM per customer
- Otherwise: average per customer × 3-5 (allow legitimate burst)
- Never below 5 RPM (too restrictive)
**Example**: Total RPM=100, assume 20 users → avg=5 RPM → allow 5×4=20 RPM per customer

## Confidence Level Determination
Set confidence field based on data volume:
- If request count < 50: use "low" (not enough data)
- If request count 50-500: use "medium" (reasonable sample)
- If request count > 500: use "high" (solid data)

Current request count: {metrics.get('count', 0)} → your confidence should be {"low" if metrics.get('count', 0) < 50 else "medium" if metrics.get('count', 0) < 500 else "high"}

## Your Output Requirements

You must provide exactly these fields:

1. **cache_latency_ms**: Integer between 10-5000
2. **circuit_breaker_error_rate**: Decimal between 0.01-1.0 (e.g., 0.15 for 15%)
3. **queue_deferral_rpm**: Integer between 10-1000
4. **load_shedding_rpm**: Integer between 20-5000 (MUST be > queue_deferral_rpm)
5. **rate_limit_customer_rpm**: Integer between 5-500
6. **reasoning**: 50-1000 character plain-language explanation
7. **confidence**: Exactly one of: "low", "medium", "high"

## Writing Your Reasoning (50-1000 characters)

Your reasoning MUST be in plain, simple language that non-technical people can understand. Follow this structure:

**Paragraph 1** (What you observed):
"The service is currently handling [X] requests per minute with [description of performance]. [Observation about latency/errors/patterns]."

**Paragraph 2** (Why you chose these values):
"I set caching to activate at [X]ms because [reason]. The circuit breaker triggers at [X]% errors to [reason]. Traffic management kicks in at [X] requests per minute for queuing and [X] for dropping requests to [reason]."

**Paragraph 3** (What this accomplishes):
"These settings will [benefit] while [trade-off consideration]."

### Bad vs Good Examples:

❌ BAD: "Thresholds calibrated based on p95 latency metrics and error rate SLAs to optimize for tail latency while preventing cascade failures in distributed systems."

✅ GOOD: "The service is running well with 45ms average response time and very few errors (0.5%). I set caching to turn on at 100ms to help when the server starts getting busy. The circuit breaker will stop traffic if errors reach 15% to prevent problems from spreading. These settings protect the service without being too aggressive."

❌ BAD: "Cache at p95×1.2, CB at 2σ above baseline"

✅ GOOD: "Caching activates when responses take longer than 100ms (currently they're around 80ms). If more than 15% of requests fail, the system will pause automatically. This keeps things running smoothly even if traffic increases."

## Calculation Checklist (verify before outputting):

✓ Is cache_latency_ms ≥ p50 latency? (Requirement)
✓ Is circuit_breaker_error_rate ≥ 0.10? (Minimum safety threshold)
✓ Is load_shedding_rpm > queue_deferral_rpm? (Critical requirement)
✓ Is rate_limit_customer_rpm ≥ 5? (Minimum per user)
✓ Is confidence level correct for data volume? (low/medium/high)
✓ Is reasoning in plain language without jargon? (Required)
✓ Is reasoning 50-1000 characters? (Validation requirement)

Now calculate the optimal thresholds based on the metrics above."""
        
        result = await structured_llm.ainvoke(prompt)
        logger.info(f"✅ LLM threshold analysis for {service_name}{endpoint}: confidence={result.confidence}")
        print(f"result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ LLM threshold analysis failed for {service_name}{endpoint}: {e}")
        return None


async def analyze_service_patterns(
    service_name: str,
    metrics: dict
) -> Optional[PatternAnalysis]:
    """
    Use LLM to detect patterns and anomalies in service behavior.
    
    Returns a validated PatternAnalysis Pydantic model.
    """
    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(PatternAnalysis)
        
        prompt = f"""You are an expert SRE specializing in API monitoring, anomaly detection, and capacity planning. Analyze the provided service metrics to identify patterns, detect anomalies, and assess overall service health.

## Service Information
- Service Name: {service_name}
- Analysis Period: Current snapshot (last 5 minutes)
- Data Volume: {metrics.get('count', 0)} requests

## Performance Metrics

### Request Volume
- Total requests: {metrics.get('count', 0)}
- Requests per minute: {metrics.get('requests_per_minute', 0):.1f} RPM

### Latency Profile
- Average latency: {metrics.get('avg_latency', 0):.1f}ms
- p50 (median): {metrics.get('p50', 0):.1f}ms  
- p95 latency: {metrics.get('p95', 0):.1f}ms
- p99 latency: {metrics.get('p99', 0):.1f}ms
- Latency spread ratio (p99/p50): {metrics.get('p99', 0) / max(metrics.get('p50', 1), 1):.1f}x

### Reliability
- Error rate: {metrics.get('error_rate', 0) * 100:.2f}%

## Your Analysis Task

Identify patterns and anomalies in the data. Focus on what matters - skip obvious or trivial observations.

### Pattern Detection (Max 5 patterns)

For each pattern you identify, provide:

**pattern_type** - Choose exactly ONE:
- "traffic_volume": Patterns in request volume (low/high traffic, steady/bursty)
- "latency_trend": Patterns in response times (consistent/variable performance)
- "error_pattern": Patterns in failures (low/high errors, intermittent issues)
- "capacity_trend": Patterns suggesting capacity limits (approaching overload)
- "temporal_pattern": Time-based patterns (peak hours, daily cycles)

**description** (20-500 chars, plain language):
What pattern did you observe? Include specific numbers and context.

Examples:
- ✅ "Very low traffic at only 5 requests per minute, suggesting this is either off-peak hours or a development environment"
- ✅ "Response times are extremely consistent with p50, p95, and p99 all within 10ms of each other, showing stable performance"
- ❌ "Low traffic" (too vague)
- ❌ "Latency percentiles indicate bimodal distribution with tail latency variance" (too technical)

**recommendation** (20-500 chars, actionable):
What should someone do about this pattern?

Examples:
- ✅ "Monitor if traffic increases during business hours - if it stays this low, consider scaling down to save costs"
- ✅ "Current performance is excellent. Document these latency numbers as a baseline for future comparisons"
- ❌ "Continue monitoring" (too generic)
- ❌ "Implement horizontal autoscaling" (too technical without context)

**confidence**: "low" | "medium" | "high"
- low: Weak signal, might not be a real pattern
- medium: Likely real pattern
- high: Definitely a real pattern

### Anomaly Detection (Max 3 anomalies)

ONLY report genuine anomalies - unusual deviations from expected behavior. Not every metric is an anomaly.

For each anomaly:

**description** (30-500 chars, plain language):
What is unusual? Compare to normal expectations with specific numbers.

Examples:
- ✅ "Error rate is 2.3% when it should typically be below 0.5% - this is 4-5x higher than normal and could indicate a database connection issue"
- ✅ "Some requests are taking 8x longer than others (p99 is 400ms but p50 is 50ms), suggesting occasional backend slowdowns"
- ❌ "High error rate" (not specific enough)
- ❌ "Error rate exceeds SLA threshold" (too technical)

**severity**: "low" | "medium" | "high" | "critical"
- low: Worth noting, investigate when convenient
- medium: Should investigate within hours
- high: Investigate now
- critical: Urgent action required immediately

**suggested_cause** (10-300 chars):
Best guess at root cause, or "Unknown - needs investigation" if unclear

Examples:
- ✅ "Possible database connection timeout or downstream service degradation"
- ✅ "Unknown - needs investigation"
- ❌ "Database" (too vague)

### Health Summary (100-500 chars)

Write 2-4 sentences covering:
1. Overall state: Is the service healthy, degraded, or critical?
2. Key observation: What's the most important thing to know?
3. Recommendation: What action, if any, should be taken?

Use plain language suitable for sharing with management or non-technical stakeholders.

Examples:

✅ GOOD:
"The service is performing well with fast, consistent response times (most requests finish in under 60ms). However, we're seeing 4x more errors than usual at 2.3%, which needs investigation - it could be a connection issue with a database or another service. The low traffic volume suggests this is off-peak hours, so now is a good time to investigate without impacting many users."

❌ BAD:
"Service health nominal. Latency percentiles within acceptable bounds. Error rate elevated. Recommend investigation."

❌ BAD:
"p95 latency at 58ms indicates good performance characteristics, though error rate of 2.3% suggests potential downstream dependency issues requiring immediate investigation to prevent SLA violations."

## Pattern Recognition Heuristics

Use these guidelines to identify patterns:

**Traffic Volume Patterns:**
- < 10 RPM: Low traffic (off-peak or dev environment)
- 10-50 RPM: Light load
- 50-100 RPM: Moderate traffic
- > 100 RPM: High traffic

**Latency Consistency:**
- p99/p50 < 2.0: Excellent consistency
- p99/p50 2.0-5.0: Normal variation
- p99/p50 > 5.0: High variance, investigate

**Error Rate Assessment:**
- < 0.1%: Excellent
- 0.1-1%: Normal, monitor
- 1-5%: Degraded, investigate
- > 5%: Critical, immediate action

## Validation Requirements

Before outputting, verify:
✓ patterns list has 0-5 items (max 5)
✓ anomalies list has 0-3 items (max 3)
✓ Each pattern has all required fields with correct types
✓ Each anomaly has all required fields with correct types
✓ summary is 100-500 characters
✓ All text is in plain, non-technical language
✓ Pattern types use exact allowed values
✓ Severity levels use exact allowed values
✓ Confidence levels use exact allowed values

Current data volume is {metrics.get('count', 0)} requests - consider this when setting confidence levels.

Now analyze the metrics and output your findings."""
        
        result = await structured_llm.ainvoke(prompt)
        logger.info(f"✅ LLM pattern analysis for {service_name}: {len(result.patterns)} patterns, {len(result.anomalies)} anomalies")
        return result
        
    except Exception as e:
        logger.error(f"❌ LLM pattern analysis failed for {service_name}: {e}")
        return None