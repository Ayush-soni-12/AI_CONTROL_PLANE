"use client";

import { useState } from "react";
import { Sliders, Shield, Zap, Sparkles, Check, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import type { AdaptiveTimeoutStatus } from "@/lib/types";

export interface JitterCalibrationState {
  multiplier: number;
  minClampMs: number;
  maxClampMs: number;
}

const JITTER_PRESETS = [
  {
    name: "Aggressive Fail Fast",
    multiplier: 1.0,
    minClamp: 150,
    maxClamp: 1500,
    desc: "Strict latency cutoff for synchronous low latency endpoints",
    color: "cyan",
  },
  {
    name: "Nominal Balanced",
    multiplier: 1.5,
    minClamp: 200,
    maxClamp: 3000,
    desc: "Standard AI baseline with moderate variance tolerance",
    color: "emerald",
  },
  {
    name: "High Variance Buffer",
    multiplier: 2.5,
    minClamp: 500,
    maxClamp: 8000,
    desc: "Wide headroom buffer for variable third party APIs",
    color: "purple",
  },
  {
    name: "Deep Batch Protection",
    multiplier: 3.0,
    minClamp: 1000,
    maxClamp: 15000,
    desc: "Relaxed threshold for long running asynchronous pipelines",
    color: "amber",
  },
];

interface JitterBufferCalibratorProps {
  calibration: JitterCalibrationState;
  onChange: (cal: JitterCalibrationState) => void;
  selectedEndpoint?: AdaptiveTimeoutStatus | null;
  onApplyOverride?: (timeoutMs: number) => void;
}

export function JitterBufferCalibrator({
  calibration,
  onChange,
  selectedEndpoint,
  onApplyOverride,
}: JitterBufferCalibratorProps) {
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const baselineP99 = selectedEndpoint?.baseline_p99_ms || 650;
  const rawTarget = Math.round(baselineP99 * calibration.multiplier);
  const clampedTarget = Math.min(
    calibration.maxClampMs,
    Math.max(calibration.minClampMs, rawTarget)
  );

  const applyPreset = (preset: typeof JITTER_PRESETS[0]) => {
    onChange({
      multiplier: preset.multiplier,
      minClampMs: preset.minClamp,
      maxClampMs: preset.maxClamp,
    });
    setAppliedNotice(`Preset applied: ${preset.name}`);
    setTimeout(() => setAppliedNotice(null), 3000);
  };

  return (
    <div className="rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-purple-500/30 p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                JITTER CALIBRATOR
              </span>
              <span className="text-xs text-slate-400 font-mono">Dynamic Dampening Controls</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-0.5">
              Sliding Jitter Buffer & Backpressure Clamps
            </h3>
          </div>
        </div>

        {appliedNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold animate-in fade-in duration-200">
            <Check className="w-3.5 h-3.5" />
            <span>{appliedNotice}</span>
          </div>
        )}
      </div>

      {/* Rapid Preset Jump Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Rapid Workload Presets</span>
          </label>
          <span className="text-[10px] font-mono text-slate-500">Click to jump calibration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {JITTER_PRESETS.map((p) => {
            const isSelected =
              Math.abs(calibration.multiplier - p.multiplier) < 0.05 &&
              calibration.maxClampMs === p.maxClamp;

            return (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-black/30 border-white/[0.06] hover:border-white/[0.15] hover:bg-black/50"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-slate-200">{p.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {p.multiplier.toFixed(1)}x
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400 leading-snug line-clamp-2">
                    {p.desc}
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2">
                  Clamp: {p.minClamp}ms to {p.maxClamp}ms
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calibration Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Control 1: Jitter Multiplier Slider */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Jitter Multiplier</span>
            </label>
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 tabular-nums">
              {calibration.multiplier.toFixed(1)}x
            </span>
          </div>

          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={calibration.multiplier}
            onChange={(e) =>
              onChange({
                ...calibration,
                multiplier: parseFloat(e.target.value),
              })
            }
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-slate-800 accent-cyan-400"
          />

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>1.0x (Tighter)</span>
            <span>2.0x (Standard)</span>
            <span>3.0x (Relaxed)</span>
          </div>
        </div>

        {/* Control 2: Minimum Floor Clamp */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Min Floor Clamp</span>
            </label>
            <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 tabular-nums">
              {calibration.minClampMs}ms
            </span>
          </div>

          <input
            type="number"
            min={50}
            max={2000}
            step={50}
            value={calibration.minClampMs}
            onChange={(e) =>
              onChange({
                ...calibration,
                minClampMs: Math.max(50, parseInt(e.target.value) || 50),
              })
            }
            className="w-full bg-black/60 border border-white/[0.12] focus:border-emerald-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none transition-all"
          />

          <p className="text-[10px] font-mono text-slate-500">
            Prevents false timeouts when healthy latency drops very low
          </p>
        </div>

        {/* Control 3: Maximum Ceiling Clamp */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-rose-400" />
              <span>Max Ceiling Clamp</span>
            </label>
            <span className="text-xs font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 tabular-nums">
              {calibration.maxClampMs}ms
            </span>
          </div>

          <input
            type="number"
            min={1000}
            max={30000}
            step={250}
            value={calibration.maxClampMs}
            onChange={(e) =>
              onChange({
                ...calibration,
                maxClampMs: Math.max(1000, parseInt(e.target.value) || 1000),
              })
            }
            className="w-full bg-black/60 border border-white/[0.12] focus:border-rose-400 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none transition-all"
          />

          <p className="text-[10px] font-mono text-slate-500">
            Hard upper limit to prevent connection pool exhaustion
          </p>
        </div>
      </div>

      {/* Live Computed Calculation Preview Box */}
      <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-purple-300">
              CALIBRATED TIMEOUT EQUATION:
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              clamp(P99 × Multiplier, Min, Max)
            </span>
          </div>
          <p className="text-xs font-mono text-slate-300">
            For {selectedEndpoint ? `${selectedEndpoint.service_name} ${selectedEndpoint.endpoint}` : "selected endpoint"} (Baseline P99: {baselineP99}ms):
            {" "}
            <span className="text-slate-400">clamp({baselineP99} × {calibration.multiplier.toFixed(1)} = {rawTarget}ms)</span>
            {" "}
            <ArrowRight className="inline w-3 h-3 text-purple-400 mx-1" />
            {" "}
            <span className="text-purple-300 font-bold">{clampedTarget}ms Enforced Timeout</span>
            {rawTarget < calibration.minClampMs && (
              <span className="ml-2 text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                raised by {calibration.minClampMs}ms min floor
              </span>
            )}
            {rawTarget > calibration.maxClampMs && (
              <span className="ml-2 text-[10px] font-semibold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded">
                capped by {calibration.maxClampMs}ms max ceiling
              </span>
            )}
          </p>
        </div>

        {onApplyOverride && (
          <button
            type="button"
            onClick={() => onApplyOverride(clampedTarget)}
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-black text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 shrink-0 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Apply as Override</span>
          </button>
        )}
      </div>
    </div>
  );
}
