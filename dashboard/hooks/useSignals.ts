'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSignals } from '@/lib/control-plane-client';
import { signup, login, logout, authenticate } from '@/lib/auth-client';
import type { SignupRequest, LoginRequest, AuthResponse, User } from '@/lib/types';

/**
 * Hook to fetch signals from the control plane
 */
export const useSignals = () => {
  return useQuery({
    queryKey: ["signals"],
    queryFn: fetchSignals,
    refetchInterval: 5000, // Refresh every 3 seconds
    staleTime: 3000
  });
}

/**
 * Hook to fetch aggregated services with pre-calculated metrics from backend
 */
export const useServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const response = await fetch('http://localhost:8000/api/services', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }
      
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 7000
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
 * Hook to check authentication status
 * Uses TanStack Query for automatic loading states and caching
 * Returns user data if authenticated, null if not
 */
export const useCheckAuth = () => {
  return useQuery<User | null, Error>({
    queryKey: ['auth', 'user'],
    queryFn: authenticate,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: false, // Don't retry if not authenticated
  });
}
