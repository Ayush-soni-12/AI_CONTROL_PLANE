"use client";

import { Brain, Sliders } from "lucide-react";

interface ThresholdInputProps {
  label: string;
  description: string;
  unit: string;
  aiDefault: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
}

export function ThresholdInput({
  label,
  description,
  unit,
  aiDefault,
  value,
  onChange,
  min,
  max,
  step,
}: ThresholdInputProps) {
  const enabled = value !== null;

  return (
    <div
      className={`rounded-xl border p-3.5 transition-all duration-200 ${
        enabled
          ? "border-cyan-500/40 bg-cyan-950/20 shadow-[0_0_15px_rgba(0,240,255,0.08)]"
          : "border-white/[0.06] bg-black/40 hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sliders className={`w-3.5 h-3.5 ${enabled ? "text-cyan-400" : "text-slate-500"}`} />
            <p className="text-xs font-mono font-semibold text-slate-200">{label}</p>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{description}</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5 select-none">
          <span className={`text-[10px] font-mono ${enabled ? "text-cyan-300 font-bold" : "text-slate-500"}`}>
            {enabled ? "ACTIVE" : "AI AUTO"}
          </span>
          <div
            onClick={() => onChange(enabled ? null : min)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border ${
              enabled
                ? "bg-cyan-500/30 border-cyan-500/60 shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                : "bg-slate-800 border-white/[0.1]"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                enabled ? "translate-x-4 bg-cyan-300 shadow-[0_0_8px_#00f0ff]" : "bg-slate-500"
              }`}
            />
          </div>
        </label>
      </div>

      {enabled ? (
        <div className="flex items-center gap-2.5 pt-2 border-t border-cyan-500/20 animate-in fade-in duration-200">
          <div className="relative">
            <input
              type="number"
              min={min}
              max={max}
              step={step ?? 1}
              value={value ?? ""}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onChange(isNaN(v) ? min : v);
              }}
              className="w-32 bg-black/60 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] transition-all"
            />
          </div>
          <span className="text-xs font-mono text-cyan-300 font-semibold">{unit}</span>
          <span className="text-[10px] font-mono text-slate-500 ml-auto">
            AI Default: <span className="text-slate-400">{aiDefault}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 pt-1">
          <Brain className="w-3 h-3 text-purple-400" />
          <span>NeuralControl AI calculates dynamically (default: {aiDefault})</span>
        </div>
      )}
    </div>
  );
}
