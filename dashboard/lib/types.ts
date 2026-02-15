export interface Signal {
  id?: number;
  tenant_id?: string;
  service_name: string;
  endpoint: string;
  latency_ms: number;
  status: 'success' | 'error';
  timestamp: string;
}

export interface Config {
  service_name: string;
  endpoint: string;
  tenant_id?: string;
  cache_enabled: boolean;
  circuit_breaker: boolean;
  reason: string;
}

export interface Service {
  name: string;
  endpoints: Endpoint[];
  total_signals: number;
  avg_latency: number;
  error_rate: number;
  last_signal: string;
  status: 'healthy' | 'degraded' | 'down';
}

export interface ThresholdData {
  cache_latency_ms: number;
  circuit_breaker_error_rate: number;
  queue_deferral_rpm: number;
  load_shedding_rpm: number;
  rate_limit_customer_rpm: number;
  source: 'ai' | 'default';
}

export interface Endpoint {
  path: string;
  avg_latency: number;
  error_rate: number;
  signal_count: number;
  cache_enabled: boolean;
  circuit_breaker: boolean;
  rate_limit_enabled?: boolean;
  queue_deferral?: boolean;
  load_shedding?: boolean;
  tenant_id?: string;
  reasoning: string;
  thresholds?: ThresholdData;
}

export interface EndpointDetail {
  service_name: string;
  endpoint: string;
  avg_latency: number;
  error_rate: number;
  total_signals: number;
  history: Array<{
    timestamp: string;
    latency_ms: number;
    status: 'success' | 'error';
  }>;
  suggestions: string[];
  cache_enabled: boolean;
  circuit_breaker: boolean;
  rate_limit_enabled?: boolean;
  reasoning: string;
  thresholds?: ThresholdData;
}

export interface ServicesResponse {
  services: Service[];
  overall: {
    total_signals: number;
    avg_latency: number;
    error_rate: number;
    active_services: number;
  };
}

export interface Decision {
  service_name: string;
  endpoint: string;
  metrics: {
    avg_latency: number;
    error_rate: number;
    total_signals: number;
  };
  analysis: string;
  reasoning: string;
  actions: {
    cache_enabled: boolean;
    circuit_breaker: boolean;
  };
  timestamp?: string;
}

// Authentication Types
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface ApiKeyData {
  id: number;
  key: string;
  name: string | null;
  created_at: string;
  last_used: string | null;
  is_active: boolean;
}

export interface ApiKeyGenerateResponse {
  api_key: ApiKeyData;
  message: string;
}

export interface ApiKeyCreateRequest {
  name?: string;
}


export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthError {
  detail: string;
}

// AI Insights Types
export interface AIInsight {
  id: number;
  service_name: string;
  insight_type: 'pattern' | 'anomaly' | 'recommendation';
  description: string;
  confidence: number | null;
  created_at: string;
}

export interface AIInsightsResponse {
  insights: AIInsight[];
  total: number;
}

export interface AIThreshold {
  service_name: string;
  endpoint: string;
  cache_latency_ms: number;
  circuit_breaker_error_rate: number;
  queue_deferral_rpm: number;
  load_shedding_rpm: number;
  rate_limit_customer_rpm: number;
  confidence: number;
  reasoning: string;
  last_updated: string;
}

export interface AIThresholdsResponse {
  thresholds: AIThreshold[];
  total: number;
}