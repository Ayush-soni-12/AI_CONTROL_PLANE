'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentSettings {
  avalanche_wallet: string | null;
  payment_amount_wei: string;
  access_duration_minutes: number;
  agentic_payments_enabled: boolean;
}

export interface AgentPayment {
  id: number;
  agent_id: string;
  agent_reputation_score: number | null;
  service_name: string;
  endpoint: string;
  status: 'pending' | 'verified' | 'failed' | 'expired';
  tx_hash: string | null;
  amount_avax: number | null;
  access_granted_until: string | null;
  created_at: string;
  explorer_url: string | null;
}

export interface PaymentHistory {
  payments: AgentPayment[];
  total: number;
}

// ── Fetch agent settings ──────────────────────────────────────────────────────

export const useAgentSettings = () => {
  return useQuery<AgentSettings>({
    queryKey: ['agent-settings'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/agentic/settings`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch agent settings');
      return res.json();
    },
    staleTime: 30 * 1000,
  });
};

// ── Update agent settings ─────────────────────────────────────────────────────

export const useUpdateAgentSettings = () => {
  const qc = useQueryClient();
  return useMutation<AgentSettings, Error, Partial<AgentSettings>>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/agentic/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to save settings');
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent-settings'] }),
  });
};

// ── Fetch payment history ─────────────────────────────────────────────────────

export const useAgentPayments = () => {
  return useQuery<PaymentHistory>({
    queryKey: ['agent-payments'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/agentic/history`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch payment history');
      return res.json();
    },
    staleTime: 15 * 1000,
    refetchInterval: 20 * 1000,  // auto-refresh every 20s during demo
  });
};
