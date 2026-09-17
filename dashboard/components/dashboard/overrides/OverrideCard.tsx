"use client";

import { Clock, Trash2, Server, Brain, Zap, ShieldAlert } from "lucide-react";
import { useCancelOverride } from "@/hooks/useOverrides";
import type { Override } from "@/lib/types";
import { ThresholdRow } from "./ThresholdRow";
import { TTLCountdownRing } from "./TTLCountdownRing";

interface OverrideCardProps {
  override: Override;
}

export function OverrideCard({ override }: OverrideCardProps) {
  const { mutate: cancel, isPending } = useCancelOverride();
  const isLive = override.is_active;
  const expiresDate = new Date(override.expires_at);
  const createdDate = new Date(override.created_at);

  const hasAnyThreshold =
    override.cache_latency_ms !== null ||
    override.circuit_breaker_error_rate !== null ||
    override.queue_deferral_rpm !== null ||
    override.load_shedding_rpm !== null ||
    override.rate_limit_customer_rpm !== null ||
    override.adaptive_timeout_latency_ms !== null;

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 ${
        isLive
          ? "bg-[#091020]/85 border-cyan-500/30 shadow-[0_4px_25px_rgba(0,240,255,0.08)] hover:border-cyan-500/50"
          : "bg-[#091020]/40 border-white/[0.06] opacity-60 hover:opacity-80"
      }`}
    >
      {/* Top Ambient Glow */}
      {isLive && (
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 via-purple-500/5 to-transparent rounded-2xl pointer-events-none" />
      )}

      <div className="relative space-y-4">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl border ${
                isLive
                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]"
                  : "bg-white/[0.04] border-white/[0.08] text-slate-500"
              }`}
            >
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-white truncate">
                  {override.service_name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    isLive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-slate-800/80 text-slate-400 border border-white/[0.08]"
                  }`}
                >
                  {isLive ? "Active Guardrail" : "Revoked"}
                </span>
              </div>
              <span className="text-xs text-cyan-300/80 font-mono truncate block mt-0.5">
                {override.endpoint}
              </span>
            </div>
          </div>

          {/* Action & Ring Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            <TTLCountdownRing
              createdAt={override.created_at}
              expiresAt={override.expires_at}
              isActive={isLive}
              size={46}
              showLabel={true}
            />

            {isLive && (
              <button
                onClick={() => cancel(override.id)}
                disabled={isPending}
                className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-200 disabled:opacity-40 hover:scale-105 active:scale-95 shrink-0"
                title="Revoke override immediately"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reason Description */}
        <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.04]">
          <p className="text-xs text-slate-300 font-mono leading-relaxed">
            <span className="text-slate-500 mr-1.5 font-semibold">REASON:</span>
            {override.reason}
          </p>
        </div>

        {/* Threshold values matrix */}
        {hasAnyThreshold ? (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Overridden Parameters</span>
            </div>
            <div className="space-y-1">
              <ThresholdRow
                label="Cache Latency"
                value={override.cache_latency_ms}
                unit="ms"
                description="trigger threshold"
              />
              <ThresholdRow
                label="Circuit Breaker"
                value={override.circuit_breaker_error_rate}
                unit=""
                description="max error rate"
              />
              <ThresholdRow
                label="Queue Deferral"
                value={override.queue_deferral_rpm}
                unit=" rpm"
                description="queue trigger"
              />
              <ThresholdRow
                label="Load Shedding"
                value={override.load_shedding_rpm}
                unit=" rpm"
                description="drop trigger"
              />
              <ThresholdRow
                label="Customer Rate Limit"
                value={override.rate_limit_customer_rpm}
                unit=" rpm"
                description="per tenant quota"
              />
              <ThresholdRow
                label="Adaptive Timeout Spike"
                value={override.adaptive_timeout_latency_ms}
                unit="ms"
                description="latency threshold"
              />
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-black/30 border border-white/[0.04] text-center">
            <p className="text-xs text-slate-500 italic font-mono">
              No specific thresholds set (AI engine operates with dynamic defaults)
            </p>
          </div>
        )}

        {/* Footer Meta Row */}
        <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-purple-400" />
            <span>Unset metrics remain under autonomous AI control</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Expires: {expiresDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
