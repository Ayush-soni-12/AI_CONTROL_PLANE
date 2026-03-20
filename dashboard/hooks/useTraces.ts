'use client';

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || 'http://localhost:8000';

export interface Span {
  span_id: string;
  parent_span_id: string | null;
  operation: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  attributes: Record<string, unknown>;
  is_slow: boolean;
  depth: number;
}

export interface TraceData {
  trace_id: string;
  span_count: number;
  duration_ms: number;
  spans: Span[];
}

export const useTrace = (traceId: string | null) => {
  return useQuery<TraceData>({
    queryKey: ['trace', traceId],
    queryFn: async () => {
      const url = `${API_BASE_URL}/api/traces/${traceId}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch trace: ${response.status}`);
      return response.json();
    },
    enabled: !!traceId,
    staleTime: 60_000,
  });
};
