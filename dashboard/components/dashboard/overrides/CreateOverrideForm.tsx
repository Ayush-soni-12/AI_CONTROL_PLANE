"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  AlertTriangle,
  Clock,
  Zap,
  Server,
  Sparkles,
  Sliders,
  Check,
  X,
} from "lucide-react";
import { useCreateOverride } from "@/hooks/useOverrides";
import { useServices } from "@/hooks/useSignals";
import { useFlagServices } from "@/hooks/useFlags";
import type { CreateOverridePayload } from "@/lib/types";
import { ThresholdInput } from "./ThresholdInput";

const DURATION_PRESETS = [
  { label: "15m", minutes: 15, desc: "Quick test" },
  { label: "30m", minutes: 30, desc: "Standard" },
  { label: "1h", minutes: 60, desc: "Short deploy" },
  { label: "6h", minutes: 360, desc: "Extended" },
  { label: "24h", minutes: 1440, desc: "Day long" },
];

const MULTIPLIER_PRESETS = [
  { label: "2x Surge", multiplier: 2, desc: "Moderate traffic jump" },
  { label: "5x Spike", multiplier: 5, desc: "High concurrency burst" },
  { label: "10x Flash Sale", multiplier: 10, desc: "Emergency headroom" },
];

interface CreateOverrideFormProps {
  onClose: () => void;
  defaultService?: string;
}

export function CreateOverrideForm({ onClose, defaultService = "demo-service" }: CreateOverrideFormProps) {
  const { mutate: create, isPending, error } = useCreateOverride();
  const { data: servicesData } = useServices();
  const { services: flagServices } = useFlagServices();

  const [form, setForm] = useState<CreateOverridePayload>({
    service_name: defaultService,
    endpoint: "/api/products",
    duration_minutes: 30,
    reason: "",
    cache_latency_ms: null,
    circuit_breaker_error_rate: null,
    queue_deferral_rpm: null,
    load_shedding_rpm: null,
    rate_limit_customer_rpm: null,
    adaptive_timeout_latency_ms: null,
  });

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const availableServices = Array.from(
    new Set([
      "demo-service",
      ...(flagServices || []),
      ...(servicesData?.services?.map((s) => s.name) || []),
    ].filter(Boolean))
  );

  const set = (key: keyof CreateOverridePayload, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const applyMultiplier = (mult: number) => {
    const baseCustomerRate = 15;
    const baseQueueDeferral = 80;
    const baseLoadShedding = 150;

    setForm((f) => ({
      ...f,
      rate_limit_customer_rpm: baseCustomerRate * mult,
      queue_deferral_rpm: baseQueueDeferral * mult,
      load_shedding_rpm: baseLoadShedding * mult,
      reason: f.reason || `Traffic multiplier preset applied (${mult}x scaling headroom)`,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.service_name.trim() || !form.endpoint.trim() || !form.reason.trim()) return;
    create(form, { onSuccess: onClose });
  };

  const hasAnyThreshold =
    form.cache_latency_ms !== null ||
    form.circuit_breaker_error_rate !== null ||
    form.queue_deferral_rpm !== null ||
    form.load_shedding_rpm !== null ||
    form.rate_limit_customer_rpm !== null ||
    form.adaptive_timeout_latency_ms !== null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#091020]/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-hidden"
      >
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-linear-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-start justify-between gap-4 p-5 sm:p-6 pb-4 border-b border-white/[0.08] shrink-0 bg-[#091020]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  OVERRIDE CONFIG
                </span>
                <span className="text-xs text-slate-400 font-mono">Manual Guardrail</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                Create Threshold Override
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
            title="Close dialog (Escape)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form id="create-override-form" onSubmit={handleSubmit} className="relative p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Service & Endpoint Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Service</span>
              </label>
              <div className="relative">
                <input
                  list="services-datalist"
                  value={form.service_name}
                  onChange={(e) => set("service_name", e.target.value)}
                  placeholder="demo-service"
                  className="w-full bg-black/60 border border-white/[0.12] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
                  required
                />
                <datalist id="services-datalist">
                  {availableServices.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>Target Endpoint URI</span>
              </label>
              <input
                value={form.endpoint}
                onChange={(e) => set("endpoint", e.target.value)}
                placeholder="/api/products"
                className="w-full bg-black/60 border border-white/[0.12] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
                required
              />
            </div>
          </div>

          {/* Operational Reason */}
          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 mb-1.5 block">
              Operational Reason (Audit Trail)
            </label>
            <input
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="e.g. Marketing flash sale traffic burst or maintenance guardrail"
              className="w-full bg-black/60 border border-white/[0.12] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
              required
            />
          </div>

          {/* Duration Presets & Slider */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Override Duration (TTL)</span>
              </label>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 tabular-nums">
                {form.duration_minutes >= 60
                  ? `${(form.duration_minutes / 60).toFixed(form.duration_minutes % 60 === 0 ? 0 : 1)} hours (${form.duration_minutes}m)`
                  : `${form.duration_minutes} minutes`}
              </span>
            </div>

            {/* Quick Duration Pills */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {DURATION_PRESETS.map((p) => {
                const selected = form.duration_minutes === p.minutes;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set("duration_minutes", p.minutes)}
                    className={`py-1.5 px-1 sm:px-2 rounded-lg text-[11px] sm:text-xs font-mono font-semibold transition-all border text-center ${
                      selected
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:border-white/[0.15] hover:text-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={1}
              max={1440}
              value={form.duration_minutes}
              onChange={(e) => set("duration_minutes", Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-800 accent-cyan-400"
            />
          </div>

          {/* Rate Limit Multiplier Presets */}
          <div className="p-4 rounded-xl bg-purple-950/15 border border-purple-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Rapid Rate Limit Multipliers</span>
              </div>
              <span className="text-[10px] font-mono text-purple-400">Quick presets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MULTIPLIER_PRESETS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => applyMultiplier(m.multiplier)}
                  className="py-2 px-3 rounded-lg text-xs font-mono font-semibold bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 transition-all flex flex-col items-center justify-center text-center gap-0.5"
                >
                  <span>{m.label}</span>
                  <span className="text-[10px] font-normal text-purple-400/80">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Inputs Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Threshold Parameter Overrides</span>
              </label>
              <span className="text-[10px] font-mono text-slate-500">
                Toggle active to override AI default
              </span>
            </div>

            <div className="space-y-2.5">
              <ThresholdInput
                label="Cache Latency Threshold"
                description="Trigger Redis edge caching when average latency exceeds this value"
                unit="ms"
                aiDefault="500ms"
                value={form.cache_latency_ms ?? null}
                onChange={(v) => set("cache_latency_ms", v)}
                min={50}
                max={30000}
                step={50}
              />
              <ThresholdInput
                label="Circuit Breaker Error Rate"
                description="Trip circuit breaker when upstream error rate exceeds this threshold"
                unit=" ratio (0 to 1)"
                aiDefault="0.30 (30%)"
                value={form.circuit_breaker_error_rate ?? null}
                onChange={(v) => set("circuit_breaker_error_rate", v)}
                min={0.05}
                max={1.0}
                step={0.05}
              />
              <ThresholdInput
                label="Queue Deferral RPM"
                description="Defer non critical background requests to queue when total traffic exceeds this rate"
                unit=" req/min"
                aiDefault="80 rpm"
                value={form.queue_deferral_rpm ?? null}
                onChange={(v) => set("queue_deferral_rpm", v)}
                min={1}
                max={20000}
                step={5}
              />
              <ThresholdInput
                label="Load Shedding RPM"
                description="Shed inbound requests with 503 Overloaded when global load exceeds this limit"
                unit=" req/min"
                aiDefault="150 rpm"
                value={form.load_shedding_rpm ?? null}
                onChange={(v) => set("load_shedding_rpm", v)}
                min={1}
                max={20000}
                step={5}
              />
              <ThresholdInput
                label="Customer Rate Limit"
                description="Rate limit individual customer tenant tokens when customer traffic exceeds this rate"
                unit=" req/min"
                aiDefault="15 rpm"
                value={form.rate_limit_customer_rpm ?? null}
                onChange={(v) => set("rate_limit_customer_rpm", v)}
                min={1}
                max={5000}
                step={1}
              />
              <ThresholdInput
                label="Adaptive Timeout Spike Threshold"
                description="Set custom P99 latency threshold for adaptive client timeouts"
                unit="ms"
                aiDefault="2000ms"
                value={form.adaptive_timeout_latency_ms ?? null}
                onChange={(v) => set("adaptive_timeout_latency_ms", v)}
                min={200}
                max={30000}
                step={100}
              />
            </div>
          </div>

          {!hasAnyThreshold && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/90 font-mono">
                No specific thresholds activated. The override will track the window while AI engine maintains default baseline calculations.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
              {error.message}
            </p>
          )}
        </form>

        {/* Modal Sticky Footer */}
        <div className="relative p-4 sm:p-5 pt-3 border-t border-white/[0.08] bg-[#070b16]/95 shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl border border-white/[0.1] text-slate-300 hover:text-white hover:bg-white/[0.05] text-xs font-mono font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-override-form"
            disabled={isPending || !form.service_name.trim() || !form.endpoint.trim() || !form.reason.trim()}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <span>Creating Override...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Enforce Override</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
