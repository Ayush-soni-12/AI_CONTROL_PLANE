"use client";

import { useSignals } from "@/hooks/useSignals";
import { ErrorRateChart } from "@/components/cards/ErrorRateChart";

/**
 * Dynamic Error Chart Component - Wrapped in Suspense
 * Fetches and displays real-time error rate chart
 */
export function DynamicErrorChart() {
  const { data: signals } = useSignals();

  if (!signals || signals.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      <ErrorRateChart signals={signals} />
    </div>
  );
}
