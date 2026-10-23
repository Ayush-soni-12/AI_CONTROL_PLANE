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
          ? "border-[#3f3f46] bg-[#141417]"
          : "border-[#27272a] bg-[#111113] hover:border-[#3f3f46]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <div className="flex items-center gap-1.5">
            <Sliders className={`w-3.5 h-3.5 ${enabled ? "text-[#fafafa]" : "text-[#71717a]"}`} />
            <p className="text-xs font-mono font-semibold text-slate-200">{label}</p>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{description}</p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5 select-none">
          <span className={`text-[10px] font-mono font-semibold ${enabled ? "text-[#22c55e]" : "text-[#71717a]"}`}>
            {enabled ? "ACTIVE" : "AI AUTO"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onChange(enabled ? null : min)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border ${
              enabled
                ? "bg-[#22c55e] border-[#22c55e]"
                : "bg-[#27272a] border-[#3f3f46]"
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 shadow-sm ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </div>

      {enabled ? (
        <div className="flex items-center gap-2.5 pt-2.5 border-t border-[#27272a] animate-in fade-in duration-200">
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
              className="w-32 bg-[#18181b] border border-[#27272a] focus:border-[#3f3f46] rounded-lg px-2.5 py-1.5 text-xs text-[#fafafa] font-mono focus:outline-none transition-colors"
            />
          </div>
          <span className="text-xs font-mono text-slate-300 font-semibold">{unit}</span>
          <span className="text-[10px] font-mono text-[#71717a] ml-auto">
            AI Default: <span className="text-slate-400">{aiDefault}</span>
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#71717a] pt-1">
          <Brain className="w-3 h-3 text-slate-400" />
          <span>NeuralControl AI dynamic limit (nominal: {aiDefault})</span>
        </div>
      )}
    </div>
  );
}
