"use client";

import { useState } from "react";
import { IncidentEvent } from "@/hooks/useIncidents";
import { TraceWaterfall } from "./TraceWaterfall";
import {
  AlertTriangle,
  Clock,
  Activity,
  Flame,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Sparkles,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const EVENT_CONFIG: Record<
  string,
  {
    color: string;
    badgeBg: string;
    badgeBorder: string;
    lineColor: string;
    label: string;
  }
> = {
  incident_opened: {
    color: "text-rose-400",
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-500/30",
    lineColor: "bg-rose-500/40",
    label: "INCIDENT OPENED",
  },
  latency_spike: {
    color: "text-amber-400",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/30",
    lineColor: "bg-amber-500/40",
    label: "LATENCY SPIKE",
  },
  error_spike: {
    color: "text-rose-400",
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-500/30",
    lineColor: "bg-rose-500/40",
    label: "ERROR SPIKE",
  },
  traffic_spike: {
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/30",
    lineColor: "bg-cyan-500/40",
    label: "TRAFFIC SPIKE",
  },
  cache_enabled: {
    color: "text-cyan-300",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/30",
    lineColor: "bg-cyan-500/40",
    label: "CACHE ENGAGED",
  },
  circuit_breaker: {
    color: "text-rose-400",
    badgeBg: "bg-rose-500/15",
    badgeBorder: "border-rose-500/30",
    lineColor: "bg-rose-500/40",
    label: "CIRCUIT BREAKER",
  },
  load_shedding: {
    color: "text-orange-400",
    badgeBg: "bg-orange-500/15",
    badgeBorder: "border-orange-500/30",
    lineColor: "bg-orange-500/40",
    label: "LOAD SHEDDING",
  },
  queue_deferral: {
    color: "text-yellow-400",
    badgeBg: "bg-yellow-500/15",
    badgeBorder: "border-yellow-500/30",
    lineColor: "bg-yellow-500/40",
    label: "QUEUE DEFERRAL",
  },
  rate_limited: {
    color: "text-purple-400",
    badgeBg: "bg-purple-500/15",
    badgeBorder: "border-purple-500/30",
    lineColor: "bg-purple-500/40",
    label: "RATE LIMITED",
  },
  recovery_detected: {
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    lineColor: "bg-emerald-500/40",
    label: "RECOVERY DETECTED",
  },
  incident_resolved: {
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/15",
    badgeBorder: "border-emerald-500/30",
    lineColor: "bg-emerald-500/40",
    label: "INCIDENT RESOLVED",
  },
  ai_root_cause: {
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/30",
    lineColor: "bg-cyan-500/40",
    label: "AI ANALYSIS",
  },
};

function fmtTime(dt: string) {
  const d = new Date(dt);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function TimelineEvent({
  event,
  isLast,
}: {
  event: IncidentEvent;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

  const config = EVENT_CONFIG[event.event_type] || {
    color: "text-cyan-400",
    badgeBg: "bg-cyan-500/15",
    badgeBorder: "border-cyan-500/30",
    lineColor: "bg-cyan-500/40",
    label: event.event_type.toUpperCase(),
  };

  return (
    <div className="flex relative group">
      {/* Time column */}
      <div className="w-20 sm:w-24 shrink-0 pt-3 text-right pr-3 sm:pr-4">
        <span className="text-[11px] font-mono text-slate-400">
          {fmtTime(event.occurred_at)}
        </span>
      </div>

      {/* Center line + dot */}
      <div className="relative w-6 shrink-0 flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full mt-3.5 shrink-0 relative z-10 ${config.badgeBg} border ${config.badgeBorder} shadow-[0_0_10px_rgba(0,240,255,0.2)]`}
        />
        {!isLast && (
          <div className="w-px flex-1 min-h-[32px] mt-1 bg-gradient-to-b from-white/[0.15] to-white/[0.04]" />
        )}
      </div>

      {/* Right Content Card */}
      <div className="flex-1 pl-2 sm:pl-4 pb-5 min-w-0">
        <div
          onClick={() => setExpanded(!expanded)}
          className={`rounded-xl p-3.5 sm:p-4 cursor-pointer transition-all duration-200 bg-[#091020]/60 border backdrop-blur-md ${
            expanded
              ? "border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.06)]"
              : "border-white/[0.06] hover:border-white/[0.15] hover:bg-[#091020]/80"
          }`}
        >
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border shrink-0 ${config.badgeBg} ${config.color} ${config.badgeBorder}`}
              >
                {config.label}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {event.title}
              </span>
            </div>

            {/* Metrics tags */}
            <div className="flex items-center gap-2 shrink-0">
              {event.latency_ms > 0 && (
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-[10px] font-mono text-amber-400">
                  {event.latency_ms.toFixed(0)}ms
                </span>
              )}
              {event.error_rate > 0 && (
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-[10px] font-mono text-rose-400">
                  {(event.error_rate * 100).toFixed(1)}% err
                </span>
              )}
              {event.rpm > 0 && (
                <span className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-[10px] font-mono text-slate-400">
                  {event.rpm.toFixed(0)} RPM
                </span>
              )}
              <span className="text-slate-500">
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
          </div>

          {/* Description */}
          {expanded && event.description && (
            <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs font-mono text-slate-300 leading-relaxed">
              {event.description}
            </div>
          )}

          {/* Trace inspector launcher */}
          {event.trace_id && (
            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTrace(true);
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Search className="w-3 h-3" />
                Inspect Trace
                <span className="text-slate-500 text-[10px]">
                  ({event.trace_id.substring(0, 8)}...)
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Trace Waterfall Modal */}
      {showTrace && event.trace_id && (
        <TraceWaterfall
          traceId={event.trace_id}
          onClose={() => setShowTrace(false)}
        />
      )}
    </div>
  );
}
