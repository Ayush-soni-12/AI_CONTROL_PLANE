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
      <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono text-[#a1a1aa]">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#fafafa] border-t-transparent" />
        <span>Loading immutable audit trail...</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-6 px-4 text-center rounded-lg bg-[#18181b] border border-[#27272a] mt-2">
        <History className="w-5 h-5 text-[#71717a] mx-auto mb-2" />
        <p className="text-xs font-mono text-[#a1a1aa]">
          No audit history events recorded for {flagName ? `flag "${flagName}"` : `service "${serviceName}"`}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-[#27272a]" />
        <span className="text-[10px] font-mono font-medium uppercase tracking-wider text-[#a1a1aa]">
          Immutable Audit Trail ({logs.length} events)
        </span>
        <div className="h-px flex-1 bg-[#27272a]" />
      </div>

      <div className="space-y-3 max-h-112.5 overflow-y-auto pr-1">
        {logs.map((log) => {
          const isAI = log.changed_by === "NeuralControl AI";
          const isKilled = log.new_rollout === 0;
          const isIncrease = log.new_rollout > log.old_rollout;

          return (
            <div key={`audit-${log.id}-${log.created_at}`} className="relative pl-6 pb-2 group">
              {/* Timeline connecting line */}
              <div className="absolute left-2 top-2 bottom-0 w-px bg-[#27272a]" />

              {/* Timeline dot */}
              <div
                className={`absolute left-0.5 top-2 w-3.5 h-3.5 rounded-full border-2 border-[#111113] flex items-center justify-center z-10 ${
                  isAI
                    ? "bg-[#a78bfa]"
                    : isKilled
                    ? "bg-rose-500"
                    : "bg-[#22c55e]"
                }`}
              >
                {isAI ? (
                  <Zap className="w-2 h-2 text-black" />
                ) : isKilled ? (
                  <AlertCircle className="w-2 h-2 text-white" />
                ) : (
                  <ShieldCheck className="w-2 h-2 text-black" />
                )}
              </div>

              {/* Audit Event Card */}
              <div
                className={`p-3.5 rounded-lg border transition-colors ${
                  isAI
                    ? "bg-[#18181b] border-purple-500/30"
                    : isKilled
                    ? "bg-[#18181b] border-rose-500/30"
                    : "bg-[#18181b] border-[#27272a] hover:border-[#3f3f46]"
                }`}
              >
                {/* Header row with delta badge & timestamp */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {!flagName && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111113] text-[#fafafa] border border-[#27272a]">
                        {log.flag_name}
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#111113] border border-[#27272a]">
                      <span className="font-mono font-medium text-xs text-[#a1a1aa] tabular-nums">
                        {log.old_rollout}%
                      </span>
                      <ChevronRight className="w-3 h-3 text-[#71717a]" />
                      <span
                        className={`font-mono font-medium text-xs tabular-nums ${
                          isKilled
                            ? "text-rose-400"
                            : isIncrease
                            ? "text-[#22c55e]"
                            : "text-amber-400"
                        }`}
                      >
                        {log.new_rollout}%
                      </span>
                    </div>

                    {isKilled && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        TERMINATED
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#71717a]">
                    <Clock className="w-3 h-3 text-[#71717a]" />
                    <span>
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Reason text */}
                {log.reason && (
                  <p className="text-xs font-mono text-[#a1a1aa] leading-relaxed mb-2.5 bg-[#111113] p-2 rounded border border-[#27272a]">
                    &quot;{log.reason}&quot;
                  </p>
                )}

                {/* Footer with Actor & Trace button */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#27272a]">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`p-1 rounded ${
                        isAI ? "bg-purple-500/20 text-purple-300" : "bg-[#111113] text-[#a1a1aa] border border-[#27272a]"
                      }`}
                    >
                      {isAI ? <Zap className="w-3 h-3" /> : <User className="w-3 h-3 text-[#a1a1aa]" />}
                    </div>
                    <span
                      className={`text-[11px] font-mono ${
                        isAI ? "text-[#a78bfa] font-semibold" : "text-[#a1a1aa]"
                      }`}
                    >
                      {log.changed_by}
                    </span>
                  </div>

                  {log.trace_id && (
                    <button
                      onClick={() => handleTraceClick(log.trace_id!)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-[#111113] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] transition-colors cursor-pointer"
                      title="Inspect distributed trace waterfall for this event"
                    >
                      <Layers className="w-3 h-3 text-[#a1a1aa]" />
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
