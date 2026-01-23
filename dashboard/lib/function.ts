import { Signal, Service, Endpoint } from './types';

/**
 * Format latency for display
 */
export function formatLatency(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format timestamp
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
}

/**
 * Get status color
 */
export function getStatusColor(status: 'healthy' | 'degraded' | 'down'): string {
  switch (status) {
    case 'healthy': return 'text-green-500';
    case 'degraded': return 'text-yellow-500';
    case 'down': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

/**
 * Get status background color
 */
export function getStatusBgColor(status: 'healthy' | 'degraded' | 'down'): string {
  switch (status) {
    case 'healthy': return 'bg-green-500/20';
    case 'degraded': return 'bg-yellow-500/20';
    case 'down': return 'bg-red-500/20';
    default: return 'bg-gray-500/20';
  }
}

/**
 * Aggregate signals into services
 */
export function aggregateServices(signals: Signal[]): Service[] {
  const serviceMap = new Map<string, {
    endpoints: Map<string, Signal[]>;
    allSignals: Signal[];
  }>();
  
  // Group signals by service and endpoint
  signals.forEach(signal => {
    if (!serviceMap.has(signal.service_name)) {
      serviceMap.set(signal.service_name, {
        endpoints: new Map(),
        allSignals: []
      });
    }
    
    const service = serviceMap.get(signal.service_name)!;
    service.allSignals.push(signal);
    
    if (!service.endpoints.has(signal.endpoint)) {
      service.endpoints.set(signal.endpoint, []);
    }
    
    service.endpoints.get(signal.endpoint)!.push(signal);
  });
  
  // Convert to Service objects
  const services: Service[] = [];
  
  serviceMap.forEach((data, serviceName) => {
    const allSignals = data.allSignals;
    const avgLatency = allSignals.reduce((sum, s) => sum + s.latency_ms, 0) / allSignals.length;
    const errorRate = allSignals.filter(s => s.status === 'error').length / allSignals.length;
    const lastSignal = allSignals.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
    
    // Calculate status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (errorRate > 0.3) {
      status = 'down';
    } else if (avgLatency > 1000 || errorRate > 0.1) {
      status = 'degraded';
    }
    
    // Build endpoints array
    const endpoints: Endpoint[] = [];
    data.endpoints.forEach((endpointSignals, endpointPath) => {
      const endpointAvgLatency = endpointSignals.reduce((sum, s) => sum + s.latency_ms, 0) / endpointSignals.length;
      const endpointErrorRate = endpointSignals.filter(s => s.status === 'error').length / endpointSignals.length;
      
      endpoints.push({
        path: endpointPath,
        avgLatency: endpointAvgLatency,
        errorRate: endpointErrorRate,
        signalCount: endpointSignals.length,
        cacheEnabled: false, // Will be updated when we fetch config
        circuitBreakerActive: false
      });
    });
    
    services.push({
      name: serviceName,
      endpoints,
      totalSignals: allSignals.length,
      avgLatency,
      errorRate,
      lastSignal: lastSignal.timestamp,
      status
    });
  });
  
  return services;
}

/**
 * Combine class names
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}