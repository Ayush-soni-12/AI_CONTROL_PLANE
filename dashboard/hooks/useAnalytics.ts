import { useQuery } from '@tanstack/react-query';

interface TrafficPattern {
  hour: number;
  day_of_week: number;
  request_count: number;
  avg_latency: number;
}

interface EndpointPercentile {
  endpoint: string;
  p50: number;
  p95: number;
  p99: number;
}

interface PercentileDataPoint {
  timestamp: string;
  service_name: string;
  endpoints: EndpointPercentile[];
}

interface PercentilesResponse {
  data: PercentileDataPoint[];
  source: 'snapshots' | 'raw_signals';
}

/**
 * Hook to fetch traffic patterns for heatmap
 */
export const useTrafficPatterns = (days: number = 7) => {
  return useQuery({
    queryKey: ['trafficPatterns', days],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:8000/api/analytics/traffic-patterns?days=${days}`,
        {
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch traffic patterns');
      }
      
      const data = await response.json();
      return data.patterns as TrafficPattern[];
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

/**
 * Hook to fetch percentile data (now per-endpoint)
 */
export const usePercentiles = (days: number = 7, serviceName?: string) => {
  return useQuery({
    queryKey: ['percentiles', days, serviceName],
    queryFn: async () => {
      const params = new URLSearchParams({
        days: days.toString(),
      });
      
      if (serviceName) {
        params.append('service_name', serviceName);
      }
      
      const response = await fetch(
        `http://localhost:8000/api/analytics/percentiles?${params}`,
        {
          credentials: 'include'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch percentiles');
      }
      
      const result: PercentilesResponse = await response.json();
      console.log(`📊 Percentile data source: ${result.source}`);
      console.log(`📊 Per-endpoint data:`, result.data);
      
      return result;
    },
    refetchInterval: 60000, // Refetch every minute
  });
};
