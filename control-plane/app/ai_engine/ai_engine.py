from langgraph.graph import StateGraph, END
from typing import TypedDict



class DecisionState(TypedDict):
    service_name: str
    endpoint: str
    avg_latency: float
    error_rate: float
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
    
    state['analysis'] = ", ".join(issues) if issues else "No issues"
    return state

def decide_node(state: DecisionState) -> DecisionState:
    """Make decision based on analysis"""
    
    actions = []
    
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
            f"Latency: {state['avg_latency']:.0f}ms, Error Rate: {state['error_rate']*100:.1f}%"
        )
    
    # Build decision
    state['decision'] = {
        'cache_enabled': 'enable_cache' in actions,
        'circuit_breaker': 'circuit_breaker' in actions,
        'alert': 'alert' in actions
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

def make_ai_decision(service_name: str, endpoint: str, 
                     avg_latency: float, error_rate: float) -> dict:
    """Main function to make AI decision"""
    
    initial_state = {
        "service_name": service_name,
        "endpoint": endpoint,
        "avg_latency": avg_latency,
        "error_rate": error_rate,
        "analysis": "",
        "decision": {},
        "reasoning": ""
    }
    
    # Run the graph
    result = decision_graph.invoke(initial_state)
    
    return {
        "cache_enabled": result['decision']['cache_enabled'],
        "circuit_breaker": result['decision'].get('circuit_breaker', False),
        "alert": result['decision'].get('alert', False),
        "reasoning": result['reasoning'],
        "analysis": result['analysis']
    }