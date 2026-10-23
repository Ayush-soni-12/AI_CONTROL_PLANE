/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { Clock, Trash2, Server, Brain, Zap } from "lucide-react";
import { useCancelOverride } from "@/hooks/useOverrides";
import type { Override } from "@/lib/types";
import { ThresholdRow } from "./ThresholdRow";
import { TTLCountdownRing } from "./TTLCountdownRing";

interface OverrideCardProps {
  override: Override;
  onRevoke?: (id: number) => void;
}

export function OverrideCard({ override, onRevoke }: OverrideCardProps) {
  const { mutate: cancel, isPending } = useCancelOverride();
  const isLive = override.is_active;
  const expiresDate = new Date(override.expires_at);

  const hasAnyThreshold =
    override.cache_latency_ms !== null ||
    override.circuit_breaker_error_rate !== null ||
    override.queue_deferral_rpm !== null ||
    override.load_shedding_rpm !== null ||
    override.rate_limit_customer_rpm !== null ||
    override.adaptive_timeout_latency_ms !== null;

  const handleRevoke = () => {
    if (onRevoke) {
      onRevoke(override.id);
    } else {
      cancel(override.id);
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-5 transition-all duration-200 ${
        isLive
          ? "bg-[#0d1527] border-[#27272a] hover:border-[#3f3f46]"
          : "bg-[#111113]/60 border-[#27272a]/60 opacity-60 hover:opacity-80"
      }`}
    >
      <div className="relative space-y-4">
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-lg border ${
                isLive
                  ? "bg-[#18181b] border-[#27272a] text-[#fafafa]"
                  : "bg-[#18181b] border-[#27272a] text-[#71717a]"
              }`}
            >
              <Server className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold font-mono text-[#fafafa] truncate">
                  {override.service_name}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase ${
                    isLive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#18181b] text-[#71717a] border border-[#27272a]"
                  }`}
                >
                  {isLive ? "Active Guardrail" : "Revoked"}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono truncate block mt-0.5">
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
                onClick={handleRevoke}
                disabled={isPending}
                className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#71717a] hover:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/30 transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                title="Revoke override immediately"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reason Description */}
        <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a]">
          <p className="text-xs text-slate-300 font-mono leading-relaxed">
            <span className="text-[#71717a] mr-1.5 font-semibold">REASON:</span>
            {override.reason}
          </p>
        </div>

        {/* Threshold values matrix */}
        {hasAnyThreshold ? (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-[#22c55e]" />
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
          <div className="p-3 rounded-lg bg-[#18181b] border border-[#27272a] text-center">
            <p className="text-xs text-[#71717a] italic font-mono">
              No specific thresholds set (AI engine operates with dynamic defaults)
            </p>
          </div>
        )}

        {/* Footer Meta Row */}
        <div className="pt-2 border-t border-[#27272a] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#71717a]">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3 h-3 text-slate-400" />
            <span>Unset metrics remain under autonomous AI control</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-[#71717a]" />
            <span>Expires: {expiresDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
