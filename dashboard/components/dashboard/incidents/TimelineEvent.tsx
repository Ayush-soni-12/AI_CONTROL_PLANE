import { useState } from "react";
import { IncidentEvent } from "@/hooks/useIncidents";

// ─── Config ───────────────────────────────────────────────────────────────────
const EVENT_STYLES: Record<string, Record<string, string>> = {
  incident_opened: {
    color: "#ef4444",
    bg: "#fef2f2",
    icon: "🚨",
    line: "#ef4444",
  },
  latency_spike: {
    color: "#f97316",
    bg: "#fff7ed",
    icon: "🐢",
    line: "#f97316",
  },
  error_spike: { color: "#ef4444", bg: "#fef2f2", icon: "❗", line: "#ef4444" },
  traffic_spike: {
    color: "#8b5cf6",
    bg: "#f5f3ff",
    icon: "📈",
    line: "#8b5cf6",
  },
  cache_enabled: {
    color: "#3b82f6",
    bg: "#eff6ff",
    icon: "💾",
    line: "#3b82f6",
  },
  circuit_breaker: {
    color: "#dc2626",
    bg: "#fef2f2",
    icon: "🔴",
    line: "#dc2626",
  },
  load_shedding: {
    color: "#ea580c",
    bg: "#fff7ed",
    icon: "⚠️",
    line: "#ea580c",
  },
  queue_deferral: {
    color: "#ca8a04",
    bg: "#fefce8",
    icon: "🕐",
    line: "#ca8a04",
  },
  rate_limited: {
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: "🚫",
    line: "#7c3aed",
  },
  recovery_detected: {
    color: "#16a34a",
    bg: "#f0fdf4",
    icon: "📉",
    line: "#16a34a",
  },
  incident_resolved: {
    color: "#15803d",
    bg: "#f0fdf4",
    icon: "✅",
    line: "#15803d",
  },
  ai_root_cause: {
    color: "#0891b2",
    bg: "#ecfeff",
    icon: "🤖",
    line: "#0891b2",
  },
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

export function TimelineEvent({
  event,
  isLast,
}: {
  event: IncidentEvent;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = EVENT_STYLES[event.event_type] || EVENT_STYLES.latency_spike;

  return (
    <div className="flex relative">
      {/* Left: time column */}
      <div className="w-20 shrink-0 pt-3.5 text-right pr-4">
        <span className="text-[11px] text-gray-500 font-mono tracking-tight">
          {fmt(event.occurred_at)}
        </span>
      </div>

      {/* Center: dot + line */}
      <div className="relative w-6 shrink-0 flex flex-col items-center">
        <div
          className="w-3 h-3 rounded-full mt-4 shrink-0 relative z-10"
          style={{
            background: style.color,
            boxShadow: `0 0 0 4px ${style.color}20`,
          }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 min-h-[24px] mt-1"
            style={{
              background: `linear-gradient(to bottom, ${style.color}60, rgba(75,85,99,0.3))`,
            }}
          />
        )}
      </div>

      {/* Right: content card */}
      <div className="flex-1 pl-4 pb-6 pt-2 min-w-0">
        <div
          onClick={() => setExpanded(!expanded)}
          className={`bg-gray-800/20 backdrop-blur-md rounded-xl p-3 cursor-pointer transition-all duration-200 border ${
            expanded
              ? "border-opacity-40 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]"
              : "border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/40"
          }`}
          style={{ borderColor: expanded ? style.color : undefined }}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[13.5px] font-semibold text-gray-200 leading-snug">
                {event.title}
              </span>
            </div>
            {/* Metrics pills */}
            <div className="flex gap-1.5 flex-wrap justify-end shrink-0">
              {event.latency_ms > 0 && (
                <MetricPill
                  label="⏱"
                  value={`${event.latency_ms.toFixed(0)}ms`}
                  color="#f97316"
                />
              )}
              {event.error_rate > 0 && (
                <MetricPill
                  label="❌"
                  value={`${(event.error_rate * 100).toFixed(1)}%`}
                  color="#ef4444"
                />
              )}
              {event.rpm > 0 && (
                <MetricPill
                  label="📶"
                  value={`${event.rpm.toFixed(0)}/m`}
                  color="#6b7280"
                />
              )}
            </div>
          </div>

          {/* Expanded description */}
          {expanded && event.description && (
            <div
              className="mt-3 pt-3 text-[13px] text-gray-400 leading-relaxed border-t"
              style={{ borderColor: `${style.color}20` }}
            >
              {event.description}
            </div>
          )}

          {/* Expand chevron */}
          {event.description && (
            <div className="mt-2 text-right text-[11px] text-gray-500 font-medium tracking-wide">
              {expanded ? "▲ less" : "▼ more"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
