"use client";

import { useState } from "react";
import { useFlagAuditLog } from "@/hooks/useFlags";
import { History, Zap, ShieldCheck, User, Clock, ChevronRight, Layers, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TraceWaterfall } from "@/components/dashboard/incidents/TraceWaterfall";

interface FlagAuditLogProps {
  serviceName: string;
  flagName?: string;
  onSelectTrace?: (traceId: string) => void;
}

export function FlagAuditLog({ serviceName, flagName, onSelectTrace }: FlagAuditLogProps) {
  const { logs, isLoading: loading } = useFlagAuditLog(serviceName, flagName);
  const [internalTrace, setInternalTrace] = useState<string | null>(null);

  const handleTraceClick = (traceId: string) => {
    if (onSelectTrace) {
      onSelectTrace(traceId);
    } else {
      setInternalTrace(traceId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono text-cyan-400">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-500 border-t-transparent" />
        <span>Loading immutable audit trail...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-6 px-4 text-center rounded-xl bg-black/30 border border-white/[0.06] mt-2">
        <History className="w-5 h-5 text-slate-600 mx-auto mb-2" />
        <p className="text-xs font-mono text-slate-400">
          No audit history events recorded for {flagName ? `flag "${flagName}"` : `service "${serviceName}"`}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
          Immutable Audit Trail ({logs.length} events)
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
        {logs.map((log) => {
          const isAI = log.changed_by === "NeuralControl AI";
          const isKilled = log.new_rollout === 0;
          const isIncrease = log.new_rollout > log.old_rollout;

          return (
            <div key={`audit-${log.id}-${log.created_at}`} className="relative pl-6 pb-2 group">
              {/* Timeline connecting line */}
              <div className="absolute left-2 top-2 bottom-0 w-px bg-white/[0.1] group-last:bg-gradient-to-b group-last:from-white/[0.1] group-last:to-transparent" />

              {/* Timeline dot */}
              <div
                className={`absolute left-0.5 top-2 w-3.5 h-3.5 rounded-full border-2 border-[#091020] flex items-center justify-center z-10 ${
                  isAI
                    ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                    : isKilled
                    ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                    : "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                }`}
              >
                {isAI ? (
                  <Zap className="w-2 h-2 text-white" />
                ) : isKilled ? (
                  <AlertCircle className="w-2 h-2 text-white" />
                ) : (
                  <ShieldCheck className="w-2 h-2 text-black" />
                )}
              </div>

              {/* Audit Event Card */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isAI
                    ? "bg-purple-950/20 border-purple-500/30 hover:border-purple-500/50"
                    : isKilled
                    ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                    : "bg-black/40 border-white/[0.06] hover:border-white/[0.15]"
                }`}
              >
                {/* Header row with delta badge & timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {!flagName && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.05] text-cyan-300 border border-white/[0.08]">
                        {log.flag_name}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-black/60 border border-white/[0.08]">
                      <span className="font-mono font-bold text-xs text-slate-300 tabular-nums">
                        {log.old_rollout}%
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                      <span
                        className={`font-mono font-bold text-xs tabular-nums ${
                          isKilled
                            ? "text-rose-400"
                            : isIncrease
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {log.new_rollout}%
                      </span>
                    </div>

                    {isKilled && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        TERMINATED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Reason text */}
                {log.reason && (
                  <p className="text-xs font-mono text-slate-300 leading-relaxed mb-2.5 bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                    &quot;{log.reason}&quot;
                  </p>
                )}

                {/* Footer with Actor & Trace button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded ${
                        isAI ? "bg-purple-500/20 text-purple-300" : "bg-white/[0.05] text-slate-300"
                      }`}
                    >
                      {isAI ? <Zap className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    <span
                      className={`text-[11px] font-mono font-medium ${
                        isAI ? "text-purple-300 font-bold" : "text-slate-300"
                      }`}
                    >
                      {log.changed_by}
                    </span>
                  </div>

                  {log.trace_id && (
                    <button
                      onClick={() => handleTraceClick(log.trace_id!)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all shadow-[0_0_8px_rgba(0,240,255,0.1)]"
                      title="Inspect distributed trace waterfall for this event"
                    >
                      <Layers className="w-3 h-3 text-cyan-400" />
                      trace:{log.trace_id.substring(0, 8)}...
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Internal Trace Waterfall Modal */}
      {internalTrace && (
        <TraceWaterfall
          traceId={internalTrace}
          onClose={() => setInternalTrace(null)}
        />
      )}
    </div>
  );
}

