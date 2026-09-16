"use client";

import { useState } from "react";
import { Incident } from "@/hooks/useIncidents";
import { Shield, Zap, X, AlertTriangle, Check } from "lucide-react";
import { useCreateOverride } from "@/hooks/useOverrides";

interface QuickOverrideModalProps {
  incident: Incident;
  onClose: () => void;
}

export function QuickOverrideModal({ incident, onClose }: QuickOverrideModalProps) {
  const { mutate: createOverride, isPending, isSuccess } = useCreateOverride();

  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState(
    `Emergency mitigation for Incident #${incident.id}: ${incident.title}`
  );
  const [cacheLatencyMs, setCacheLatencyMs] = useState<number | "">(
    incident.peak_latency_ms ? Math.max(100, Math.floor(incident.peak_latency_ms * 0.7)) : 200
  );
  const [circuitBreakerErrorRate, setCircuitBreakerErrorRate] = useState<number | "">(
    incident.peak_error_rate ? Math.min(0.5, Math.max(0.05, incident.peak_error_rate * 1.5)) : 0.25
  );
  const [queueDeferralRpm, setQueueDeferralRpm] = useState<number | "">("");

  const handleApply = () => {
    createOverride(
      {
        service_name: incident.service_name,
        endpoint: incident.endpoint,
        duration_minutes: durationMinutes,
        reason,
        cache_latency_ms: cacheLatencyMs === "" ? null : Number(cacheLatencyMs),
        circuit_breaker_error_rate:
          circuitBreakerErrorRate === "" ? null : Number(circuitBreakerErrorRate),
        queue_deferral_rpm: queueDeferralRpm === "" ? null : Number(queueDeferralRpm),
        load_shedding_rpm: null,
        rate_limit_customer_rpm: null,
        adaptive_timeout_latency_ms: null,
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            onClose();
          }, 800);
        },
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#091020]/95 border border-cyan-500/30 p-6 shadow-[0_0_50px_rgba(0,240,255,0.15)] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold font-mono text-slate-100">
                Apply Emergency Override
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Target: <span className="text-cyan-400">{incident.service_name}</span>
                <span className="text-slate-500 ml-1">{incident.endpoint}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Mitigation Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Cache Latency Trigger (ms)
              </label>
              <input
                type="number"
                value={cacheLatencyMs}
                onChange={(e) =>
                  setCacheLatencyMs(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="200"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Circuit Breaker Max Error Rate
              </label>
              <input
                type="number"
                step="0.05"
                value={circuitBreakerErrorRate}
                onChange={(e) =>
                  setCircuitBreakerErrorRate(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="0.25"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Queue Deferral (RPM)
              </label>
              <input
                type="number"
                value={queueDeferralRpm}
                onChange={(e) =>
                  setQueueDeferralRpm(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Optional"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Duration (minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed font-mono">
              Emergency threshold overrides take precedence over autonomous baseline models and will auto expire after the selected TTL duration.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-mono text-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={isPending || isSuccess}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50"
          >
            {isPending ? (
              "Applying Override..."
            ) : isSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Override Applied!
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Apply Override Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
