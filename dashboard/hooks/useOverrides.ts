'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

export interface Override {
  id: number;
  service_name: string;
  endpoint: string;
  reason: string;
  // Numeric threshold overrides — null means AI is deciding that threshold
  cache_latency_ms: number | null;
  circuit_breaker_error_rate: number | null;
  queue_deferral_rpm: number | null;
  load_shedding_rpm: number | null;
  rate_limit_customer_rpm: number | null;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  minutes_remaining: number | null;
}

export interface CreateOverridePayload {
  service_name: string;
  endpoint: string;
  duration_minutes: number;
  reason: string;
  cache_latency_ms?: number | null;
  circuit_breaker_error_rate?: number | null;
  queue_deferral_rpm?: number | null;
  load_shedding_rpm?: number | null;
  rate_limit_customer_rpm?: number | null;
}

/** Fetch all overrides (active + recent) */
export const useOverrides = () => {
  return useQuery<Override[]>({
    queryKey: ['overrides'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/overrides`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch overrides');
      return res.json();
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
};

/** Create a new override */
export const useCreateOverride = () => {
  const qc = useQueryClient();
  return useMutation<Override, Error, CreateOverridePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/overrides`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create override');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overrides'] }),
  });
};

/** Cancel (deactivate) an override by ID */
export const useCancelOverride = () => {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/api/overrides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to cancel override');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overrides'] }),
  });
};
