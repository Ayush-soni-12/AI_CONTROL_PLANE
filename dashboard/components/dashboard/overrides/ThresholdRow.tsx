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
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#18181b] hover:bg-[#202024] border border-[#27272a] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-medium text-slate-300">{label}</span>
        <span className="text-[10px] font-mono text-[#71717a]">({description})</span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs font-mono font-bold text-[#fafafa] tabular-nums">
          {value}
          {unit}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-white/10 text-white border border-white/15">
          MANUAL
        </span>
      </div>
    </div>
  );
}
