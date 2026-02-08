'use client';

import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSignals } from '@/lib/control-plane-client';
import { signup, login, logout, authenticate, authenticateSuspense } from '@/lib/auth-client';
import type { SignupRequest, LoginRequest, AuthResponse, User, EndpointDetail } from '@/lib/types';

/**
 * Hook to fetch signals from the control plane
 */
export const useSignals = () => {
  return useSuspenseQuery({
    queryKey: ["signals"],
    queryFn: fetchSignals,
    refetchInterval: 2000, // Refresh every 3 seconds
    staleTime: 1000
  });
}

/**
 * Hook to fetch aggregated services with pre-calculated metrics from backend
 */
export const useServices = (apiUrl: string = '/api/services') => {
  return useSuspenseQuery({
    queryKey: ["services", apiUrl],
    queryFn: async () => {
      const response = await fetch(`http://localhost:8000${apiUrl}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      
      return response.json();
    },
    refetchInterval: 2000, // Refresh every 10 seconds
    staleTime: 1000
  });
}

/**
 * Hook to fetch detailed metrics for a specific endpoint
 */
export const useEndpointDetail = (serviceName: string, endpointPath: string) => {
  return useQuery<EndpointDetail>({
    queryKey: ["endpoint-detail", serviceName, endpointPath],
    queryFn: async () => {
      // Ensure endpointPath doesn't have leading slash when appending to URL if needed, 
      // but FastAPI :path handles it well. 
      // We'll strip leading slash to avoid // in URL
      const path = endpointPath.startsWith('/') ? endpointPath.substring(1) : endpointPath;
      const response = await fetch(`http://localhost:8000/api/services/${serviceName}/endpoints/${path}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch endpoint details');
      }
      
      return response.json();
    },
    enabled: !!serviceName && !!endpointPath,
    refetchInterval: 3000,
  });
}

/**
 * Hook to handle user signup
 */
export const useSignup = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, Error, SignupRequest>({
    mutationFn: signup,
    onSuccess: (data) => {
      console.log("Signup successful:", data.user);
      // Immediately set the user data in cache
      queryClient.setQueryData(['auth', 'user'], data.user);
    },
    onError: (error) => {
      console.error("Signup failed:", error.message);
    }
  });
}

/**
 * Hook to handle user login
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: login,
    onSuccess: (data) => {
      console.log("Login successful:", data.user);
      // Immediately set the user data in cache
      queryClient.setQueryData(['auth', 'user'], data.user);
    },
    onError: (error) => {
      console.error("Login failed:", error.message);
    }
  });
}


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
