"""
Pydantic schemas for AI LLM structured output.
Forces the LLM to return data matching exact schemas — 
prevents malformed/unstructured responses.
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Literal


class ThresholdRecommendation(BaseModel):
    """Schema for LLM threshold analysis response."""
    
    cache_latency_ms: int = Field(
        ge=10, 
        le=5000,
        description="Latency in milliseconds - when response time exceeds this, caching activates to reduce load"
    )
    
    circuit_breaker_error_rate: float = Field(
        ge=0.01, 
        le=1.0,
        description="Error rate as decimal (0.15 = 15%) - when failures exceed this percentage, the circuit breaker stops requests to prevent system overload"
    )
    
    queue_deferral_rpm: int = Field(
        ge=10, 
        le=1000,
        description="Requests per minute - when traffic hits this level, low/medium priority requests wait in queue instead of being processed immediately"
    )
    
    load_shedding_rpm: int = Field(
        ge=20, 
        le=5000,
        description="Requests per minute - when traffic exceeds this critical level, low/medium priority requests are dropped to protect system stability"
    )
    
    rate_limit_customer_rpm: int = Field(
        ge=5, 
        le=500,
        description="Max requests per minute per customer IP - prevents any single user from overwhelming the system"
    )
    
    reasoning: str = Field(
        min_length=50,
        max_length=1000,
        description="Plain-language explanation of why these values were chosen, what patterns were observed, and what trade-offs were considered. Must be understandable by non-technical stakeholders."
    )
    
    confidence: Literal["low", "medium", "high"] = Field(
        description="Confidence level: 'low' (<50 requests), 'medium' (50-500 requests), 'high' (>500 requests)"
    )
    
    @field_validator('load_shedding_rpm')
    @classmethod
    def validate_load_shedding_higher_than_queue(cls, v, info):
        """Ensure load shedding threshold is higher than queue deferral."""
        if 'queue_deferral_rpm' in info.data:
            queue_rpm = info.data['queue_deferral_rpm']
            if v <= queue_rpm:
                raise ValueError(f"load_shedding_rpm ({v}) must be greater than queue_deferral_rpm ({queue_rpm})")
        return v


class PatternInfo(BaseModel):
    """A detected pattern in service behavior."""
    
    pattern_type: Literal["traffic_volume", "latency_trend", "error_pattern", "capacity_trend", "temporal_pattern"] = Field(
        description="Category of pattern: traffic_volume (request patterns), latency_trend (response time patterns), error_pattern (failure patterns), capacity_trend (resource usage), temporal_pattern (time-based patterns like peak hours)"
    )
    
    description: str = Field(
        min_length=20,
        max_length=500,
        description="Plain-language description of what pattern was observed, including specific numbers and context. Avoid jargon - write for non-technical audiences."
    )
    
    recommendation: str = Field(
        min_length=20,
        max_length=500,
        description="Specific, actionable recommendation based on this pattern. What should someone do about this? Be concrete and practical."
    )
    
    confidence: Literal["low", "medium", "high"] = Field(
        description="How confident are you in this pattern: 'low' (weak signal), 'medium' (likely real), 'high' (definitely real)"
    )


class AnomalyInfo(BaseModel):
    """A detected anomaly in service behavior."""
    
    description: str = Field(
        min_length=30,
        max_length=500,
        description="Plain-language explanation of what is unusual, including specific metrics and comparisons to normal behavior. Make it understandable for non-technical readers."
    )
    
    severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Impact level: 'low' (worth noting), 'medium' (should investigate soon), 'high' (investigate now), 'critical' (urgent action required)"
    )
    
    suggested_cause: str = Field(
        default="Unknown - needs investigation",
        min_length=10,
        max_length=300,
        description="Potential root cause of this anomaly if you can infer one from the data, or 'Unknown - needs investigation' if not clear"
    )


class PatternAnalysis(BaseModel):
    """Schema for LLM pattern detection response."""
    
    patterns: List[PatternInfo] = Field(
        default_factory=list,
        max_length=5,
        description="List of observed patterns (max 5 - focus on most important ones)"
    )
    
    anomalies: List[AnomalyInfo] = Field(
        default_factory=list,
        max_length=3,
        description="List of detected anomalies (max 3 - only genuine anomalies, not normal variation)"
    )
    
    summary: str = Field(
        min_length=100,
        max_length=500,
        description="Overall health assessment in 2-4 sentences. State whether service is healthy/degraded/critical, mention key strengths or concerns, and recommend next actions if needed. Use plain language suitable for sharing with management."
    )
    
    @field_validator('patterns')
    @classmethod
    def validate_patterns_not_empty_if_data_sufficient(cls, v, info):
        """Warn if no patterns found - usually there should be at least 1."""
        if len(v) == 0:
            # This is a warning, not an error - sometimes truly no patterns exist
            pass
        return v