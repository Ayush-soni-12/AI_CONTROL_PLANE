
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

