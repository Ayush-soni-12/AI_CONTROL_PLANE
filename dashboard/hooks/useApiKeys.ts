import { useMutation, useQuery, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getApiKeys, generateApiKey, deleteApiKey } from "@/lib/auth-client";
import type { ApiKey } from "@/lib/types";

/**
 * Hook to fetch API keys (Standard Query)
 */
export const useApiKeys = () => {
  return useQuery<ApiKey[], Error>({
    queryKey: ['api-keys'],
    queryFn: getApiKeys,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to fetch API keys (Suspense)
 */
export const useSuspenseApiKeys = () => {
  return useSuspenseQuery<ApiKey[], Error>({
    queryKey: ['api-keys', 'suspense'],
    queryFn: getApiKeys,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to generate a new API key
 */
export const useGenerateApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) => generateApiKey(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });
}

/**
 * Hook to delete an API key
 */
export const useDeleteApiKey = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    }
  });
}
