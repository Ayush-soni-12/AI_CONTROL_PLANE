"use client";

import { useSignals } from "@/hooks/useSignals";
import { ErrorRateChart } from "@/components/cards/ErrorRateChart";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dynamic Error Chart Component
 * Streams real-time error rate data from server with guaranteed rendering
 */
export function DynamicErrorChart() {
  const { data, status, error } = useSignals();

  // Show loading skeleton while connecting
  if (status === "connecting" && !data) {
    return <Skeleton className="h-72 rounded-2xl mb-6 bg-[#0d1527]/60" />;
  }

  // Extract signals array from SSE data structure or default to empty array
  const signals = data?.signals || [];

  return (
    <div className="mb-6">
      <ErrorRateChart signals={signals} />
    </div>
  );
}
