'use client';

import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { signup, login, logout, authenticate, authenticateSuspense } from '@/lib/auth-client';
import type { User, EndpointDetail, Signal, ServicesResponse } from '@/lib/types';
import { useSSE } from './useSSE';

/**
 * Hook to stream signals from the control plane using Server-Sent Events
 * 
 * Replaces polling with real-time SSE streaming for better performance.
 * TanStack Query is NO LONGER used here (SSE handles real-time data).
 */
export const useSignals = () => {
  return useSSE<{ signals: Signal[]; timestamp: number }>('/api/sse/signals', 'signals');
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
 * @param enabled - Whether to enable SSE streaming (default: true)
 * @returns Detailed endpoint metrics streamed via SSE
 */
export const useEndpointDetail = (serviceName: string, endpointPath: string, enabled: boolean = true) => {
  return useSSE<EndpointDetail>(
    `/api/sse/endpoint-detail/${serviceName}/${endpointPath}`,
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
      queryClient.setQueryData(['auth'], data.user);
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
      queryClient.setQueryData(['auth'], data.user);
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
