from app.ai_engine.threshold_manager import get_all_thresholds, DEFAULTS
from langgraph.graph import StateGraph, END
from typing import TypedDict



class DecisionState(TypedDict):
    service_name: str
    endpoint: str
    avg_latency: float
    error_rate: float
    requests_per_minute: float  # Global traffic (all customers)
    customer_requests_per_minute: float  # This customer only
    priority: str  # critical, high, medium, low
    analysis: str
    decision: dict
    reasoning: str



def analyze_node(state: DecisionState) -> DecisionState:
    """Analyze metrics and identify issues"""
    
    issues = []
    
    if state['avg_latency'] >= 500:
        issues.append(f"High latency: {state['avg_latency']:.0f}ms")
    
    if state['error_rate'] >= 0.15:
        issues.append(f"High error rate: {state['error_rate']*100:.1f}%")
    
    # Global traffic monitoring
    if state.get('requests_per_minute', 0) >= 80:
        issues.append(f"High traffic: {state['requests_per_minute']:.1f} req/min")
    
    # Per-customer traffic monitoring
    if state.get('customer_requests_per_minute', 0) > 15:
        issues.append(f"Customer abuse: {state['customer_requests_per_minute']:.1f} req/min from single IP")
    
    state['analysis'] = ", ".join(issues) if issues else "No issues"
    return state

def decide_node(state: DecisionState) -> DecisionState:
    """
    Make decision based on two-tier approach:
    
    TIER 1: Per-customer rate limiting (individual abuse protection)
    TIER 2: Global capacity management (system protection)
    """
    
    actions = []
    priority = state.get('priority', 'medium')
    
    # ===== TIER 1: PER-CUSTOMER RATE LIMITING =====
    # Check individual customer traffic FIRST (but with high threshold)
    # Purpose: Block truly malicious single-IP attacks (DDoS, scraping bots)
    # Threshold: 200 req/min allows normal users to never hit this, while
    #            global limits (80-120) trigger first for overall system protection
    customer_rpm = state.get('customer_requests_per_minute', 0)
    
    if customer_rpm > 15:
        # This specific customer is abusing the system (likely a bot/DDoS)
        state['reasoning'] = (
            f"Per-Customer Rate Limit: This IP/session is making {customer_rpm:.1f} requests/minute "
            f"(limit: 15). Request blocked to prevent abuse."
        )
        state['decision'] = {
            'cache_enabled': False,
            'circuit_breaker': False,
            'rate_limit_customer': True,  # NEW: Block this customer only
            'queue_deferral': False,
            'load_shedding': False,
            'send_alert': False  # Alert on potential DDoS
        }
        return state
    
    # ===== TIER 2: GLOBAL CAPACITY MANAGEMENT =====
    # Check total system traffic (all customers combined)
    total_rpm = state.get('requests_per_minute', 0)
    
    # Critical priority NEVER gets queued or shed
    if priority == 'critical':
        # Continue to existing caching/circuit breaker logic below
        pass
    
    # Extreme overload (>150 req/min): Shed medium + low priority
    elif total_rpm > 150 and priority in ['low', 'medium']:
        actions.append("load_shedding")
        state['reasoning'] = (
            f"Load Shedding: Extreme traffic overload ({total_rpm:.1f} req/min). "
            f"Dropping {priority} priority requests to protect critical operations."
        )
        state['decision'] = {
            'cache_enabled': True,  # Cache what we can
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,  # NEW: Drop this request
            'send_alert': False
        }
        return state
    
    # High overload (>120 req/min): Shed low priority only
    elif total_rpm > 120 and priority == 'low':
        actions.append("load_shedding")
        state['reasoning'] = (
            f"Load Shedding: High traffic ({total_rpm:.1f} req/min). "
            f"Dropping low priority requests to maintain service quality."
        )
        state['decision'] = {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,  # NEW: Drop this request
            'send_alert': False
        }
        return state
    
    # Moderate load (80-120 req/min): Queue low/medium priority
    elif 80 < total_rpm <= 120 and priority in ['low', 'medium']:
        actions.append("queue_deferral")
        state['reasoning'] = (
            f"Queue Deferral: Moderate traffic ({total_rpm:.1f} req/min). "
            f"Queueing {priority} priority requests for later processing."
        )
        state['decision'] = {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': True,  # NEW: Queue this request
            'load_shedding': False,
            'send_alert': False
        }
        return state
    
    # ===== EXISTING LOGIC: Caching & Circuit Breaker =====
    
    # Rule 1: Critical Failure (High Errors)
    if state['error_rate'] >= 0.3:
        actions.append("circuit_breaker")
        actions.append("alert")
        state['reasoning'] = (
            f"CRITICAL: Error rate is extremely high ({state['error_rate']*100:.1f}%). "
            "Circuit breaker activated to prevent cascading failures. Immediate attention required."
        )

    # Rule 2: High Latency with Errors
    elif state['error_rate'] >= 0.15 and state['avg_latency'] >= 400:
        actions.append("enable_cache")
        # actions.append("alert")
        state['reasoning'] = (
            f"Performance Degradation: High latency ({state['avg_latency']:.0f}ms) accompanied by elevated error rate ({state['error_rate']*100:.1f}%). "
            "Caching enabled to reduce load. Team alerted for investigation."
        )

    # Rule 3: High Latency Only
    elif state['avg_latency'] >= 500:
        actions.append("enable_cache")
        state['reasoning'] = (
            f"High Latency Detected: Average latency ({state['avg_latency']:.0f}ms) exceeds 500ms threshold. "
            "Caching enabled to improve response times."
        )
    
    # Rule 4: Moderate Errors (Warning)
    elif state['error_rate'] >= 0.15:
        # actions.append("alert")
        state['reasoning'] = (
            f"Elevated Error Rate: Error rate ({state['error_rate']*100:.1f}%) is above normal limits. "
            "Monitoring continued, alert sent to operations team."
        )

    # Rule 5: Healthy State
    else:
        state['reasoning'] = (
            f"Healthy: Service is performing within optimal parameters. "
            f"Latency: {state['avg_latency']:.0f}ms, Error Rate: {state['error_rate']*100:.1f}%, "
            f"Traffic: {total_rpm:.1f} req/min"
        )
    
    # Build decision
    state['decision'] = {
        'cache_enabled': 'enable_cache' in actions,
        'circuit_breaker': 'circuit_breaker' in actions,
        'rate_limit_customer': False,  # Already checked in TIER 1
        'queue_deferral': False,  # Already checked above
        'load_shedding': False,  # Already checked above
        'send_alert': 'alert' in actions
    }
    
    return state

def create_decision_graph():
    """Create LangGraph workflow"""
    
    workflow = StateGraph(DecisionState)
    
    # Add nodes
    workflow.add_node("analyze", analyze_node)
    workflow.add_node("decide", decide_node)
    
    # Define flow
    workflow.set_entry_point("analyze")
    workflow.add_edge("analyze", "decide")
    workflow.add_edge("decide", END)
    
    return workflow.compile()

# Create graph instance
decision_graph = create_decision_graph()

def make_ai_decision(
    service_name: str, 
    endpoint: str, 
    avg_latency: float, 
    error_rate: float,
    requests_per_minute: float = 0,  # Global traffic (all customers)
    customer_requests_per_minute: float = 0,  # This customer only
    priority: str = 'medium'  # critical, high, medium, low
) -> dict:
    """
    Main function to make AI decision with two-tier approach:
    1. Per-customer rate limiting (individual abuse)
    2. Global capacity management (queue/shed based on priority)
    """
    
    initial_state = {
        "service_name": service_name,
        "endpoint": endpoint,
        "avg_latency": avg_latency,
        "error_rate": error_rate,
        "requests_per_minute": requests_per_minute,  # Global
        "customer_requests_per_minute": customer_requests_per_minute,  # NEW
        "priority": priority,  # NEW
        "analysis": "",
        "decision": {},
        "reasoning": ""
    }
    
    # Run the graph
    result = decision_graph.invoke(initial_state)
    
    return {
        "cache_enabled": result['decision']['cache_enabled'],
        "circuit_breaker": result['decision'].get('circuit_breaker', False),
        "rate_limit_customer": result['decision'].get('rate_limit_customer', False),  # NEW
        "queue_deferral": result['decision'].get('queue_deferral', False),  # NEW
        "load_shedding": result['decision'].get('load_shedding', False),  # NEW
        "send_alert": result['decision'].get('send_alert', False),
        "reasoning": result['reasoning'],
        "analysis": result['analysis'],
        "ai_decision": result['reasoning'].split(':')[0]  # Extract action name
    }





async def get_ai_tuned_decision(
    service_name: str,
    endpoint: str,
    avg_latency: float,
    error_rate: float,
    requests_per_minute: float = 0,
    customer_requests_per_minute: float = 0,
    priority: str = 'medium',
    user_id: int = None,
    db = None
) -> dict:
    """
    Make decision using AI-tuned thresholds from the database.
    
    Loads thresholds set by the background AI analyzer (Gemini),
    then runs the same LangGraph decision logic but with dynamic values.
    Falls back to hardcoded defaults if no AI thresholds exist.
    """

    
    # Load AI-tuned thresholds
    if db and user_id:
        thresholds = await get_all_thresholds(db, user_id, service_name, endpoint)
    else:
        thresholds = {**DEFAULTS, 'source': 'default'}
    
    # Build state with AI-tuned thresholds
    is_ai_tuned = thresholds.get('source') == 'ai'
    cache_threshold = thresholds['cache_latency_ms']
    cb_threshold = thresholds['circuit_breaker_error_rate']
    queue_threshold = thresholds['queue_deferral_rpm']
    shed_threshold = thresholds['load_shedding_rpm']
    customer_limit = thresholds['rate_limit_customer_rpm']
    
    prefix = "🧠 AI-Tuned" if is_ai_tuned else "📏 Default"
    
    # ===== TIER 1: PER-CUSTOMER RATE LIMITING =====
    if customer_requests_per_minute > customer_limit:
        reasoning = (
            f"{prefix} Per-Customer Rate Limit: {customer_requests_per_minute:.1f} req/min "
            f"exceeds limit of {customer_limit} req/min."
        )
        return {
            'cache_enabled': False,
            'circuit_breaker': False,
            'rate_limit_customer': True,
            'queue_deferral': False,
            'load_shedding': False,
            'send_alert': False,
            'reasoning': reasoning,
            'analysis': f"Customer abuse: {customer_requests_per_minute:.1f} req/min",
            'ai_decision': 'Per-Customer Rate Limit',
            'thresholds_source': thresholds.get('source', 'default')
        }
    
    # ===== TIER 2: GLOBAL CAPACITY MANAGEMENT =====
    if priority == 'critical':
        pass  # Critical never gets queued or shed
    
    # Load shedding: extreme overload
    elif requests_per_minute > shed_threshold and priority in ['low', 'medium']:
        reasoning = (
            f"{prefix} Load Shedding: Traffic {requests_per_minute:.1f} req/min "
            f"exceeds threshold {shed_threshold} rpm. Dropping {priority} priority."
        )
        return {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,
            'send_alert': False,
            'reasoning': reasoning,
            'analysis': f"Extreme traffic: {requests_per_minute:.1f} rpm",
            'ai_decision': 'Load Shedding',
            'thresholds_source': thresholds.get('source', 'default')
        }
    
    # Load shedding: high overload (shed low only)
    elif requests_per_minute > shed_threshold * 0.8 and priority == 'low':
        reasoning = (
            f"{prefix} Load Shedding: Traffic {requests_per_minute:.1f} req/min "
            f"approaching threshold. Dropping low priority."
        )
        return {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': False,
            'load_shedding': True,
            'send_alert': False,
            'reasoning': reasoning,
            'analysis': f"High traffic: {requests_per_minute:.1f} rpm",
            'ai_decision': 'Load Shedding',
            'thresholds_source': thresholds.get('source', 'default')
        }
    
    # Queue deferral: moderate overload
    elif requests_per_minute > queue_threshold and priority in ['low', 'medium']:
        reasoning = (
            f"{prefix} Queue Deferral: Traffic {requests_per_minute:.1f} req/min "
            f"exceeds threshold {queue_threshold} rpm. Queueing {priority} priority."
        )
        return {
            'cache_enabled': True,
            'circuit_breaker': False,
            'rate_limit_customer': False,
            'queue_deferral': True,
            'load_shedding': False,
            'send_alert': False,
            'reasoning': reasoning,
            'analysis': f"Moderate traffic: {requests_per_minute:.1f} rpm",
            'ai_decision': 'Queue Deferral',
            'thresholds_source': thresholds.get('source', 'default')
        }
    
    # ===== TIER 3: CACHING & CIRCUIT BREAKER =====
    actions = []
    
    if error_rate >= cb_threshold:
        actions.append("circuit_breaker")
        actions.append("alert")
        reasoning = (
            f"{prefix} CRITICAL: Error rate {error_rate*100:.1f}% exceeds "
            f"threshold {cb_threshold*100:.0f}%. Circuit breaker activated."
        )
    elif error_rate >= cb_threshold * 0.5 and avg_latency >= cache_threshold * 0.8:
        actions.append("enable_cache")
        reasoning = (
            f"{prefix} Performance Degradation: Latency {avg_latency:.0f}ms + "
            f"error rate {error_rate*100:.1f}%. Caching enabled."
        )
    elif avg_latency >= cache_threshold:
        actions.append("enable_cache")
        reasoning = (
            f"{prefix} High Latency: {avg_latency:.0f}ms exceeds "
            f"threshold {cache_threshold}ms. Caching enabled."
        )
    elif error_rate >= cb_threshold * 0.5:
        reasoning = (
            f"{prefix} Elevated Error Rate: {error_rate*100:.1f}% "
            f"(threshold: {cb_threshold*100:.0f}%). Monitoring."
        )
    else:
        reasoning = (
            f"{prefix} Healthy: Latency {avg_latency:.0f}ms, "
            f"Errors {error_rate*100:.1f}%, Traffic {requests_per_minute:.1f} rpm"
        )
    
    return {
        'cache_enabled': 'enable_cache' in actions,
        'circuit_breaker': 'circuit_breaker' in actions,
        'rate_limit_customer': False,
        'queue_deferral': False,
        'load_shedding': False,
        'send_alert': 'alert' in actions,
        'reasoning': reasoning,
        'analysis': reasoning,
        'ai_decision': reasoning.split(':')[0] if ':' in reasoning else 'Healthy',
        'thresholds_source': thresholds.get('source', 'default')
    }