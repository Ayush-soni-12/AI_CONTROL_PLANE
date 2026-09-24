'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

export interface RegisteredAgent {
  agent_id: string;
  name: string;
  owner_wallet: string;
  trust_score: number;
  staked_balance_avax: number;
  is_registered: boolean;
  is_revoked: boolean;
  created_at: string;
  last_active: string;
  tx_hash?: string;
  tier?: string;
  is_trusted?: boolean;
}

export interface RegistryResponse {
  agents: RegisteredAgent[];
  total: number;
  contract_address: string;
  network: string;
}

export interface AgentLookupResult extends RegisteredAgent {
  lookup_source?: string;
  explorer_url?: string;
  description?: string;
}

// ── Fetch all registered agents ───────────────────────────────────────────────

export const useRegisteredAgents = (search?: string) => {
  return useQuery<RegistryResponse>({
    queryKey: ['registered-agents', search],
    queryFn: async () => {
      const url = new URL(`${API_BASE}/api/registry/agents`);
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString(), {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch registered agents');
      return res.json();
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });
};

// ── Look up single agent score ────────────────────────────────────────────────

export const useAgentLookup = (agentId: string | null) => {
  return useQuery<AgentLookupResult>({
    queryKey: ['agent-lookup', agentId],
    queryFn: async () => {
      if (!agentId || !agentId.trim()) {
        throw new Error('Agent ID required');
      }
      const res = await fetch(`${API_BASE}/api/registry/agent/${encodeURIComponent(agentId.trim())}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to lookup agent');
      }
      return res.json();
    },
    enabled: !!agentId && agentId.trim().length > 0,
    staleTime: 5 * 1000,
    retry: 1,
  });
};

// ── Record newly registered agent ─────────────────────────────────────────────

export interface RecordAgentPayload {
  agent_id: string;
  owner_wallet: string;
  tx_hash?: string;
  staked_balance_avax?: number;
  name?: string;
}

export const useRecordAgentRegistration = () => {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; agent: RegisteredAgent; message: string }, Error, RecordAgentPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/api/registry/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to record agent in control plane');
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['registered-agents'] });
      qc.invalidateQueries({ queryKey: ['agent-lookup', vars.agent_id] });
    },
  });
};

// ── Seed demo agent records ───────────────────────────────────────────────────

export const useSeedDemoAgents = () => {
  const qc = useQueryClient();
  return useMutation<{ success: boolean; seeded_count: number; message: string }, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/registry/demo-seed`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || 'Failed to seed demo agents');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registered-agents'] });
    },
  });
};
