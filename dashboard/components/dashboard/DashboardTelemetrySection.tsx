"use client";

import { useState } from "react";
import { useSignals, useServiceSignals, useServices } from "@/hooks/useSignals";
import { LatencyChart } from "@/components/cards/LatencyChart";
import { ErrorRateChart } from "@/components/cards/ErrorRateChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers,
  Server,
  Gauge,
  SlidersHorizontal,
  Radio,
} from "lucide-react";

export function DashboardTelemetrySection() {
  const [signalLimit, setSignalLimit] = useState<number>(50);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // Fetch registered services for dynamic filtering
  const { data: servicesData } = useServices();
  const services = servicesData?.services || [];

  // Dual-mode signal stream: If specific service selected, use service stream, else global stream
  const globalSignals = useSignals(signalLimit, undefined, !selectedService);
  const serviceSignals = useServiceSignals(
    selectedService || "",
    signalLimit,
    undefined,
    !!selectedService
  );

  const activeStream = selectedService ? serviceSignals : globalSignals;
  const signals = activeStream.data?.signals || [];
  const signalsStatus = activeStream.status;

  return (
    <div className="space-y-6">
      {/* ── Telemetry Control Toolbar ────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-xl bg-[#091020] border border-cyan-500/20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Title & Service Filter Chips */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
                Service Stream:
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  selectedService === null
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                    : "bg-[#070a13] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Services</span>
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded bg-white/10 text-white font-mono">
                  {services.length}
                </span>
              </button>

              {services.map((svc) => {
                const isSelected = selectedService === svc.name;
                return (
                  <button
                    key={svc.name}
                    type="button"
                    onClick={() => setSelectedService(svc.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                        : "bg-[#070a13] text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{svc.name}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        svc.status === "healthy"
                          ? "bg-emerald-400"
                          : svc.status === "degraded"
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Controls: Signal Count Limit Selector & Live Status */}
          <div className="flex items-center gap-3 self-end lg:self-auto flex-wrap">
            <div className="flex items-center gap-1 bg-[#070a13] p-1 rounded-lg border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 px-2 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" />
                Window:
              </span>
              {[20, 50, 100, 250].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSignalLimit(count)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                    signalLimit === count
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>Live Telemetry</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stacked Full-Width Charts ─────────────────────────────── */}
      {signalsStatus === "connecting" && !activeStream.data ? (
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-xl bg-[#0d1527]/60" />
          <Skeleton className="h-80 rounded-xl bg-[#0d1527]/60" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. Real-time Latency Telemetry Chart */}
          <div className="w-full">
            <LatencyChart signals={signals} />
          </div>

          {/* 2. Rolling Error Rate & Anomalies Chart */}
          <div className="w-full">
            <ErrorRateChart signals={signals} />
          </div>
        </div>
      )}
    </div>
  );
}
