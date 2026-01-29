"use client";

import { useSignals } from "@/hooks/useSignals";
import { LatencyChart } from "@/components/cards/LatencyChart";

/**
 * Dynamic Chart Component - Wrapped in Suspense
 * Fetches and displays real-time latency chart
 */
export function DynamicChart() {
  const { data: signals } = useSignals();

  if (!signals || signals.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      <LatencyChart signals={signals} />
    </div>
  );
}
