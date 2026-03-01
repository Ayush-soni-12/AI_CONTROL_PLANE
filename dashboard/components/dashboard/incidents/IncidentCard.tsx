import { Incident } from "@/hooks/useIncidents";

const SEVERITY_BADGE: Record<string, Record<string, string>> = {
  critical: {
    bg: "#fef2f2",
    text: "#dc2626",
    border: "#fecaca",
    label: "Critical",
  },
  warning: {
    bg: "#fffbeb",
    text: "#d97706",
    border: "#fde68a",
    label: "Warning",
  },
  info: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe", label: "Info" },
};

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "3px",
        padding: "2px 8px",
        borderRadius: "20px",
        background: color + "15",
        color: color,
        fontSize: "11px",
        fontWeight: "600",
        fontFamily: "'DM Mono', monospace",
      }}
    >
      <span style={{ opacity: 0.7, fontWeight: 400 }}>{label}</span> {value}
    </span>
  );
}

export function IncidentCard({
  incident,
  onClick,
}: {
  incident: Incident;
  onClick: () => void;
}) {
  const badge = SEVERITY_BADGE[incident.severity] || SEVERITY_BADGE.info;
  const isOpen = incident.status === "open";

  return (
    <div
      onClick={onClick}
      className={`group bg-gray-900/40 border backdrop-blur-xl rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-300 mb-3 ${
        isOpen
          ? "border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_4px_24px_-4px_rgba(245,158,11,0.15)]"
          : "border-gray-800/50 hover:border-gray-700 hover:bg-gray-800/40"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold border shrink-0 opacity-90"
              style={{
                backgroundColor: badge.bg,
                color: badge.text,
                borderColor: badge.border,
              }}
            >
              {badge.label}
            </span>
            <span
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border shrink-0 ${
                isOpen
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              }`}
            >
              {isOpen ? "🔴 Active" : "✅ Resolved"}
            </span>
            <span className="text-sm font-mono text-gray-500 truncate ml-1">
              {incident.service_name}
              <span className="opacity-60">{incident.endpoint}</span>
            </span>
          </div>
          <div className="text-lg font-bold text-gray-200 leading-snug mb-3 group-hover:text-white transition-colors">
            {incident.title}
          </div>
          <div className="flex flex-wrap gap-2">
            <MetricPill
              label="Peak time"
              value={`${incident.peak_latency_ms?.toFixed(0)}ms`}
              color="#f97316"
            />
            <MetricPill
              label="Peak failures"
              value={`${(incident.peak_error_rate * 100).toFixed(1)}%`}
              color="#ef4444"
            />
          </div>
        </div>
        <div className="shrink-0 text-left sm:text-right mt-2 sm:mt-0">
          <div className="text-2xl font-mono font-bold text-gray-200 group-hover:text-white transition-colors">
            {incident.duration_display}
          </div>
          <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">
            {fmtDate(incident.started_at)}
          </div>
          {incident.root_cause_summary && (
            <div className="mt-2 text-xs font-semibold text-cyan-400 bg-cyan-500/10 inline-block px-2 py-1 rounded-md border border-cyan-500/20">
              🤖 AI Analysis Ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
