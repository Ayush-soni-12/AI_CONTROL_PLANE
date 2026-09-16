"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/hooks/useIncidents";
import { Siren, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Zap } from "lucide-react";

interface IncidentActiveBannerProps {
  activeIncidents: Incident[];
  onSelectIncident: (id: number) => void;
}

export function IncidentActiveBanner({
  activeIncidents,
  onSelectIncident,
}: IncidentActiveBannerProps) {
  const [ticker, setTicker] = useState(0);

  // Live timer tick for active outages
  useEffect(() => {
    if (activeIncidents.length === 0) return;
    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeIncidents.length]);

  if (activeIncidents.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#091020]/40 border border-emerald-500/20 backdrop-blur-xl p-4 sm:p-5 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-emerald-300">
                  SYSTEM OPERATIONAL
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Zero active breaches or threshold violations across all monitored microservices.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/[0.06]">
              Autonomous Protection: Active
            </span>
          </div>
        </div>
      </div>
    );
  }

  const primaryIncident = activeIncidents[0];

  const getLiveDuration = (startedAt: string) => {
    const started = new Date(startedAt).getTime();
    const now = Date.now();
    const diffSecs = Math.max(0, Math.floor((now - started) / 1000));
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0e0712]/90 border border-rose-500/40 backdrop-blur-xl p-4 sm:p-6 mb-6 shadow-[0_0_30px_rgba(244,63,94,0.15)] animate-pulse-border">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left info column */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            <ShieldAlert className="w-6 h-6 text-rose-400 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Active Incident ({activeIncidents.length})
              </span>
              <span className="text-xs font-mono text-slate-300 bg-white/[0.06] px-2.5 py-0.5 rounded-md border border-white/[0.08] truncate">
                {primaryIncident.service_name}
                <span className="text-rose-400 ml-1">{primaryIncident.endpoint}</span>
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-100 truncate">
              {primaryIncident.title}
            </h3>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-300">
              <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <span className="text-slate-400">Duration:</span>
                <span className="text-rose-300 font-bold">
                  {getLiveDuration(primaryIncident.started_at)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <span className="text-slate-400">Peak Latency:</span>
                <span className="text-amber-300 font-bold">
                  {primaryIncident.peak_latency_ms?.toFixed(0)}ms
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/[0.06]">
                <span className="text-slate-400">Peak Failure:</span>
                <span className="text-rose-400 font-bold">
                  {(primaryIncident.peak_error_rate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.08]">
          <button
            onClick={() => onSelectIncident(primaryIncident.id)}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Deep Triage
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
