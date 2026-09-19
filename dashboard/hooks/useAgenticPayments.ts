'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentSettings {
  avalanche_wallet: string | null;
  payment_amount_wei: string;
  access_duration_minutes: number;
  agentic_payments_enabled: boolean;
  pay_per_request_enabled: boolean;
  pay_per_request_amount_wei: string;
  pay_per_request_duration_minutes: number;
  confidential_eerc_enabled: boolean;
  eerc_token_address: string | null;
  eerc_payment_amount: string | null;
}

export interface AgentPayment {
  id: number;
  agent_id: string;
  agent_reputation_score: number | null;
  service_name: string;
  endpoint: string;
  status: 'pending' | 'verified' | 'failed' | 'expired' | 'consumed';
  tx_hash: string | null;
  amount_avax: number | null;
  is_eerc: boolean;
  access_granted_until: string | null;
  created_at: string;
  explorer_url: string | null;
}

export interface PaymentHistory {
  payments: AgentPayment[];
  total: number;
}

export interface FujiGasTelemetry {
  network: string;
  chain_id: number;
  base_fee_gwei: number;
  priority_fee_gwei: number;
  congestion: string;
  explorer_url: string;
  last_updated: string;
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
        method: 'POST',
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
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
};

// ── Fetch Fuji EVM Gas Telemetry ──────────────────────────────────────────────

export const useFujiGas = () => {
  return useQuery<FujiGasTelemetry>({
    queryKey: ['fuji-gas'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/agentic/gas`, {
        credentials: 'include',
      });
      if (!res.ok) {
        return {
          network: "Avalanche Fuji C-Chain (EVM)",
          chain_id: 43113,
          base_fee_gwei: 26.5,
          priority_fee_gwei: 1.5,
          congestion: "Nominal",
          explorer_url: "https://testnet.snowtrace.io",
          last_updated: new Date().toISOString(),
        };
      }
      return res.json();
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
};

// ── Seed Demo Test Payments ───────────────────────────────────────────────────

export const useSeedDemoPayments = () => {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; seeded_count: number; message: string }, Error, number | void>({
    mutationFn: async (count = 5) => {
      const res = await fetch(`${API_BASE}/api/agentic/demo-seed?count=${count || 5}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to seed demo transactions');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agent-payments'] });
      qc.invalidateQueries({ queryKey: ['agent-settings'] });
    },
  });
};
