"use client";

import { useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";
import { useCreateOverride } from "@/hooks/useOverrides";
import type { CreateOverridePayload } from "@/hooks/useOverrides";
import { ThresholdInput } from "./ThresholdInput";

// ─── Create form ─────────────────────────────────────────────────────────────
export function CreateOverrideForm({ onClose }: { onClose: () => void }) {
  const { mutate: create, isPending, error } = useCreateOverride();

  const [form, setForm] = useState<CreateOverridePayload>({
    service_name: "",
    endpoint: "",
    duration_minutes: 30,
    reason: "",
    cache_latency_ms: null,
    circuit_breaker_error_rate: null,
    queue_deferral_rpm: null,
    load_shedding_rpm: null,
    rate_limit_customer_rpm: null,
  });

  const set = (key: keyof CreateOverridePayload, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.service_name || !form.endpoint || !form.reason) return;
    create(form, { onSuccess: onClose });
  };

  const hasAnyThreshold =
    form.cache_latency_ms !== null ||
    form.circuit_breaker_error_rate !== null ||
    form.queue_deferral_rpm !== null ||
    form.load_shedding_rpm !== null ||
    form.rate_limit_customer_rpm !== null;

  return (
    <div className="relative rounded-2xl bg-gray-900/95 border border-purple-500/30 p-6 shadow-2xl shadow-purple-500/10">
      <div className="absolute inset-0 bg-linear-to-r from-purple-600/5 to-pink-600/5 rounded-2xl pointer-events-none" />

      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Create Threshold Override
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Override specific thresholds — AI still runs for anything you
              don&apos;t set
            </p>
          </div>
        </div>

        {/* Service & Endpoint */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">
              Service Name
            </label>
            <input
              value={form.service_name}
              onChange={(e) => set("service_name", e.target.value)}
              placeholder="demo-service"
              className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-400 mb-1.5 block">
              Endpoint
            </label>
            <input
              value={form.endpoint}
              onChange={(e) => set("endpoint", e.target.value)}
              placeholder="/api/products"
              className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">
            Reason
          </label>
          <input
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="Traffic spike incoming, lowering cache threshold"
            className="w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 block">
            Duration:{" "}
            <span className="text-purple-400 font-semibold">
              {form.duration_minutes} min
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={480}
            value={form.duration_minutes}
            onChange={(e) => set("duration_minutes", Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700 accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 min</span>
            <span>1 hr</span>
            <span>4 hr</span>
            <span>8 hr</span>
          </div>
        </div>

        {/* Threshold inputs */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-2 block">
            Threshold Overrides{" "}
            <span className="text-gray-600 font-normal">
              — toggle each one to set your value
            </span>
          </label>
          <div className="space-y-2">
            <ThresholdInput
              label="Cache Latency Threshold"
              description="Enable caching when avg latency exceeds this"
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
              description="Open circuit breaker when error rate exceeds this"
              unit=" (0–1)"
              aiDefault="0.3"
              value={form.circuit_breaker_error_rate ?? null}
              onChange={(v) => set("circuit_breaker_error_rate", v)}
              min={0.01}
              max={1.0}
              step={0.01}
            />
            <ThresholdInput
              label="Queue Deferral RPM"
              description="Defer requests to queue when global RPM exceeds this"
              unit=" req/min"
              aiDefault="80 rpm"
              value={form.queue_deferral_rpm ?? null}
              onChange={(v) => set("queue_deferral_rpm", v)}
              min={1}
              max={10000}
              step={5}
            />
            <ThresholdInput
              label="Load Shedding RPM"
              description="Shed load when global RPM exceeds this"
              unit=" req/min"
              aiDefault="150 rpm"
              value={form.load_shedding_rpm ?? null}
              onChange={(v) => set("load_shedding_rpm", v)}
              min={1}
              max={10000}
              step={5}
            />
            <ThresholdInput
              label="Rate Limit per Customer"
              description="Rate-limit a single customer above this RPM"
              unit=" req/min"
              aiDefault="15 rpm"
              value={form.rate_limit_customer_rpm ?? null}
              onChange={(v) => set("rate_limit_customer_rpm", v)}
              min={1}
              max={1000}
              step={1}
            />
          </div>
        </div>

        {!hasAnyThreshold && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">
              No thresholds set — this override won&apos;t change any AI
              decisions. Enable at least one threshold above.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error.message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={
              isPending || !form.service_name || !form.endpoint || !form.reason
            }
            className="flex-1 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-purple-500/20"
          >
            {isPending ? "Creating…" : "Create Override"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
