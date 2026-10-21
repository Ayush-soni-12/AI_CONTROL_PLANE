'use client';

import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { signup, login, logout, authenticate, authenticateSuspense } from '@/lib/auth-client';
import type { User, EndpointDetail, Signal, ServicesResponse } from '@/lib/types';
import { useSSE } from './useSSE';


export const useSignals = (limit: number = 50, serviceName?: string | null, enabled: boolean = true) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set('limit', limit.toString());
  if (serviceName) queryParams.set('service_name', serviceName);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useSSE<{ signals: Signal[]; timestamp: number }>(`/api/sse/signals${queryString}`, 'signals', enabled);
}

/**
 * Hook to fetch signals for a specific service via SSE
 * 
 * @param serviceName - Name of the service to filter signals
 * @param limit - Maximum number of signals to stream (default: 50)
 * @param endpoint - Optional specific endpoint filter
 * @param enabled - Whether to connect (default: true, but should be false if serviceName is empty)
 * @returns Signals filtered by service name
 */
export const useServiceSignals = (
  serviceName: string,
  limit: number = 50,
  endpoint?: string | null,
  enabled: boolean = true
) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set('limit', limit.toString());
  if (endpoint) queryParams.set('endpoint', endpoint);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  return useSSE<{ signals: Signal[]; timestamp: number }>(
    `/api/sse/service-signals/${encodeURIComponent(serviceName)}${queryString}`, 
    'signals',  // Event type must match what backend sends
    enabled && !!serviceName  // Only connect if enabled AND serviceName is not empty
  );
}

/**
 * Hook to fetch aggregated services data
 * 
 * HYBRID APPROACH:
 * - Real-time data (/api/services) → SSE streaming
 * - Historical data (/api/history/services?...) → TanStack Query (one-time fetch with caching)
 * 
 * @param apiUrl - The API endpoint to fetch from
 * @returns Data in consistent format { data, status, error, reconnect }
 */
export const useServices = (apiUrl: string = '/api/sse/services') => {
  const isRealtime = apiUrl === '/api/sse/services';
  
  // Always call both hooks unconditionally (React Hooks rules)
  const sseResult = useSSE<ServicesResponse>('/api/sse/services', 'services', isRealtime);
  const queryResult = useQuery({
    queryKey: ['services', apiUrl],
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000'}${apiUrl}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }
      return response.json() as Promise<ServicesResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !isRealtime, // Only fetch when NOT real-time
  });
  
  // Return the appropriate result
  if (isRealtime) {
    return sseResult;
  }
  
  // Transform TanStack Query to SSE format
  return {
    data: queryResult.data || null,
    status: queryResult.isLoading ? 'connecting' as const : 
            queryResult.isError ? 'error' as const : 
            queryResult.data ? 'connected' as const : 
            'disconnected' as const,
    error: queryResult.error ? String(queryResult.error) : null,
    reconnect: () => { queryResult.refetch(); },
  };
}

/**
 * Hook to stream detailed metrics for a specific endpoint using Server-Sent Events
 * 
 * @param serviceName - Name of the service
 * @param endpointPath - Endpoint path to get details for
 * @param limit - Maximum number of signals history to stream (default: 50)
 * @param enabled - Whether to enable SSE streaming (default: true)
 * @returns Detailed endpoint metrics streamed via SSE
 */
export const useEndpointDetail = (
  serviceName: string,
  endpointPath: string,
  limit: number = 50,
  enabled: boolean = true
) => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.set('limit', limit.toString());
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

  const cleanPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;

  return useSSE<EndpointDetail>(
    `/api/sse/endpoint-detail/${encodeURIComponent(serviceName)}/${cleanPath}${queryString}`,
    'endpoint-detail',
    enabled
  );
}

// ========================================
// AUTHENTICATION HOOKS (Using TanStack Query)
// ========================================

/**
 * Check if the user is authenticated
 * 
 * Uses TanStack Query for authentication checks (not SSE).
 * This is appropriate because auth status doesn't need real-time streaming.
 */

/**
 * Signup mutation
 */
export const useSignup = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: signup,
    onSuccess: (data) => {
      // Update auth cache after successful signup
      queryClient.setQueryData(['auth', 'user'], data.user);
      queryClient.setQueryData(['auth', 'user', 'suspense'], data.user);
    },
  });
};

/**
 * Login mutation
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      // Update auth cache after successful login
      queryClient.setQueryData(['auth', 'user'], data.user);
      queryClient.setQueryData(['auth', 'user', 'suspense'], data.user);
    },
  });
};

/**
 * Logout mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      console.log("Logout successful");
      // Set user to null in cache
      queryClient.setQueryData(['auth', 'user'], null);
    },
    onError: (error) => {
      console.error("Logout failed:", error.message);
    }
  });
}

/**
 * Hook to check authentication status (Non-suspense version for top-level protection)
 */
export const useCheckAuth = () => {
  return useQuery<User | null, Error>({
    queryKey: ['auth', 'user'],
    queryFn: authenticate,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: false, // Don't retry if not authenticated
    // enabled: typeof window !== 'undefined', // Skip SSR fetch because it lacks cookies
  });
}

/**
 * Hook to check authentication status (Suspense version for components)
 */
export const useSuspenseCheckAuth = () => {
  return useSuspenseQuery<User, Error>({
    queryKey: ['auth', 'user', 'suspense'],
    queryFn: authenticateSuspense,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
