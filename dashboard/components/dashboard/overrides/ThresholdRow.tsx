"use client";

interface ThresholdRowProps {
  label: string;
  value: number | null;
  unit: string;
  description: string;
}

export function ThresholdRow({ label, value, unit, description }: ThresholdRowProps) {
  if (value === null || value === undefined) return null;

  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/[0.04] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium text-slate-300">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">({description})</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
          {value}
          {unit}
        </span>
        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
          MANUAL
        </span>
      </div>
    </div>
  );
}
