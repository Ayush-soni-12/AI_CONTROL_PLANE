"use client";

import { useServices } from "@/hooks/useSignals";
import { MetricCard } from "@/components/cards/MetricCard";
import { Activity, Zap, Timer, Server, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dynamic Metrics Component
 * Streams real-time microservice signals from SSE and renders cyber telemetry cards with mini sparklines
 */
export function DynamicMetrics() {
  const { data, status, error } = useServices();

  // Show loading skeleton while connecting
  if (status === "connecting" || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-[#111113] border border-[#27272a] p-5 space-y-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-3.5 w-24 bg-[#18181b]" />
              <Skeleton className="h-7 w-7 rounded-md bg-[#18181b]" />
            </div>
            <div className="flex justify-between items-end">
              <Skeleton className="h-7 w-28 bg-[#18181b]" />
              <Skeleton className="h-8 w-20 bg-[#18181b]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state with reconnect indicator
  if (status === "error" || error) {
    return (
      <div className="p-4 rounded-lg bg-[#111113] border border-red-500/40 text-red-400 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider font-mono">
            Telemetry Stream Interrupted
          </p>
          <p className="text-xs text-[#a1a1aa]">
            {error || "Unable to establish SSE connection with control plane backend."}
          </p>
        </div>
      </div>
    );
  }

  const { total_signals, avg_latency, error_rate, active_services } =
    data.overall;

  const totalRegistered = data.services?.length || active_services;
  const hasTraffic = total_signals > 0;
  const hasServices = active_services > 0;
  const successRate = Math.max(0, Math.min(100, (1 - error_rate) * 100));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. Total Requests / Signals */}
      <MetricCard
        title="Total Requests"
        value={total_signals.toLocaleString()}
        icon={Activity}
        variant="purple"
        trend={
          hasTraffic
            ? {
                value: 12,
                isPositive: true,
                label: "vs last hr",
              }
            : {
                label: "awaiting traffic",
                isPositive: false,
              }
        }
        sparklineData={
          hasTraffic
            ? [
                total_signals * 0.7,
                total_signals * 0.75,
                total_signals * 0.82,
                total_signals * 0.88,
                total_signals * 0.94,
                total_signals,
              ]
            : [0, 0, 0, 0, 0, 0]
        }
      />

      {/* 2. Success Rate */}
      <MetricCard
        title="Success Rate"
        value={hasTraffic ? `${successRate.toFixed(1)}%` : "0.0%"}
        icon={Zap}
        variant="emerald"
        trend={
          hasTraffic
            ? {
                value: 0.4,
                isPositive: true,
                label: error_rate < 0.05 ? "optimal" : "degraded",
              }
            : {
                label: "no traffic recorded",
                isPositive: false,
              }
        }
        sparklineData={
          hasTraffic
            ? [96.5, 97.2, 98.0, 98.4, 98.2, successRate]
            : [0, 0, 0, 0, 0, 0]
        }
      />

      {/* 3. Avg. Response Time */}
      <MetricCard
        title="Avg. Response Time"
        value={hasTraffic ? `${Math.round(avg_latency)} ms` : "0 ms"}
        icon={Timer}
        variant="cyan"
        trend={
          hasTraffic
            ? {
                value: 18,
                isPositive: false,
                label: avg_latency < 100 ? "fast" : "nominal",
              }
            : {
                label: "no latency sampled",
                isPositive: false,
              }
        }
        sparklineData={
          hasTraffic
            ? [
                avg_latency * 1.3,
                avg_latency * 1.25,
                avg_latency * 1.15,
                avg_latency * 1.1,
                avg_latency,
              ]
            : [0, 0, 0, 0, 0, 0]
        }
      />

      {/* 4. Active Services / Nodes */}
      <MetricCard
        title="Active Services"
        value={`${active_services} / ${Math.max(active_services, totalRegistered)}`}
        icon={Server}
        variant="cyan"
        trend={
          hasServices
            ? {
                label: `${active_services} online`,
                isPositive: true,
              }
            : {
                label: "no services connected",
                isPositive: false,
              }
        }
        sparklineData={
          hasServices
            ? [active_services, active_services, active_services, active_services]
            : [0, 0, 0, 0, 0, 0]
        }
      />
    </div>
  );
}
