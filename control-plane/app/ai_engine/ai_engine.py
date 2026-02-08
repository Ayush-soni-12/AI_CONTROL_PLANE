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
            'send_alert': True  # Alert on potential DDoS
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
            'send_alert': True
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
        actions.append("alert")
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
        actions.append("alert")
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