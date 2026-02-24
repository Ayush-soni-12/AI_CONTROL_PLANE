// ─── Threshold row in the override card ──────────────────────────────────────
export function ThresholdRow({
  label,
  value,
  unit,
  description,
}: {
  label: string;
  value: number | null;
  unit: string;
  description: string;
}) {
  if (value === null) return null;
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-purple-300 font-mono">
          {value}
          {unit}
        </span>
        <span className="text-xs text-gray-600">{description}</span>
      </div>
    </div>
  );
}
