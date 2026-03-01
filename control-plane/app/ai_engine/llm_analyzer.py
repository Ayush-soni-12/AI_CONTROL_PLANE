"""
LLM Analyzer — Enhanced with Feedback Loop & Trend Context

IMPROVEMENTS over v1:
1. Feedback loop: Gemini now sees recent decisions + whether they helped
2. Trend context: Pass trend direction (rising/falling/stable) to Gemini
3. Smarter threshold prompts: includes recent decision history in analysis
4. Pattern analysis enhanced: cross-references recent decisions with anomalies
"""

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
        temperature=0.1,
        google_api_key=api_key,
    )


def _format_decision_history(recent_decisions: list) -> str:
    """
    Format recent decision log entries into a readable history string for Gemini.
    This is the KEY improvement: Gemini can now see what decisions were made
    and adjust thresholds to avoid repeating false positives or missing real issues.
    """
    if not recent_decisions:
        return "No recent decision history available."

    lines = []
    for i, entry in enumerate(recent_decisions[:5], 1):
        ts = entry.get('timestamp', 'unknown')[:16].replace('T', ' ')
        m = entry.get('metrics_at_decision', {})
        d = entry.get('decision', {})
        r = entry.get('reasoning', '')

        active_flags = [k for k, v in d.items() if v]
        flags_str = ', '.join(active_flags) if active_flags else 'none (healthy)'

        lines.append(
            f"{i}. [{ts}] "
            f"Latency: {m.get('avg_latency', 0):.0f}ms | "
            f"Errors: {m.get('error_rate', 0)*100:.1f}% | "
            f"RPM: {m.get('rpm', 0):.1f} | "
            f"Actions taken: {flags_str} | "
            f"Reason: {r[:80]}{'...' if len(r) > 80 else ''}"
        )

    return "\n".join(lines)


async def analyze_service_thresholds(
    service_name: str,
    endpoint: str,
    metrics: dict,
    current_thresholds: dict,
    recent_decisions: list = None,   # NEW: decision history from Redis
    trends: dict = None,             # NEW: latency/error/rpm trend directions
) -> Optional[ThresholdRecommendation]:
    """
    Use LLM to analyze metrics and recommend optimal thresholds.

    New in v2:
    - Includes recent decision history so Gemini can evaluate past choices
    - Includes trend directions (rising/falling/stable) for each metric
    - Gemini can now recommend tighter or looser thresholds based on outcomes
    """
    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(ThresholdRecommendation)

        # Format decision history for the prompt
        decision_history_str = _format_decision_history(recent_decisions or [])

        # Format trend data
        trends = trends or {}
        latency_trend = trends.get('latency_trend', 'stable')
        error_trend = trends.get('error_trend', 'stable')
        rpm_trend = trends.get('rpm_trend', 'stable')

        prompt = f"""You are an AI assistant that helps app owners protect their app's performance. You need to decide the best settings (called "thresholds") that tell the system when to take protective actions.

Write everything in simple, everyday English that a business owner or developer can understand — NOT tech jargon.

## STRICT LANGUAGE RULES for the "reasoning" field:

❌ NEVER use these words (too technical):
latency, p50, p95, p99, percentile, throughput, RPM, SLA, circuit breaker, load shedding,
queue deferral, bottleneck, autoscaling, cascade, degraded, heuristic, upstream, downstream,
dependency, anomaly, infrastructure, bimodal

✅ ALWAYS use these simple replacements:
- "latency" → "response time" or "how fast the app replies"
- "p95 latency" → "how long most requests take"
- "circuit breaker" → "emergency stop (prevents more damage when failures spike)"
- "load shedding" → "dropping extra requests when the app is overloaded"
- "queue deferral" → "putting requests in a waiting line when things get busy"
- "RPM" → "requests per minute (how busy the app is)"
- "bottleneck" → "slowdown"
- "degraded" → "running slower than usual"

## Current App Performance
- Service: {service_name} | Endpoint: {endpoint}
- Requests in the last hour: {metrics.get('count', 0)}
- How busy right now: {metrics.get('requests_per_minute', 0):.1f} requests per minute
- Average response time: {metrics.get('avg_latency', 0):.1f}ms
- Most requests finish in: {metrics.get('p50', 0):.1f}ms
- Slower requests take up to: {metrics.get('p95', 0):.1f}ms
- Slowest requests take: {metrics.get('p99', 0):.1f}ms
- Failure rate: {metrics.get('error_rate', 0) * 100:.2f}%

## Trends (compared to yesterday's average)
- Response time trend: **{latency_trend}** {"⚠️ Getting slower" if latency_trend == 'rising' else "✅ Getting faster" if latency_trend == 'falling' else "✅ Stable"}
- Failure trend: **{error_trend}** {"⚠️ More failures than usual" if error_trend == 'rising' else "✅ Fewer failures" if error_trend == 'falling' else "✅ Normal"}
- Traffic trend: **{rpm_trend}** {"⚠️ Getting busier" if rpm_trend == 'rising' else "✅ Quieter than usual" if rpm_trend == 'falling' else "✅ Normal traffic"}

Trend guidance:
- If response time is RISING → set the caching threshold lower so the system protects itself earlier
- If failures are RISING → set the emergency stop threshold lower to act sooner
- If traffic is RISING → set the "put requests in line" and "drop extra requests" thresholds lower to be ready

## What the system did recently
{decision_history_str}

Use this history to tune the settings:
- If caching was turned on a lot but response time stayed slow → the threshold was set too high, lower it
- If the emergency stop fired but things recovered fast → it may be a bit too sensitive
- If NO actions were taken but the app was slow → the thresholds were too high, they need to come down
- If actions fired when the app was healthy → thresholds are too low, raise them

## Current Settings
- Turn on caching when response time exceeds: {current_thresholds.get('cache_latency_ms', 500)}ms
- Emergency stop when failure rate exceeds: {current_thresholds.get('circuit_breaker_error_rate', 0.3) * 100:.1f}%
- Put requests in line when busier than: {current_thresholds.get('queue_deferral_rpm', 80)} requests/min
- Drop extra requests when busier than: {current_thresholds.get('load_shedding_rpm', 150)} requests/min
- Limit one user to max: {current_thresholds.get('rate_limit_customer_rpm', 15)} requests/min

## How to calculate the new settings (follow these rules exactly)

### cache_latency_ms (integer, 10–5000)
When response time exceeds this, caching turns on to speed things up.
- Base: take the "slower requests" time × 1.20
- If response time is RISING: use × 1.10 instead (act sooner)
- If response time is FALLING: use × 1.30 (wait a bit longer)
- Must be at least as high as the "most requests" time
- Round to nearest 10ms

### circuit_breaker_error_rate (decimal, 0.01–1.0)
When failures exceed this %, the emergency stop kicks in.
- If current failure rate is under 2%: use 0.15 (15%) as the trigger
- If failures are RISING: use current rate × 1.5 (trigger earlier)
- If failures are FALLING: use current rate × 2.5 (give more room)
- Never go below 0.10 (10%)

### queue_deferral_rpm (integer, 10–1000)
When the app gets this busy, lower-priority requests go into a waiting line.
- If traffic is RISING: set to current requests/min × 1.2
- If traffic is STABLE: set to current requests/min × 1.5
- If traffic is FALLING: set to current requests/min × 2.0

### load_shedding_rpm (integer, 20–5000)
When the app gets THIS busy, extra low-priority requests are dropped.
- MUST be higher than queue_deferral_rpm
- Set to queue_deferral_rpm × 1.40 at minimum

### rate_limit_customer_rpm (integer, 5–500)
Max requests per minute from one single user/IP address.
- If total requests/min < 50: allow 20–30 per user
- Otherwise: (total requests/min ÷ estimated number of users) × 3–5
- Never below 5

## Confidence Level
Based on how much data we have:
- Under 50 requests → "low"
- 50 to 500 requests → "medium"  
- Over 500 requests → "high"
Current: {metrics.get('count', 0)} requests → confidence should be "{"low" if metrics.get('count', 0) < 50 else "medium" if metrics.get('count', 0) < 500 else "high"}"

## Output Fields Required
1. cache_latency_ms: integer 10–5000
2. circuit_breaker_error_rate: decimal 0.01–1.0
3. queue_deferral_rpm: integer 10–1000
4. load_shedding_rpm: integer (MUST be greater than queue_deferral_rpm)
5. rate_limit_customer_rpm: integer 5–500
6. reasoning: 50–1000 characters, plain everyday English (NO tech jargon)
7. confidence: "low" | "medium" | "high"

## Writing the reasoning field — CRITICAL

Write 2-3 short sentences that a non-technical person can read and understand.

Structure:
1. What the app is doing right now (use the real numbers)
2. Why you picked these settings (mention trends or recent actions if relevant)
3. What these settings will do for the app

❌ BAD: "Thresholds calibrated based on p95 latency with trend-adjusted circuit breaker hysteresis for cascade failure prevention."
✅ GOOD: "Your app is running at {metrics.get('avg_latency', 0):.0f}ms average and handling {metrics.get('requests_per_minute', 0):.0f} requests per minute with very few failures. I set caching to turn on at {'{cache_latency_ms}'}ms because response times have been slowly rising. These settings will help the app stay fast without overreacting to small temporary slowdowns."

❌ BAD: "RPM-based queue deferral threshold set at 70% of observed peak to avoid SLA violations."
✅ GOOD: "The app is fairly quiet right now, so I set the waiting-line trigger at {'{queue_deferral_rpm}'} requests per minute — well above the current {metrics.get('requests_per_minute', 0):.0f}. This gives plenty of room for normal traffic increases before any protective measures kick in."

## Validation before you output
✓ Is cache_latency_ms at least as high as the "most requests" response time ({metrics.get('p50', 0):.0f}ms)?
✓ Is circuit_breaker_error_rate at least 0.10?
✓ Is load_shedding_rpm greater than queue_deferral_rpm?
✓ Is rate_limit_customer_rpm at least 5?
✓ Does reasoning avoid ALL banned jargon words?
✓ Is reasoning 50–1000 characters?

Now calculate the best settings and write the reasoning in simple English."""

        result = await structured_llm.ainvoke(prompt)
        logger.info(
            f"✅ LLM threshold analysis for {service_name}{endpoint}: "
            f"confidence={result.confidence} | "
            f"trends: latency={latency_trend} errors={error_trend} rpm={rpm_trend}"
        )
        print(f"result: {result}")
        return result

    except Exception as e:
        logger.error(f"❌ LLM threshold analysis failed for {service_name}{endpoint}: {e}")
        return None


async def analyze_service_patterns(
    service_name: str,
    metrics: dict,
    recent_decisions: list = None,   # NEW: pass decision history
    trends: dict = None,             # NEW: pass trend directions
) -> Optional[PatternAnalysis]:
    """
    Use LLM to detect patterns and anomalies.

    New in v2:
    - Cross-references recent decisions with current metrics
    - Trend directions passed for better pattern classification
    - Anomaly detection considers whether issues are new or recurring
    """
    try:
        llm = _get_llm()
        structured_llm = llm.with_structured_output(PatternAnalysis)

        decision_history_str = _format_decision_history(recent_decisions or [])
        trends = trends or {}
        latency_trend = trends.get('latency_trend', 'stable')
        error_trend = trends.get('error_trend', 'stable')
        rpm_trend = trends.get('rpm_trend', 'stable')

        prompt = f"""You are analyzing an app or website's performance for a business owner or developer who is NOT a technical expert. Write everything like you are explaining it to a friend who has never worked in software.

## STRICT LANGUAGE RULES — You MUST follow these:

❌ NEVER use these words or phrases (they are too technical):
bottleneck, latency, p50, p95, p99, percentile, throughput, cascade, degraded, SLA, SLO,
circuit breaker, load shedding, queue deferral, RPM, tail latency, bimodal, heuristic,
upstream, downstream, dependency, anomaly, infrastructure, autoscaling, capacity

✅ ALWAYS use simple replacements instead:
- "latency" → "response time" or "how fast the app replies"
- "p50/p95/p99" → "most requests", "almost all requests", "the slowest requests"  
- "error rate" → "how often requests fail" or "failure rate"
- "RPM / requests per minute" → "visitors per minute" or "requests per minute (how busy it is)"
- "circuit breaker triggered" → "the system temporarily stopped accepting requests to protect itself"
- "load shedding" → "the system started dropping low-priority requests because it was too busy"
- "queue deferral" → "requests were put in a waiting line"
- "bottleneck" → "slowdown" or "something slowing things down"
- "upstream/downstream dependency" → "another service this app relies on"
- "anomaly" → "something unusual" or "unexpected behavior"
- "degraded" → "running slower than usual" or "not performing well"

## Service Data
- Service: {service_name}
- Last hour: {metrics.get('count', 0)} total requests
- Requests per minute: {metrics.get('requests_per_minute', 0):.1f}
- Average response time: {metrics.get('avg_latency', 0):.1f}ms (milliseconds)
- Most requests finish in: {metrics.get('p50', 0):.1f}ms
- Slower requests take: {metrics.get('p95', 0):.1f}ms
- Slowest requests take: {metrics.get('p99', 0):.1f}ms
- Failure rate: {metrics.get('error_rate', 0) * 100:.2f}%

## Trends (compared to yesterday)
- Response time trend: **{latency_trend}** {"⚠️ Getting slower" if latency_trend == 'rising' else "✅ Getting faster" if latency_trend == 'falling' else "✅ Stable"}
- Failures trend: **{error_trend}** {"⚠️ More failures than usual" if error_trend == 'rising' else "✅ Fewer failures" if error_trend == 'falling' else "✅ Normal"}
- Traffic trend: **{rpm_trend}** {"⚠️ More visitors than usual" if rpm_trend == 'rising' else "✅ Less traffic" if rpm_trend == 'falling' else "✅ Normal traffic"}

## What the system did recently
{decision_history_str}

## What to look for in patterns:
- If the system kept turning on caching → the app has been slow repeatedly
- If the system kept stopping requests → failures have been happening often
- If requests were put in a waiting line → the app has been very busy
- If nothing was triggered → everything has been running fine

## Your task

### Patterns (Max 5)
For each pattern:
- pattern_type: one of "traffic_volume", "latency_trend", "error_pattern", "capacity_trend", "temporal_pattern"
- description: 20-500 chars. Explain what you see in plain English. Use numbers but explain what they mean. No tech jargon.
- recommendation: 20-500 chars. Tell the person exactly what to do next in plain English.
- confidence: "low" | "medium" | "high"

❌ BAD description: "Elevated p95 tail latency suggests upstream dependency bottleneck"
✅ GOOD description: "The app is handling {metrics.get('requests_per_minute', 0):.0f} requests per minute and most complete quickly, but a small number of requests are taking much longer than average — about {metrics.get('p99', 0):.0f}ms compared to the typical {metrics.get('p50', 0):.0f}ms. This means some users are waiting longer than others."

❌ BAD recommendation: "Implement horizontal autoscaling and investigate downstream service SLAs"
✅ GOOD recommendation: "Check if there's a database query or external service call that's slow for certain requests. You may want to add caching for the data those slow requests are fetching."

### Unusual things noticed (Max 3)
Only report things that are genuinely unexpected or worth worrying about.
For each:
- description: 30-500 chars. Explain what is unusual and why it matters, using real numbers.
- severity: "low" | "medium" | "high" | "critical"
- suggested_cause: Plain English guess at what's causing it, or "Not sure — needs investigation"

❌ BAD: "Error rate exceeds acceptable threshold indicating potential service degradation"
✅ GOOD: "About {metrics.get('error_rate', 0)*100:.1f}% of requests are failing right now. That means roughly 1 in every {int(1/max(metrics.get('error_rate', 0.01), 0.01))} visitors is seeing an error. This is higher than the normal level and should be looked into."

### Overall health (100-500 chars)
Write 2-4 sentences that a business owner could read and immediately understand. Cover:
1. Is the app doing well or not?
2. What's the most important thing happening right now?
3. What should they do next (if anything)?

❌ BAD: "Service health nominal. Latency percentiles within bounds. Error rate elevated."
✅ GOOD: "Your app is running smoothly and responding quickly to most visitors. One thing to keep an eye on: the response time has been slowly increasing over the past hour. No action is needed right now, but if it keeps rising, you may want to check if a database or background job is slowing things down."

Now analyze the data and write your findings using ONLY simple, everyday language."""

        result = await structured_llm.ainvoke(prompt)
        logger.info(
            f"✅ LLM pattern analysis for {service_name}: "
            f"{len(result.patterns)} patterns, {len(result.anomalies)} anomalies"
        )
        return result

    except Exception as e:
        logger.error(f"❌ LLM pattern analysis failed for {service_name}: {e}")
        return None






async def analyze_incident_root_cause(
    service_name: str,
    endpoint: str,
    incident_title: str,
    peak_latency_ms: float,
    peak_error_rate: float,
    duration_secs: int,
    events: list,
) -> dict:
    """
    Use Gemini to analyze an incident's event timeline and explain:
    1. What most likely caused the problem
    2. The sequence of events in plain English
    3. What to check/fix to prevent it happening again

    Returns dict with: summary (str), confidence (str), steps (list)
    """
    try:
        llm = _get_llm()

        # Format the timeline events for the prompt
        if events:
            event_lines = []
            for e in events:
                ts = e.get("occurred_at", "")[:16].replace("T", " ")
                event_lines.append(
                    f"  [{ts}] {e.get('title', '')} — "
                    f"Response: {e.get('latency_ms', 0):.0f}ms | "
                    f"Failures: {e.get('error_rate', 0)*100:.1f}% | "
                    f"Traffic: {e.get('rpm', 0):.1f} req/min"
                )
            timeline_str = "\n".join(event_lines)
        else:
            timeline_str = "No detailed events recorded."

        mins = (duration_secs or 0) // 60
        secs = (duration_secs or 0) % 60
        duration_str = f"{mins} minutes and {secs} seconds" if mins else f"{secs} seconds"

        prompt = f"""You are analyzing a service incident and need to explain in plain, simple English what happened and why.

Write as if explaining to someone who is not a technical expert — a business owner or junior developer.

## STRICT RULES — Follow these exactly:
❌ NEVER use jargon: bottleneck, latency, p50/p95/p99, throughput, SLA, cascade,
   circuit breaker, queue deferral, load shedding, upstream/downstream, heuristic,
   anomaly, degraded, infrastructure

✅ ALWAYS use plain replacements:
- "latency" → "response time" or "how fast the app replies"
- "circuit breaker" → "emergency stop"
- "load shedding" → "dropping extra requests"
- "queue deferral" → "putting requests in a waiting line"
- "bottleneck" → "slowdown" or "something slowing things down"
- "error rate" → "failure rate" or "how often requests failed"

## What happened:
- Service: {service_name}{endpoint}
- Problem: {incident_title}
- Worst response time: {peak_latency_ms:.0f}ms
- Worst failure rate: {peak_error_rate*100:.1f}%
- How long it lasted: {duration_str}

## Timeline of events:
{timeline_str}

## Your task — Write a root cause analysis with these 3 sections:

### 1. What happened (2-3 sentences)
Tell the story of the incident in the order it happened. Use the real timestamps and numbers.
Example: "At 14:23, the app started responding slowly — taking 850ms instead of the usual 150ms. 
By 14:24, the system had automatically turned on caching to try to help. 
At 14:25, the failure rate reached 35% and the system activated its emergency stop to prevent further damage."

### 2. Most likely cause (2-3 sentences)
Based on the pattern of events, what probably caused this?
Be specific but use plain language. If you're not sure, say so honestly.
Example: "The most likely cause was a sudden increase in traffic that the database couldn't handle. 
When too many users requested data at the same time, the database queries slowed down, 
which caused requests to pile up and eventually fail."

### 3. What to check next (3-5 bullet points)
Specific, actionable things the developer should look at.
Each should be a complete sentence. Use plain language.
Example:
- Check if there was a database query running slowly around 14:23 — this is the most likely place to start
- Look at server resource usage (CPU, memory) around the time of the incident
- Check if any background jobs or scheduled tasks started running around that time
- Review whether traffic increased unusually compared to the same time yesterday

## Output format — Respond with ONLY valid JSON, no other text:
{{
  "summary": "2-3 sentence plain English explanation of what happened and the most likely cause",
  "what_happened": "The story of the incident in order",
  "likely_cause": "What probably caused it",
  "what_to_check": ["check 1", "check 2", "check 3"],
  "confidence": "low" | "medium" | "high"
}}

Confidence guide:
- "high": Clear pattern in the events that points to one cause
- "medium": Likely cause but could be a few different things
- "low": Hard to tell from the events alone, needs more investigation

Now analyze the incident and write your response in plain English."""

        response = await llm.ainvoke(prompt)
        content = response.content if hasattr(response, 'content') else str(response)

        # Parse JSON response
        import json, re
        # Strip any markdown code fences if present
        clean = re.sub(r'```(?:json)?\s*|\s*```', '', content).strip()
        result = json.loads(clean)

        logger.info(
            f"✅ Root cause analysis for {service_name}{endpoint}: "
            f"confidence={result.get('confidence', 'unknown')}"
        )
        return result

    except Exception as e:
        logger.error(f"❌ Root cause analysis failed for {service_name}{endpoint}: {e}")
        return {
            "summary": "Automatic analysis couldn't complete. Check the timeline events above for details.",
            "what_happened": "See timeline events above.",
            "likely_cause": "Unable to determine automatically.",
            "what_to_check": ["Review the timeline events manually", "Check server logs from the incident period"],
            "confidence": "low",
        }
