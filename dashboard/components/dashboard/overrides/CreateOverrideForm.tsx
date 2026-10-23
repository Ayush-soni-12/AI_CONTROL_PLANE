/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Clock,
  Zap,
  Server,
  Sliders,
  Check,
  X,
  AlertTriangle,
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
  defaultEndpoint?: string;
  defaultAdaptiveTimeout?: number | null;
  defaultReason?: string;
}

export function CreateOverrideForm({
  onClose,
  defaultService = "",
  defaultEndpoint = "",
  defaultAdaptiveTimeout = null,
  defaultReason = "",
}: CreateOverrideFormProps) {
  const { mutate: create, isPending, error } = useCreateOverride();
  const { data: servicesData } = useServices();
  const { services: flagServices } = useFlagServices();

  const availableServices = useMemo(() => {
    const set = new Set<string>();
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    flagServices?.forEach((s) => {
      if (s && s.trim()) set.add(s.trim());
    });
    return Array.from(set);
  }, [servicesData, flagServices]);

  const initialService = useMemo(() => {
    if (defaultService && defaultService.trim()) return defaultService.trim();
    return availableServices[0] || "";
  }, [defaultService, availableServices]);

  const [form, setForm] = useState<CreateOverridePayload>({
    service_name: defaultService?.trim() || initialService,
    endpoint: defaultEndpoint?.trim() || "",
    duration_minutes: 30,
    reason: defaultReason,
    cache_latency_ms: null,
    circuit_breaker_error_rate: null,
    queue_deferral_rpm: null,
    load_shedding_rpm: null,
    rate_limit_customer_rpm: null,
    adaptive_timeout_latency_ms: defaultAdaptiveTimeout,
  });

  // Keep form.service_name in sync if initially empty
  useEffect(() => {
    if (!form.service_name && initialService) {
      setForm((f) => ({ ...f, service_name: initialService }));
    }
  }, [initialService, form.service_name]);

  // Available endpoints based on selected service
  const availableEndpoints = useMemo(() => {
    const sObj = servicesData?.services?.find(
      (s) => s.name.toLowerCase() === form.service_name.trim().toLowerCase()
    );
    if (sObj?.endpoints && sObj.endpoints.length > 0) {
      return sObj.endpoints.map((e) => e.path).filter(Boolean);
    }
    return [];
  }, [servicesData, form.service_name]);

  // Auto-fill endpoint if empty and service has endpoints
  useEffect(() => {
    if (!form.endpoint && availableEndpoints.length > 0) {
      setForm((f) => ({ ...f, endpoint: availableEndpoints[0] }));
    }
  }, [availableEndpoints, form.endpoint]);

  const handleServiceChange = (newService: string) => {
    const sObj = servicesData?.services?.find(
      (s) => s.name.toLowerCase() === newService.trim().toLowerCase()
    );
    const eps = sObj?.endpoints?.map((e) => e.path).filter(Boolean) || [];
    setForm((f) => ({
      ...f,
      service_name: newService,
      endpoint: eps.length > 0 ? eps[0] : "",
    }));
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-xl bg-[#111113] border border-[#27272a] shadow-2xl overflow-hidden text-[#fafafa]"
      >
        {/* Modal Header */}
        <div className="relative flex items-center justify-between gap-4 p-5 pb-4 border-b border-[#27272a] shrink-0 bg-[#111113]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-white/10 text-white border border-white/15">
                  OVERRIDE CONFIG
                </span>
                <span className="text-xs text-slate-400 font-mono">Manual Guardrail</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold font-mono text-[#fafafa] mt-0.5">
                Create Threshold Override
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] flex items-center justify-center text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
            title="Close dialog (Escape)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="create-override-form"
          onSubmit={handleSubmit}
          className="relative p-5 overflow-y-auto space-y-4 flex-1 text-xs font-mono"
        >
          {/* Target Service & Endpoint Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-mono font-medium text-[#fafafa] mb-1.5 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Microservice <span className="text-[#22c55e]">*</span></span>
              </label>
              {availableServices.length > 0 ? (
                <select
                  value={form.service_name}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3f3f46] rounded-lg px-3 py-2 text-xs text-[#fafafa] font-mono focus:outline-none transition-colors cursor-pointer"
                  required
                >
                  <option value="" disabled>Select microservice</option>
                  {availableServices.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.service_name}
                  onChange={(e) => set("service_name", e.target.value)}
                  placeholder="e.g. payment-service"
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3f3f46] rounded-lg px-3 py-2 text-xs text-[#fafafa] font-mono placeholder-[#71717a] focus:outline-none transition-colors"
                  required
                />
              )}
            </div>

            <div>
              <label className="text-xs font-mono font-medium text-[#fafafa] mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Endpoint URI <span className="text-[#22c55e]">*</span></span>
              </label>
              <div className="relative">
                <input
                  list="endpoints-datalist"
                  value={form.endpoint}
                  onChange={(e) => set("endpoint", e.target.value)}
                  placeholder={availableEndpoints[0] || "/api/v1/resource"}
                  className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3f3f46] rounded-lg px-3 py-2 text-xs text-[#fafafa] font-mono placeholder-[#71717a] focus:outline-none transition-colors"
                  required
                />
                <datalist id="endpoints-datalist">
                  {availableEndpoints.map((ep) => (
                    <option key={ep} value={ep} />
                  ))}
                </datalist>
              </div>
              {availableEndpoints.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] text-[#71717a]">Presets:</span>
                  {availableEndpoints.slice(0, 3).map((ep) => (
                    <button
                      key={ep}
                      type="button"
                      onClick={() => set("endpoint", ep)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors border cursor-pointer ${
                        form.endpoint === ep
                          ? "bg-[#fafafa] text-[#09090b] border-[#fafafa]"
                          : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]"
                      }`}
                    >
                      {ep}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Operational Reason */}
          <div>
            <label className="text-xs font-mono font-medium text-[#fafafa] mb-1.5 block">
              Operational Reason (Audit Trail) <span className="text-[#22c55e]">*</span>
            </label>
            <input
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="e.g. Marketing flash sale traffic burst or maintenance guardrail"
              className="w-full bg-[#18181b] border border-[#27272a] focus:border-[#3f3f46] rounded-lg px-3 py-2 text-xs text-[#fafafa] font-mono placeholder-[#71717a] focus:outline-none transition-colors"
              required
            />
          </div>

          {/* Duration Presets & Slider */}
          <div className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-[#fafafa] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Override Duration (TTL)</span>
              </label>
              <span className="text-xs font-mono font-semibold text-[#22c55e] bg-[#18181b] px-2 py-0.5 rounded border border-[#27272a] tabular-nums">
                {form.duration_minutes >= 60
                  ? `${(form.duration_minutes / 60).toFixed(form.duration_minutes % 60 === 0 ? 0 : 1)}h (${form.duration_minutes}m)`
                  : `${form.duration_minutes} minutes`}
              </span>
            </div>

            {/* Quick Duration Pills */}
            <div className="grid grid-cols-5 gap-1.5">
              {DURATION_PRESETS.map((p) => {
                const selected = form.duration_minutes === p.minutes;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set("duration_minutes", p.minutes)}
                    className={`py-1.5 px-1 rounded-md text-[11px] font-mono font-medium transition-colors border text-center cursor-pointer ${
                      selected
                        ? "bg-[#fafafa] text-[#09090b] border-[#fafafa]"
                        : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:border-[#3f3f46] hover:text-[#fafafa]"
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
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#27272a] accent-[#22c55e]"
            />
          </div>

          {/* Rate Limit Multiplier Presets */}
          <div className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#fafafa]">
                <Zap className="w-3.5 h-3.5 text-[#22c55e]" />
                <span>Rapid Rate Limit Multipliers</span>
              </div>
              <span className="text-[10px] text-[#71717a]">Quick presets</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MULTIPLIER_PRESETS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => applyMultiplier(m.multiplier)}
                  className="py-2 px-3 rounded-lg text-xs font-mono bg-[#18181b] hover:bg-[#202024] text-slate-200 border border-[#27272a] hover:border-[#3f3f46] transition-colors flex flex-col items-center justify-center text-center gap-0.5 cursor-pointer"
                >
                  <span className="font-semibold text-[#fafafa]">{m.label}</span>
                  <span className="text-[10px] text-[#71717a]">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Inputs Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-[#fafafa] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <span>Threshold Parameter Overrides</span>
              </label>
              <span className="text-[10px] text-[#71717a]">
                Toggle active to override AI baseline
              </span>
            </div>

            <div className="space-y-2">
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
                description="Defer non-critical background requests to queue when traffic exceeds this rate"
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
                description="Rate limit individual tenant tokens when customer traffic exceeds this rate"
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
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#18181b] border border-[#27272a]">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 font-mono">
                No individual thresholds toggled active. The override will enforce TTL tracking while the AI engine maintains nominal baseline calculations.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
              {error.message}
            </p>
          )}
        </form>

        {/* Modal Sticky Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#111113] shrink-0 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-mono transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-override-form"
            disabled={isPending || !form.service_name.trim() || !form.endpoint.trim() || !form.reason.trim()}
            className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] disabled:opacity-40 disabled:cursor-not-allowed text-[#09090b] text-xs font-mono font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <span>Enforcing...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-2" />
                <span>Enforce Override</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
