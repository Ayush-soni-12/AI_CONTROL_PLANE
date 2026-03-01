'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

export interface IncidentEvent {
  id: number;
  event_type: string;
  title: string;
  description: string | null;
  latency_ms: number;
  error_rate: number;
  rpm: number;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

export interface Incident {
  id: number;
  service_name: string;
  endpoint: string;
  title: string;
  severity: string;
  status: string;
  peak_latency_ms: number;
  peak_error_rate: number;
  peak_rpm: number;
  root_cause_summary: string | null;
  ai_confidence: string | null;
  started_at: string;
  resolved_at: string | null;
  duration_secs: number | null;
  duration_display: string;
  event_count?: number;
  events?: IncidentEvent[];
}

export const useIncidents = (serviceName?: string, status?: string) => {
  return useQuery<Incident[]>({
    queryKey: ['incidents', serviceName, status],
    queryFn: async () => {
      let url = `${API_BASE_URL}/api/incidents`;
      const params = new URLSearchParams();

      const hasService = serviceName && serviceName !== 'all';
      const hasStatus = status && status !== 'all';

      if (status === 'open' && !hasService) {
        url = `${API_BASE_URL}/api/incidents/open`;
      } else if (hasService) {
        url = `${API_BASE_URL}/api/incidents/service/${serviceName}`;
        if (hasStatus) params.append('status', status);
      } else {
        if (hasStatus) params.append('status', status);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    refetchInterval: 10000,
  });
};

export const useIncidentDetail = (incidentId: number | null) => {
  return useQuery<Incident>({
    queryKey: ['incident', incidentId],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/incidents/${incidentId}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch incident details');
      return response.json();
    },
    enabled: !!incidentId,
    refetchInterval: 10000,
  });
};

export const useAnalyzeIncident = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (incidentId: number) => {
      const url = `${API_BASE_URL}/api/incidents/${incidentId}/analyze`;
      const response = await fetch(url, { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Failed to analyze incident');
      return response.json();
    },
    onSuccess: (_, incidentId) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
  });
};
