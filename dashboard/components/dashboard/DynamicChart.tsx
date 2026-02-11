"use client";

import { useSignals } from "@/hooks/useSignals";
import { LatencyChart } from "@/components/cards/LatencyChart";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dynamic Chart Component - Now using SSE
 * Streams real-time latency data from server
 */
export function DynamicChart() {
  const { data, status, error } = useSignals();

  // Show loading skeleton while connecting
  if (status === "connecting" || !data) {
    return <Skeleton className="h-96 rounded-xl mb-10" />;
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="mb-10 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        Error loading chart: {error || "Connection error"}
      </div>
    );
  }

  // Extract signals array from SSE data structure
  const signals = data.signals;

  if (!signals || signals.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      <LatencyChart signals={signals} />
    </div>
  );
}
