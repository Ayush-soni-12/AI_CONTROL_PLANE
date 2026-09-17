"use client";

import { useIncidentDetail, useAnalyzeIncident, useResolveIncident, Incident } from "@/hooks/useIncidents";
import { TimelineEvent } from "./TimelineEvent";
import {
  ArrowLeft,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Activity,
  AlertTriangle,
  Shield,
  Check,
  RefreshCw,
} from "lucide-react";

function fmtTime(dt: string) {
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

interface IncidentDetailProps {
  incidentId: number;
  onBack: () => void;
}

export function IncidentDetail({
  incidentId,
  onBack,
}: IncidentDetailProps) {
  const { data: incident, isLoading } = useIncidentDetail(incidentId);
  const { mutate: analyze, isPending: isAnalyzing } = useAnalyzeIncident();
  const { mutate: resolve, isPending: isResolving } = useResolveIncident();

  if (isLoading || !incident) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono text-cyan-300">
          Loading cognitive incident telemetry...
        </span>
      </div>
    );
  }

  const isOpen = incident.status === "open";
  const isCritical = incident.severity === "critical";
  const isWarning = incident.severity === "warning";

  return (
    <div className="space-y-6">
      {/* Top navigation & action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-slate-400 hover:text-cyan-300 transition-colors w-fit px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:border-cyan-500/30"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Incident Command Center
        </button>

        {/* Quick mitigation buttons */}
        <div className="flex items-center gap-2">
          {isOpen && (
            <button
              onClick={() => resolve(incident.id)}
              disabled={isResolving}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {isResolving ? "Resolving..." : "Mark Resolved"}
            </button>
          )}
        </div>
      </div>

      {/* Incident Overview Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-7 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            isOpen
              ? isCritical
                ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500"
                : "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"
          }`}
        />

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex-1 min-w-0">
            {/* Status & Service tags */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider border ${
                  isCritical
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : isWarning
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                }`}
              >
                {incident.severity.toUpperCase()}
              </span>

              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider border flex items-center gap-1.5 ${
                  isOpen
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isOpen ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    ACTIVE OUTAGE
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    RESOLVED
                  </>
                )}
              </span>

              <span className="text-xs font-mono text-slate-300 bg-white/[0.04] px-3 py-1 rounded-lg border border-white/[0.08]">
                {incident.service_name}
                <span className="text-cyan-400 ml-1.5">{incident.endpoint}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-2">
              {incident.title}
            </h2>

            <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Started: {fmtDate(incident.started_at)} at {fmtTime(incident.started_at)}</span>
              {incident.resolved_at && (
                <>
                  <span className="text-slate-600">→</span>
                  <span>Resolved at {fmtTime(incident.resolved_at)}</span>
                </>
              )}
            </div>
          </div>

          {/* Duration display */}
          <div className="shrink-0 p-3 sm:p-4 rounded-xl bg-black/40 border border-white/[0.06] text-left lg:text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
              {incident.duration_display || "0s"}
            </div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">
              Outage Duration
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/[0.08]">
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              Peak Latency
            </div>
            <div className="text-lg font-mono font-bold text-amber-400">
              {incident.peak_latency_ms ? `${incident.peak_latency_ms.toFixed(0)}ms` : "0ms"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              Peak Failure Rate
            </div>
            <div className="text-lg font-mono font-bold text-rose-400">
              {incident.peak_error_rate ? `${(incident.peak_error_rate * 100).toFixed(1)}%` : "0.0%"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              Peak Traffic
            </div>
            <div className="text-lg font-mono font-bold text-cyan-300">
              {incident.peak_rpm ? `${incident.peak_rpm.toFixed(0)} RPM` : "0 RPM"}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <div className="text-[11px] font-mono text-slate-400 mb-1">
              Event Sequence
            </div>
            <div className="text-lg font-mono font-bold text-slate-200">
              {incident.events?.length || 0} Recorded
            </div>
          </div>
        </div>
      </div>

      {/* AI Root Cause Analysis Section */}
      <div className="relative overflow-hidden rounded-2xl bg-[#071324]/80 border border-cyan-500/30 backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_35px_rgba(0,240,255,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-cyan-300">
                  AI Root Cause Triage
                </h3>
                {incident.ai_confidence && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-200 border border-cyan-500/30">
                    {incident.ai_confidence} confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Automated heuristic & trace correlation analysis
              </p>
            </div>
          </div>

          <button
            onClick={() => analyze(incident.id)}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.15)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
            {isAnalyzing ? "Running AI Diagnosis..." : "Re-Analyze Root Cause"}
          </button>
        </div>

        {incident.root_cause_summary ? (
          <div className="p-4 rounded-xl bg-black/40 border border-cyan-500/20">
            <p className="text-xs sm:text-sm font-mono text-cyan-100/90 leading-relaxed whitespace-pre-wrap">
              {incident.root_cause_summary}
            </p>
          </div>
        ) : (
          <div className="text-center py-8 px-4 rounded-xl bg-black/40 border border-dashed border-white/[0.1]">
            <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-sm font-bold font-mono text-slate-200 mb-1">
              No Analysis Generated Yet
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4 font-mono">
              Execute on-demand cognitive analysis to correlate trace metrics, error patterns, and threshold triggers.
            </p>
            <button
              onClick={() => analyze(incident.id)}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            >
              {isAnalyzing ? "Analyzing..." : "Generate AI Diagnosis"}
            </button>
          </div>
        )}
      </div>

      {/* Timeline Stream */}
      <div className="rounded-2xl bg-[#091020]/70 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold font-mono text-slate-100">
              Chronological Event Stream
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {incident.events?.length || 0} events recorded · Click event to view waterfall trace
          </span>
        </div>

        <div className="space-y-1">
          {incident.events?.map((event, i) => (
            <TimelineEvent
              key={event.id}
              event={event}
              isLast={i === (incident.events?.length || 0) - 1}
            />
          ))}

          {(!incident.events || incident.events.length === 0) && (
            <div className="text-center py-10 text-xs font-mono text-slate-500">
              No event log snapshots recorded for this incident.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
