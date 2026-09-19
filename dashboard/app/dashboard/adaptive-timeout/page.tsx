"use client";

import { useState, useMemo } from "react";
import {
  Timer,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Clock,
  Shield,
  X,
  Server,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { LatencyMetricsHUD } from "@/components/dashboard/adaptive-timeout/LatencyMetricsHUD";
import { JitterBufferCalibrator, JitterCalibrationState } from "@/components/dashboard/adaptive-timeout/JitterBufferCalibrator";
import { AdaptiveTimeoutEndpointCard } from "@/components/dashboard/adaptive-timeout/AdaptiveTimeoutEndpointCard";
import { TimeoutBreachLog } from "@/components/dashboard/adaptive-timeout/TimeoutBreachLog";
import { CreateOverrideForm } from "@/components/dashboard/overrides/CreateOverrideForm";
import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { useAdaptiveTimeout } from "@/hooks/useAdaptiveTimeout";
import type { AdaptiveTimeoutStatus } from "@/lib/types";

export default function AdaptiveTimeoutPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: endpoints = [], isLoading, error, refetch } = useAdaptiveTimeout();
  const { data: servicesData } = useServices();

  const [selectedService, setSelectedService] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number>(0);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [overrideInitialService, setOverrideInitialService] = useState<string>("demo-service");
  const [overrideInitialEndpoint, setOverrideInitialEndpoint] = useState<string>("/api/products");
  const [overrideInitialAdaptiveTimeout, setOverrideInitialAdaptiveTimeout] = useState<number | null>(null);
  const [overrideInitialReason, setOverrideInitialReason] = useState<string>("");

  // Jitter Calibration State
  const [calibration, setCalibration] = useState<JitterCalibrationState>({
    multiplier: 1.5,
    minClampMs: 200,
    maxClampMs: 3000,
  });

  // Extract all distinct services
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    endpoints.forEach((e) => {
      if (e.service_name && e.service_name.trim()) set.add(e.service_name.trim());
    });
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    return Array.from(set);
  }, [endpoints, servicesData]);

  // Telemetry KPIs
  const totalMonitored = endpoints.length;
  const activeSpikesCount = useMemo(
    () => endpoints.filter((e) => e.active || e.current_p99_ms > e.threshold_ms).length,
    [endpoints]
  );

  const meanP99Ms = useMemo(() => {
    if (endpoints.length === 0) return 0;
    const total = endpoints.reduce((acc, curr) => acc + curr.current_p99_ms, 0);
    return Math.round(total / endpoints.length);
  }, [endpoints]);

  // Filtered Endpoints
  const filteredEndpoints = useMemo(() => {
    return endpoints.filter((e) => {
      const matchesService =
        selectedService === "all" ||
        e.service_name.toLowerCase() === selectedService.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === "" ||
        e.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesService && matchesSearch;
    });
  }, [endpoints, selectedService, searchQuery]);

  const activeSelectedEndpoint: AdaptiveTimeoutStatus | null =
    filteredEndpoints[selectedEndpointIndex] || filteredEndpoints[0] || endpoints[0] || null;

  const handleQuickOverride = (
    serviceName?: string,
    endpoint?: string,
    timeoutMs?: number | null,
    reason?: string
  ) => {
    setOverrideInitialService(serviceName || activeSelectedEndpoint?.service_name || "demo-service");
    setOverrideInitialEndpoint(endpoint || activeSelectedEndpoint?.endpoint || "/api/products");
    setOverrideInitialAdaptiveTimeout(timeoutMs ?? null);
    setOverrideInitialReason(reason || "");
    setShowOverrideModal(true);
  };

  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-slate-100">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 mb-4 border border-cyan-500/20">
            <LogIn className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-slate-400 font-mono text-sm">Verifying operator credentials...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, auth middleware will handle redirect
  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          <TopCommandHeader />

          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  LATENCY CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Adaptive Timeout & Jitter Calibration
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Adaptive Timeout & Jitter Calibrator</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Dynamic P99 latency percentile visualizers, sliding jitter buffer calibration, and fail fast backpressure guardrails
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh adaptive timeout telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Sync Telemetry</span>
              </button>

              <button
                onClick={() => handleQuickOverride()}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95"
              >
                <Sliders className="w-4 h-4 text-black stroke-[2.5]" />
                <span>Calibrate Override</span>
              </button>
            </div>
          </div>

          {/* Top Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Monitored Endpoints */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Timer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Monitored Endpoints</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Active Mesh
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {totalMonitored}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Distinct microservice routes tracked
              </div>
            </div>

            {/* Card 2: Active Latency Spikes */}
            <div
              className={`p-4 rounded-xl border shadow-[0_4px_20px_rgba(245,158,11,0.05)] transition-all ${
                activeSpikesCount > 0
                  ? "bg-amber-950/25 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                  : "bg-[#091020]/80 border-emerald-500/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <AlertTriangle className={`w-3.5 h-3.5 ${activeSpikesCount > 0 ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
                  <span>Active Latency Spikes</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    activeSpikesCount > 0
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {activeSpikesCount > 0 ? "Spike Enforcing" : "Nominal"}
                </span>
              </div>
              <div
                className={`text-2xl sm:text-3xl font-bold font-mono ${
                  activeSpikesCount > 0 ? "text-amber-300" : "text-emerald-400"
                }`}
              >
                {activeSpikesCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {activeSpikesCount > 0
                  ? "Endpoints with tight fail fast cutoffs"
                  : "Zero active threshold breaches"}
              </div>
            </div>

            {/* Card 3: Mean P99 Latency */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Mean P99 Latency</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Percentile
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {meanP99Ms > 1000 ? `${(meanP99Ms / 1000).toFixed(1)}s` : `${meanP99Ms}ms`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Average latency across all services
              </div>
            </div>

            {/* Card 4: Autonomous Protection State */}
            <div
              className={`p-4 rounded-xl border shadow-[0_4px_20px_rgba(0,240,255,0.05)] transition-all ${
                activeSpikesCount === 0
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : "bg-[#091020]/80 border-cyan-500/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Activity className={`w-3.5 h-3.5 ${activeSpikesCount === 0 ? "text-emerald-400" : "text-amber-400"}`} />
                  <span>Dynamic Protection</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    activeSpikesCount === 0
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {activeSpikesCount === 0 ? "Autonomous" : "Fail Fast"}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white truncate">
                {activeSpikesCount === 0 ? "Optimal Guardrails" : `${activeSpikesCount} Spikes Enforced`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {activeSpikesCount === 0
                  ? "Continuous AI percentile tracking"
                  : "Protecting upstream connection pools"}
              </div>
            </div>
          </div>

          {/* Precision Latency Metrics HUD & Headroom Gauge */}
          <LatencyMetricsHUD
            selectedEndpoint={activeSelectedEndpoint}
            endpoints={endpoints}
            jitterMultiplier={calibration.multiplier}
          />

          {/* Sliding Jitter Buffer & Backpressure Calibrator */}
          <JitterBufferCalibrator
            calibration={calibration}
            onChange={setCalibration}
            selectedEndpoint={activeSelectedEndpoint}
            onApplyOverride={(timeoutMs) => {
              const ep = activeSelectedEndpoint;
              handleQuickOverride(
                ep?.service_name,
                ep?.endpoint,
                timeoutMs,
                `Jitter Buffer Calibration (${calibration.multiplier.toFixed(1)}x multiplier on ${ep?.baseline_p99_ms || 650}ms baseline P99)`
              );
            }}
          />

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#091020]/60 border border-white/[0.08] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                <Server className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                Tracked Endpoints ({filteredEndpoints.length})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Service Select Dropdown */}
              <div className="relative w-full sm:w-48">
                <select
                  value={selectedService}
                  onChange={(e) => {
                    setSelectedService(e.target.value);
                    setSelectedEndpointIndex(0);
                  }}
                  className="w-full bg-[#091020] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="all">All Services</option>
                  {availableServices.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoint Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoint path..."
                  className="w-full bg-[#091020] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Endpoint Cards Grid */}
          <div>
            {isLoading ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-[#091020]/60 border border-white/[0.08] h-44 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-center">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                <p className="text-sm font-mono font-bold">Failed to load adaptive timeout telemetry</p>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Ensure the control plane backend is running on port 8000.
                </p>
              </div>
            ) : filteredEndpoints.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#091020]/40 border border-white/[0.06] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
                  <Timer className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold font-mono text-slate-300">
                  No Monitored Endpoints Found
                </h4>
                <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
                  {searchQuery || selectedService !== "all"
                    ? "No endpoints match your search criteria."
                    : "Send traffic through the NeuralControl SDK to begin autonomous latency tracking."}
                </p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {filteredEndpoints.map((ep, idx) => {
                  const isSelected = activeSelectedEndpoint?.endpoint === ep.endpoint && activeSelectedEndpoint?.service_name === ep.service_name;
                  return (
                    <AdaptiveTimeoutEndpointCard
                      key={`${ep.service_name}-${ep.endpoint}`}
                      ep={ep}
                      isSelected={isSelected}
                      onSelect={() => setSelectedEndpointIndex(idx)}
                      onQuickOverride={() =>
                        handleQuickOverride(
                          ep.service_name,
                          ep.endpoint,
                          ep.threshold_ms,
                          `Threshold override for ${ep.service_name} ${ep.endpoint}`
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Timeout Breach Events Log Stream */}
          <TimeoutBreachLog endpoints={endpoints} />
        </div>
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <CreateOverrideForm
          onClose={() => setShowOverrideModal(false)}
          defaultService={overrideInitialService}
          defaultEndpoint={overrideInitialEndpoint}
          defaultAdaptiveTimeout={overrideInitialAdaptiveTimeout}
          defaultReason={overrideInitialReason}
        />
      )}
    </>
  );
}
