"use client";

import { useFlagAuditLog } from "@/hooks/useFlags";
import { History, Zap, ShieldCheck, User, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FlagAuditLogProps {
  serviceName: string;
  flagName?: string;
}

export function FlagAuditLog({ serviceName, flagName }: FlagAuditLogProps) {
  const { logs, isLoading: loading } = useFlagAuditLog(serviceName, flagName);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 px-4 text-center rounded-xl bg-gray-900/20 border border-gray-800/40 mt-3">
        <History className="w-5 h-5 text-gray-600 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No audit history found for this flag.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-800/50" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Audit History</span>
        <div className="h-px flex-1 bg-gray-800/50" />
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {logs.map((log) => {
          const isAI = log.changed_by === "NeuralControl AI";
          
          return (
            <div key={log.id} className="relative pl-6 pb-4 group">
              {/* Timeline line */}
              <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-800 group-last:bg-linear-to-b group-last:from-gray-800 group-last:to-transparent" />
              
              {/* Timeline dot */}
              <div className={`absolute left-0 top-1 w-3 h-3 rounded-full border-2 border-gray-950 flex items-center justify-center z-10 ${
                isAI ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" : "bg-gray-600"
              }`}>
                {isAI ? <Zap className="w-1.5 h-1.5 text-white" /> : <ShieldCheck className="w-1.5 h-1.5 text-white" />}
              </div>

              <div className={`p-3 rounded-xl border transition-all ${
                isAI 
                  ? "bg-purple-500/5 border-purple-500/20 hover:border-purple-500/30" 
                  : "bg-gray-900/40 border-gray-800/50 hover:border-gray-700/50"
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white tabular-nums">
                      {log.old_rollout}%
                    </span>
                    <ChevronRight className="w-2.5 h-2.5 text-gray-600" />
                    <span className={`font-bold text-xs tabular-nums ${log.new_rollout === 0 ? "text-red-400" : "text-green-400"}`}>
                      {log.new_rollout}%
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed mb-2 italic">
                  &quot;{log.reason}&quot;
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`p-1 rounded-md ${isAI ? "bg-purple-500/20" : "bg-gray-800"}`}>
                      <User className={`w-2.5 h-2.5 ${isAI ? "text-purple-400" : "text-gray-400"}`} />
                    </div>
                    <span className={`text-[10px] font-medium ${isAI ? "text-purple-400" : "text-gray-400"}`}>
                      {log.changed_by}
                    </span>
                  </div>

                  {log.trace_id && (
                    <button className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700/50 text-gray-400 hover:text-purple-400 hover:border-purple-500/30 transition-all font-mono">
                      trace:{log.trace_id.substring(0, 8)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
