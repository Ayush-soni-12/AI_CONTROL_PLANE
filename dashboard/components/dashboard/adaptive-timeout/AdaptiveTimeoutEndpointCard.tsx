"use client";

import { AlertTriangle, TrendingUp, TrendingDown, Minus, Clock, Shield, Sliders, Zap, CheckCircle2 } from "lucide-react";
import type { AdaptiveTimeoutStatus } from "@/lib/types";

interface AdaptiveTimeoutEndpointCardProps {
  ep: AdaptiveTimeoutStatus;
  isSelected?: boolean;
  onSelect?: () => void;
  onQuickOverride?: () => void;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "rising") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <TrendingUp className="w-3 h-3 text-amber-400" />
        <span>Rising (+15%)</span>
      </span>
    );
  }
  if (trend === "falling") {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <TrendingDown className="w-3 h-3 text-emerald-400" />
        <span>Falling (-15%)</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.04] text-slate-400 border border-white/[0.08]">
      <Minus className="w-3 h-3 text-slate-500" />
      <span>Stable</span>
    </span>
  );
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function AdaptiveTimeoutEndpointCard({
  ep,
  isSelected,
  onSelect,
  onQuickOverride,
}: AdaptiveTimeoutEndpointCardProps) {
  const isSpike = ep.active || ep.current_p99_ms > ep.threshold_ms;
  const headroom = Math.round(ep.threshold_ms - ep.current_p99_ms);

  return (
    <div
      onClick={onSelect}
      className={`relative rounded-2xl border p-5 transition-all duration-300 cursor-pointer ${
        isSpike
          ? "bg-[#091020]/90 border-amber-500/40 shadow-[0_4px_25px_rgba(245,158,11,0.1)] hover:border-amber-500/60"
          : isSelected
            ? "bg-[#091020]/90 border-cyan-500/50 shadow-[0_4px_25px_rgba(0,240,255,0.12)]"
            : "bg-[#091020]/75 border-white/[0.08] hover:border-white/[0.18] hover:bg-[#091020]/90"
      }`}
    >
      {/* Ambient Top Glow */}
      {isSpike && (
        <div className="absolute inset-0 bg-linear-to-r from-amber-500/5 via-transparent to-transparent rounded-2xl pointer-events-none" />
      )}

      <div className="relative space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                {ep.service_name}
              </span>
              <TrendBadge trend={ep.latency_trend} />
              {isSelected && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  SELECTED IN CURVE
                </span>
              )}
            </div>
            <span className="text-sm font-bold font-mono text-white truncate block mt-1.5">
              {ep.endpoint}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSpike ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                Latency Spike Active
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Nominal
              </span>
            )}
          </div>
        </div>

        {/* Metrics Quad Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Box 1: AI Threshold */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              AI Threshold
            </span>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {formatMs(ep.threshold_ms)}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              p99 alarm trigger
            </span>
          </div>

          {/* Box 2: Enforced Timeout */}
          <div
            className={`p-3 rounded-xl border ${
              isSpike
                ? "bg-amber-950/20 border-amber-500/30"
                : "bg-black/40 border-white/[0.04]"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              Enforced Timeout
            </span>
            <div
              className={`text-base font-bold font-mono tabular-nums ${
                isSpike ? "text-amber-300" : "text-cyan-300"
              }`}
            >
              {formatMs(ep.recommended_timeout_ms)}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              SDK fail fast limit
            </span>
          </div>

          {/* Box 3: Baseline P99 */}
          <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              Baseline P99
            </span>
            <div className="text-base font-bold font-mono text-white tabular-nums">
              {formatMs(ep.baseline_p99_ms)}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              24h healthy norm
            </span>
          </div>

          {/* Box 4: Current P99 */}
          <div
            className={`p-3 rounded-xl border ${
              isSpike
                ? "bg-amber-950/20 border-amber-500/30"
                : "bg-black/40 border-white/[0.04]"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-1">
              Current P99
            </span>
            <div
              className={`text-base font-bold font-mono tabular-nums ${
                isSpike
                  ? "text-amber-400"
                  : ep.current_p99_ms > ep.baseline_p99_ms * 1.3
                    ? "text-amber-300"
                    : "text-emerald-400"
              }`}
            >
              {formatMs(ep.current_p99_ms)}
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-0.5 block">
              recent 1h window
            </span>
          </div>
        </div>

        {/* Spike Warning Alert Banner */}
        {isSpike && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300 font-mono leading-relaxed">
              Latency spike active: Recent P99 ({formatMs(ep.current_p99_ms)}) exceeds threshold ({formatMs(ep.threshold_ms)}). SDK enforces tight {formatMs(ep.recommended_timeout_ms)} timeout to prevent thread exhaustion.
            </p>
          </div>
        )}

        {/* Footer Meta Row */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              Headroom margin:{" "}
              <span className={headroom < 0 ? "text-amber-400 font-bold" : "text-slate-300"}>
                {headroom}ms
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {onQuickOverride && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickOverride();
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
              >
                <span>Calibrate Override</span>
              </button>
            )}
            <span className="text-slate-500">
              Updated: {new Date(ep.last_updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
