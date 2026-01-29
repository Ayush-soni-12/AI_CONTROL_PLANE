"use client";

import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { getApiKeys, generateApiKey, deleteApiKey } from "@/lib/auth-client";

/**
 * Hook to fetch API keys (Suspense)
 */
export const useApiKeys = () => {
  return useSuspenseQuery({
    queryKey: ['api-keys'],
    queryFn: getApiKeys,
    staleTime: 5 * 60 * 1000,
  });
}

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
