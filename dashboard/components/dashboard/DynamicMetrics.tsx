"use client";

import { useServices } from "@/hooks/useSignals";
import { MetricCard } from "@/components/cards/MetricCard";
import { Activity, Zap, AlertTriangle, TrendingUp } from "lucide-react";

/**
 * Dynamic Metrics Component - Wrapped in Suspense
 * Fetches and displays real-time metrics
 */
export function DynamicMetrics() {
  const { data: servicesData } = useServices();

  const { total_signals, avg_latency, error_rate, active_services } =
    servicesData.overall;

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
