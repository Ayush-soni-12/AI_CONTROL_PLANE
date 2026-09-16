"use client";

import { Incident, useAnalyzeIncident, useResolveIncident } from "@/hooks/useIncidents";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Activity,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Check,
} from "lucide-react";

interface IncidentCardProps {
  incident: Incident;
  onClick: () => void;
}

function fmtDate(dt: string) {
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IncidentCard({
  incident,
  onClick,
}: IncidentCardProps) {
  const { mutate: analyze, isPending: isAnalyzing } = useAnalyzeIncident();
  const { mutate: resolve, isPending: isResolving } = useResolveIncident();

  const isOpen = incident.status === "open";
  const isCritical = incident.severity === "critical";
  const isWarning = incident.severity === "warning";

  const getSeverityBadge = () => {
    if (isCritical) {
      return {
        label: "CRITICAL",
        className: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      };
    }
    if (isWarning) {
      return {
        label: "WARNING",
        className: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      };
    }
    return {
      label: "INFO",
      className: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    };
  };

  const severityBadge = getSeverityBadge();

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-[#091020]/70 border transition-all duration-300 p-4 sm:p-5 cursor-pointer backdrop-blur-xl ${
        isOpen
          ? isCritical
            ? "border-rose-500/30 hover:border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.06)] hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]"
            : "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.06)] hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]"
          : "border-white/[0.08] hover:border-cyan-500/30 hover:shadow-[0_0_25px_rgba(0,240,255,0.06)]"
      }`}
    >
      {/* Subtle top indicator bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 ${
          isOpen
            ? isCritical
              ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500"
              : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
            : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 opacity-60"
        }`}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Main Details */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border ${severityBadge.className}`}
            >
              {severityBadge.label}
            </span>

            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider border flex items-center gap-1.5 ${
                isOpen
                  ? isCritical
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {isOpen ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  ACTIVE OUTAGE
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  RESOLVED
                </>
              )}
            </span>

            <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-0.5 rounded-md border border-white/[0.06] truncate">
              {incident.service_name}
              <span className="text-cyan-400 ml-1">{incident.endpoint}</span>
            </span>

            <span className="text-[11px] font-mono text-slate-500 ml-auto lg:ml-0">
              {fmtDate(incident.started_at)}
            </span>
          </div>

          {/* Title */}
          <h4 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
            {incident.title}
          </h4>

          {/* AI Root Cause Pill */}
          {incident.root_cause_summary && (
            <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs font-mono text-cyan-200">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
              <p className="line-clamp-1 flex-1 text-[11px] text-cyan-200/90">
                <span className="text-cyan-400 font-bold">AI Diagnosis:</span>{" "}
                {incident.root_cause_summary}
              </p>
              {incident.ai_confidence && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  {incident.ai_confidence}
                </span>
              )}
            </div>
          )}

          {/* Metrics telemetry grid */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono">
              <span className="text-slate-400 mr-1.5">Peak Latency:</span>
              <span className="text-amber-400 font-bold">
                {incident.peak_latency_ms ? `${incident.peak_latency_ms.toFixed(0)}ms` : "0ms"}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono">
              <span className="text-slate-400 mr-1.5">Peak Failure:</span>
              <span className="text-rose-400 font-bold">
                {incident.peak_error_rate ? `${(incident.peak_error_rate * 100).toFixed(1)}%` : "0.0%"}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono">
              <span className="text-slate-400 mr-1.5">Duration:</span>
              <span className="text-slate-200 font-bold">
                {incident.duration_display || "0s"}
              </span>
            </div>

            {incident.event_count !== undefined && (
              <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-mono">
                <span className="text-slate-400 mr-1.5">Events:</span>
                <span className="text-cyan-300 font-bold">{incident.event_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Mitigation Bar */}
        <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/[0.08]">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                analyze(incident.id);
              }}
              disabled={isAnalyzing}
              title="Re-run AI Root Cause Analysis"
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-3 h-3 text-cyan-400 ${isAnalyzing ? "animate-spin" : ""}`} />
              {isAnalyzing ? "Analyzing..." : "Re-Analyze"}
            </button>

            {isOpen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resolve(incident.id);
                }}
                disabled={isResolving}
                title="Mark incident as resolved"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                {isResolving ? "Resolving..." : "Resolve"}
              </button>
            )}
          </div>

          <button
            onClick={onClick}
            className="w-full lg:w-auto mt-1 px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 group-hover:border-cyan-500/40"
          >
            Triage Timeline
            <ArrowRight className="w-3 h-3 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
