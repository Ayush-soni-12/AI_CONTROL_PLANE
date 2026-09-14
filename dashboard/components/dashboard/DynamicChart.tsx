"use client";

import { useSignals } from "@/hooks/useSignals";
import { LatencyChart } from "@/components/cards/LatencyChart";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dynamic Chart Component
 * Streams real-time latency data from server with guaranteed rendering
 */
export function DynamicChart() {
  const { data, status, error } = useSignals();

  // Show loading skeleton while connecting
  if (status === "connecting" && !data) {
    return <Skeleton className="h-72 rounded-2xl mb-6 bg-[#0d1527]/60" />;
  }

  // Extract signals array from SSE data structure or default to empty array
  const signals = data?.signals || [];

  return (
    <div className="mb-6">
      <LatencyChart signals={signals} />
    </div>
  );
}
