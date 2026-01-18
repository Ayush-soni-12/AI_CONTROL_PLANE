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
    
    if state['avg_latency'] > 500:
        issues.append(f"High latency: {state['avg_latency']:.0f}ms")
    
    if state['error_rate'] > 0.15:
        issues.append(f"High error rate: {state['error_rate']*100:.1f}%")
    
    state['analysis'] = ", ".join(issues) if issues else "No issues"
    return state

def decide_node(state: DecisionState) -> DecisionState:
    """Make decision based on analysis"""
    
    actions = []
    
    # Rule 1: High latency → enable cache
    if state['avg_latency'] > 500:
        actions.append("enable_cache")
        state['reasoning'] = f"Latency {state['avg_latency']:.0f}ms exceeds threshold - caching will help"
    
    # Rule 2: High error rate → circuit breaker (NOT rate limit!)
    elif state['error_rate'] > 0.3:
        actions.append("circuit_breaker")
        state['reasoning'] = f"Error rate {state['error_rate']*100:.1f}% is high - service may have issues"
    
    # Rule 3: Moderate errors + high latency → multiple issues
    elif state['error_rate'] > 0.15 and state['avg_latency'] > 400:
        actions.append("enable_cache")
        actions.append("alert")
        state['reasoning'] = "Both latency and errors elevated - enabling cache and alerting team"
    
    # Rule 4: Everything good
    else:
        state['reasoning'] = f"Performance acceptable (latency: {state['avg_latency']:.0f}ms, errors: {state['error_rate']*100:.1f}%)"
    
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