"use client";

import { Clock, Trash2, Server, Brain } from "lucide-react";
import { useCancelOverride } from "@/hooks/useOverrides";
import type { Override } from "@/hooks/useOverrides";
import { ThresholdRow } from "./ThresholdRow";

// ─── Override card ────────────────────────────────────────────────────────────
export function OverrideCard({ override }: { override: Override }) {
  const { mutate: cancel, isPending } = useCancelOverride();
  const isLive = override.is_active;
  const expiresDate = new Date(override.expires_at);

  const hasAnyThreshold =
    override.cache_latency_ms !== null ||
    override.circuit_breaker_error_rate !== null ||
    override.queue_deferral_rpm !== null ||
    override.load_shedding_rpm !== null ||
    override.rate_limit_customer_rpm !== null;

  return (
    <div
      className={`relative rounded-2xl border p-5 transition-all duration-300 ${
        isLive
          ? "bg-gray-900/80 border-purple-500/30 shadow-lg shadow-purple-500/5"
          : "bg-gray-900/40 border-gray-800/50 opacity-60"
      }`}
    >
      {isLive && (
        <div className="absolute inset-0 bg-linear-to-r from-purple-600/5 to-pink-600/5 rounded-2xl pointer-events-none" />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`p-1.5 rounded-lg ${isLive ? "bg-purple-500/20" : "bg-gray-700/50"}`}
            >
              <Server
                className={`w-3.5 h-3.5 ${isLive ? "text-purple-400" : "text-gray-500"}`}
              />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-white truncate block">
                {override.service_name}
              </span>
              <span className="text-xs text-gray-400 font-mono truncate block">
                {override.endpoint}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {override.minutes_remaining}m left
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700/50 text-gray-500 border border-gray-700">
                <Clock className="w-3 h-3" />
                Expired
              </span>
            )}
            {isLive && (
              <button
                onClick={() => cancel(override.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 disabled:opacity-40"
                title="Cancel override"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reason */}
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          {override.reason}
        </p>

        {/* Threshold values */}
        {hasAnyThreshold ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-3 py-2 divide-y divide-gray-800/50">
            <ThresholdRow
              label="Cache Latency"
              value={override.cache_latency_ms}
              unit="ms"
              description="threshold"
            />
            <ThresholdRow
              label="Circuit Breaker"
              value={override.circuit_breaker_error_rate}
              unit=""
              description="error rate"
            />
            <ThresholdRow
              label="Queue Deferral"
              value={override.queue_deferral_rpm}
              unit=" rpm"
              description="trigger"
            />
            <ThresholdRow
              label="Load Shedding"
              value={override.load_shedding_rpm}
              unit=" rpm"
              description="trigger"
            />
            <ThresholdRow
              label="Rate Limit/Customer"
              value={override.rate_limit_customer_rpm}
              unit=" rpm"
              description="per customer"
            />
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">
            No thresholds set — AI decides everything
          </p>
        )}

        {/* Unset thresholds note */}
        {hasAnyThreshold && (
          <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
            <Brain className="w-3 h-3" />
            Unset thresholds are still AI-controlled
          </p>
        )}

        <p className="text-xs text-gray-600 mt-2">
          Expires: {expiresDate.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
