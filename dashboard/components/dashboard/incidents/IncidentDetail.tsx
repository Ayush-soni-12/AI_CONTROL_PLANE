import { useIncidentDetail, useAnalyzeIncident } from "@/hooks/useIncidents";
import { TimelineEvent } from "./TimelineEvent";

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

function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function IncidentDetail({
  incidentId,
  onBack,
}: {
  incidentId: number;
  onBack: () => void;
}) {
  const { data: incident, isLoading } = useIncidentDetail(incidentId);
  const { mutate: analyze, isPending: isAnalyzing } = useAnalyzeIncident();

  if (isLoading || !incident) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  const badge = SEVERITY_BADGE[incident.severity] || SEVERITY_BADGE.info;
  const isOpen = incident.status === "open";

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 pb-2"
      >
        ← Back to incidents
      </button>

      {/* Incident header */}
      <div className="bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl rounded-2xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-3">
              {incident.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium border border-opacity-20"
                style={{
                  backgroundColor: badge.bg,
                  color: badge.text,
                  borderColor: badge.border,
                }}
              >
                {badge.label}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  isOpen
                    ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}
              >
                {isOpen ? "🔴 Active" : "✅ Resolved"}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {fmtDate(incident.started_at)} · {fmt(incident.started_at)}
                {incident.resolved_at && ` → ${fmt(incident.resolved_at)}`}
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-3xl font-mono font-bold text-white tracking-tight">
              {incident.duration_display}
            </div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">
              duration
            </div>
          </div>
        </div>

        {/* Peak metrics row */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Peak response time",
              value: `${incident.peak_latency_ms?.toFixed(0)}ms`,
              color: "#f97316",
            },
            {
              label: "Peak failure rate",
              value: `${(incident.peak_error_rate * 100).toFixed(1)}%`,
              color: "#ef4444",
            },
            {
              label: "Peak traffic",
              value: `${incident.peak_rpm?.toFixed(0)}/min`,
              color: "#8b5cf6",
            },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: color + "10",
                border: `1px solid ${color}25`,
                borderRadius: "10px",
                padding: "10px 16px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color,
                  fontFamily: "'DM Mono', monospace",
                }}
              >
                {value}
              </div>
              <div
                style={{ fontSize: "11px", color: "#6b7280", marginTop: "2px" }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Root Cause */}
      {incident.root_cause_summary ? (
        <div className="bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-2xl">🤖</span>
              <h3 className="text-lg font-bold text-cyan-400">
                AI Root Cause Analysis
              </h3>
              {incident.ai_confidence && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {incident.ai_confidence} confidence
                </span>
              )}
            </div>
            <button
              onClick={() => analyze(incident.id)}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl transition-colors border border-cyan-500/30 text-sm font-semibold disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Re-Analyze"}
            </button>
          </div>
          <p className="text-sm text-cyan-100/80 leading-relaxed whitespace-pre-wrap">
            {incident.root_cause_summary}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-8 mb-6 text-center flex flex-col items-center justify-center">
          <span className="text-4xl mb-3">🤖</span>
          <h3 className="text-lg font-semibold text-gray-200 mb-2">
            No AI Analysis Yet
          </h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md">
            Get an instant, plain-English summary of what caused this incident
            and what actions you should take next.
          </p>
          <button
            onClick={() => analyze(incident.id)}
            disabled={isAnalyzing}
            className="px-6 py-3 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
          >
            {isAnalyzing
              ? "Running AI Analyzer..."
              : "Generate AI Root Cause Analysis"}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Event Timeline</h3>
          <span className="text-xs text-gray-400">
            {incident.events?.length || 0} events · click any event to expand
          </span>
        </div>

        <div>
          {incident.events?.map((event, i) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={i === (incident.events?.length || 0) - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
