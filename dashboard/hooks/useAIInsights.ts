'use client';

import { useQuery } from '@tanstack/react-query';
import type { AIInsightsResponse, AIThresholdsResponse } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

/**
 * Hook to fetch AI insights with optional filters
 * 
 * @param serviceName - Optional service name to filter by
 * @param limit - Maximum number of insights to fetch (default: 20, max: 100)
 * @returns AI insights data
 */
export const useAIInsights = (serviceName?: string, limit: number = 20) => {
  return useQuery<AIInsightsResponse>({
    queryKey: ['ai-insights', serviceName, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (serviceName) params.append('service_name', serviceName);
      params.append('limit', String(limit));

      const url = `${API_BASE_URL}/api/ai/insights?${params.toString()}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI insights');
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute - insights update every 5 minutes from background job
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes (when background job runs)
  });
};

/**
 * Hook to fetch all AI-tuned thresholds for the authenticated user
 * 
 * @returns All AI thresholds data
 */
export const useAIThresholds = () => {
  return useQuery<AIThresholdsResponse>({
    queryKey: ['ai-thresholds'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/ai/thresholds`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI thresholds');
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

/**
 * Hook to fetch AI thresholds for a specific service/endpoint
 * 
 * @param serviceName - Service name
 * @param endpoint - Endpoint path
 * @param enabled - Whether to enable the query (default: true)
 * @returns Service-specific AI thresholds
 */
export const useServiceThresholds = (
  serviceName: string,
  endpoint: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['ai-thresholds', serviceName, endpoint],
    queryFn: async () => {
      // Normalize endpoint (remove leading slash for URL)
      const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      
      const url = `${API_BASE_URL}/api/ai/thresholds/${serviceName}/${normalizedEndpoint}`;
      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch service thresholds');
      }

      return response.json();
    },
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};
