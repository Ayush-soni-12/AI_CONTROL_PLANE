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
  totalSignals: number;
  avgLatency: number;
  errorRate: number;
  lastSignal: string;
  status: 'healthy' | 'degraded' | 'down';
}

export interface Endpoint {
  path: string;
  avgLatency: number;
  errorRate: number;
  signalCount: number;
  cacheEnabled: boolean;
  circuitBreakerActive: boolean;
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