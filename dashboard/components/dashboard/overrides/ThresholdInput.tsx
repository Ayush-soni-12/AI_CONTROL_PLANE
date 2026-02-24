"use client";

import { Brain } from "lucide-react";

// ─── Numeric threshold input ──────────────────────────────────────────────────
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
}: {
  label: string;
  description: string;
  unit: string;
  aiDefault: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const enabled = value !== null;
  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-200 ${
        enabled
          ? "border-purple-500/40 bg-purple-500/5"
          : "border-gray-700/50 bg-gray-800/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-300">{label}</p>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-0.5">
          <span className="text-xs text-gray-500">Override</span>
          <div
            onClick={() => onChange(enabled ? null : min)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              enabled ? "bg-purple-600" : "bg-gray-700"
            }`}
          >
            <div
              className={`absolute top-0.5  w-4 h-4 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-4" : ""
              }`}
            />
          </div>
        </label>
      </div>
      {enabled && (
        <div className="flex items-center gap-3">
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
            className="w-28 bg-gray-900 border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-purple-400 transition-colors"
          />
          <span className="text-xs text-gray-400">{unit}</span>
          <span className="text-xs text-gray-600 ml-auto">
            AI default: {aiDefault}
          </span>
        </div>
      )}
      {!enabled && (
        <p className="text-xs text-gray-600 flex items-center gap-1">
          <Brain className="w-3 h-3" /> AI decides (default: {aiDefault})
        </p>
      )}
    </div>
  );
}
