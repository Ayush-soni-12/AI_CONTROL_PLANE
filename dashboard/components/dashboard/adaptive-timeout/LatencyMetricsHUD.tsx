"use client";

import { useMemo } from "react";
import {
  Activity,
  Shield,
  Clock,
  Sliders,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Zap,
  Layers,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from "lucide-react";
import type { AdaptiveTimeoutStatus } from "@/lib/types";

interface LatencyMetricsHUDProps {
  selectedEndpoint?: AdaptiveTimeoutStatus | null;
  endpoints: AdaptiveTimeoutStatus[];
  jitterMultiplier: number;
}

export function LatencyMetricsHUD({
  selectedEndpoint,
  endpoints,
  jitterMultiplier,
}: LatencyMetricsHUDProps) {
  // Fallback endpoint if none selected
  const activeEp = selectedEndpoint || endpoints[0] || {
    service_name: "demo-service",
    endpoint: "/api/products",
    active: false,
    recommended_timeout_ms: 2000,
    threshold_ms: 2000,
    baseline_p99_ms: 650,
    current_p99_ms: 780,
    latency_trend: "stable" as const,
    last_updated: new Date().toISOString(),
  };

  // Real percentiles derived from metrics
  const currentP99 = activeEp.current_p99_ms;
  const baselineP99 = activeEp.baseline_p99_ms || 650;
  const thresholdMs = activeEp.threshold_ms;
  const recommendedTimeout = activeEp.recommended_timeout_ms || thresholdMs;

  // Real percentiles from Redis/DB aggregates (fallback to ratio only if not provided)
  const p50 = activeEp.p50_ms !== undefined ? activeEp.p50_ms : Math.round(baselineP99 * 0.35);
  const p95 = activeEp.p95_ms !== undefined ? activeEp.p95_ms : Math.round(baselineP99 * 0.85);

  // Calibrated target with jitter multiplier
  const calibratedTarget = Math.round(baselineP99 * jitterMultiplier);

  // Safety Headroom calculations
  const remainingHeadroomMs = thresholdMs - currentP99;
  const isBreaching = activeEp.active || currentP99 > thresholdMs;
  const percentageUsed = Math.min(150, Math.round((currentP99 / thresholdMs) * 100));
  const isElevated = percentageUsed >= 75 && !isBreaching;

  // Status badge config
  const statusConfig = useMemo(() => {
    if (isBreaching) {
      return {
        label: "BREACH DETECTED",
        color: "rose",
        bg: "bg-rose-500/15 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)]",
        icon: AlertTriangle,
        desc: `P99 latency (${currentP99}ms) currently exceeds AI threshold alarm line (${thresholdMs}ms)`,
      };
    }
    if (isElevated) {
      return {
        label: "ELEVATED LATENCY",
        color: "amber",
        bg: "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
        icon: AlertCircle,
        desc: `Latency consumed ${percentageUsed}% of threshold margin. Safety headroom is narrowing.`,
      };
    }
    return {
      label: "NOMINAL PERFORMANCE",
      color: "emerald",
      bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.25)]",
      icon: CheckCircle2,
      desc: `P99 tail latency is healthy with ${Math.max(0, Math.round(remainingHeadroomMs))}ms protective safety buffer.`,
    };
  }, [isBreaching, isElevated, currentP99, thresholdMs, percentageUsed, remainingHeadroomMs]);

  // Trend icon and color
  const trendConfig = useMemo(() => {
    if (activeEp.latency_trend === "rising") {
      return {
        icon: TrendingUp,
        label: "Rising",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      };
    }
    if (activeEp.latency_trend === "falling") {
      return {
        icon: TrendingDown,
        label: "Falling",
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      };
    }
    return {
      icon: Minus,
      label: "Stable",
      color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    };
  }, [activeEp.latency_trend]);

  return (
    <div className="rounded-2xl bg-[#091020]/90 border border-white/[0.08] hover:border-cyan-500/30 p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.4)] space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)] shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                LATENCY HUD
              </span>
              <span className="text-xs font-mono font-semibold text-slate-300">
                {activeEp.service_name}
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                {activeEp.endpoint}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-1">
              Precision Latency & Headroom Inspector
            </h3>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold shrink-0 self-start lg:self-center ${statusConfig.bg}`}>
          <statusConfig.icon className="w-4 h-4" />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* Latency Percentile Telemetry Quad (Real Numbers Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* P50 Median */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              P50 Median
            </span>
            <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              50% Faster
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums group-hover:text-emerald-300 transition-colors">
            {Number(p50).toFixed(1)}
            <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Median request latency
          </p>
        </div>

        {/* P95 Standard Tail */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-cyan-500/30 transition-all space-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
              P95 Tail
            </span>
            <span className="text-[10px] font-mono text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              95% Faster
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums group-hover:text-cyan-300 transition-colors">
            {Number(p95).toFixed(1)}
            <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Standard tail variance
          </p>
        </div>

        {/* Current P99 Critical Tail */}
        <div className={`p-4 rounded-xl border transition-all space-y-1 group ${
          isBreaching
            ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
            : "bg-black/40 border-white/[0.06] hover:border-purple-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                isBreaching ? "bg-rose-400 animate-ping" : "bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.8)]"
              }`} />
              Current P99
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${trendConfig.color}`}>
              <trendConfig.icon className="w-3 h-3" />
              <span>{trendConfig.label}</span>
            </span>
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight tabular-nums transition-colors ${
            isBreaching ? "text-rose-300" : "text-white group-hover:text-purple-300"
          }`}>
            {currentP99.toFixed(1)}
            <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Recent 1h rolling tail latency
          </p>
        </div>

        {/* 24h Baseline P99 */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-blue-500/30 transition-all space-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
              Baseline P99
            </span>
            <span className="text-[10px] font-mono text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              24h Window
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums group-hover:text-blue-300 transition-colors">
            {baselineP99.toFixed(1)}
            <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Healthy historical benchmark
          </p>
        </div>
      </div>

      {/* Linear Headroom Gauge & Threshold Progress Meter */}
      <div className="p-5 rounded-xl bg-black/50 border border-white/[0.08] space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Threshold Consumption & Safety Margin
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">
              P99 vs AI Alarm:{" "}
              <strong className="text-white">{Math.round(currentP99)}ms</strong> /{" "}
              <strong className="text-rose-300">{thresholdMs}ms</strong>
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              isBreaching
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : isElevated
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            }`}>
              {percentageUsed}% Consumed
            </span>
          </div>
        </div>

        {/* Progress Bar with 100% Alarm Mark */}
        <div className="relative pt-1 pb-1">
          <div className="relative w-full h-3.5 rounded-full bg-slate-900/90 border border-white/[0.1] overflow-hidden">
            {/* Progress Fill */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isBreaching
                  ? "bg-gradient-to-r from-amber-500 via-rose-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                  : isElevated
                  ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                  : "bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              }`}
              style={{ width: `${Math.min(100, percentageUsed)}%` }}
            />
          </div>

          {/* Scale Markings */}
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5 px-0.5">
            <span>0ms</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span className="text-rose-400 font-bold">100% (Alarm Line: {thresholdMs}ms)</span>
          </div>
        </div>

        {/* Headroom Status Cards Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
          {/* Headroom Margin */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] space-y-0.5">
            <span className="text-[11px] font-mono text-slate-400">Protective Headroom</span>
            <p className={`text-base font-bold font-mono ${
              isBreaching ? "text-rose-400" : isElevated ? "text-amber-300" : "text-emerald-300"
            }`}>
              {isBreaching ? (
                <span>-{Math.abs(Math.round(remainingHeadroomMs))}ms Deficit</span>
              ) : (
                <span>+{Math.round(remainingHeadroomMs)}ms Margin</span>
              )}
            </p>
            <p className="text-[10px] font-mono text-slate-500">
              {isBreaching ? "Threshold breached by spikes" : "Safe buffer before alarm trips"}
            </p>
          </div>

          {/* Enforced Client Timeout */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] space-y-0.5">
            <span className="text-[11px] font-mono text-slate-400">Enforced SDK Timeout</span>
            <p className="text-base font-bold font-mono text-cyan-300">
              {recommendedTimeout}ms
            </p>
            <p className="text-[10px] font-mono text-slate-500">
              Active client abort threshold
            </p>
          </div>

          {/* Target with Jitter Buffer */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] space-y-0.5">
            <span className="text-[11px] font-mono text-slate-400">Target With Jitter Buffer</span>
            <p className="text-base font-bold font-mono text-purple-300">
              {calibratedTarget}ms
            </p>
            <p className="text-[10px] font-mono text-slate-500">
              Dynamic target at {jitterMultiplier.toFixed(1)}x buffer
            </p>
          </div>
        </div>
      </div>

      {/* Autonomous Decision & Intelligence Note */}
      <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-300">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>AI Engine Status:</strong> {statusConfig.desc}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 shrink-0">
          Last evaluated: {new Date(activeEp.last_updated).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
