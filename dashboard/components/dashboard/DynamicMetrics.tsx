"use client";

import { useServices } from "@/hooks/useSignals";
import { MetricCard } from "@/components/cards/MetricCard";
import { Activity, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dynamic Metrics Component - Now using SSE
 * Streams real-time metrics from server
 */
export function DynamicMetrics() {
  const { data, status, error } = useServices();

  // Show loading skeleton while connecting
  if (status === "connecting" || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[...Array(4)].map((_, i) => (
          <Skeleton className="h-32 rounded-xl" key={i} />
        ))}
      </div>
    );
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="col-span-full p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          Error loading metrics: {error || "Connection error"}
        </div>
      </div>
    );
  }

  const { total_signals, avg_latency, error_rate, active_services } =
    data.overall;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <MetricCard
        title="Total Signals"
        value={total_signals}
        icon={Activity}
        color="bg-blue-500/20"
      />

      <MetricCard
        title="Active Services"
        value={active_services}
        icon={Zap}
        color="bg-purple-500/20"
      />

      <MetricCard
        title="Avg Latency"
        value={`${Math.round(avg_latency)}ms`}
        icon={TrendingUp}
        color="bg-green-500/20"
      />

      <MetricCard
        title="Error Rate"
        value={`${(error_rate * 100).toFixed(1)}%`}
        icon={AlertTriangle}
        color={error_rate > 0.1 ? "bg-red-500/20" : "bg-green-500/20"}
      />
    </div>
  );
}
