'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSignals } from '@/lib/control-plane-client';

export function useSignals() {
  return useQuery({
    queryKey: ['signals'],
    queryFn: fetchSignals,
    refetchInterval: 3000, // Refresh every 3 seconds
    staleTime: 2000
  });
}