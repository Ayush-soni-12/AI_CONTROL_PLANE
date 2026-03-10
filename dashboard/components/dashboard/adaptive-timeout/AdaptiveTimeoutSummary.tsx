import { Zap, AlertTriangle, Info } from "lucide-react";
import { AdaptiveTimeoutStatus } from "@/lib/types";

export interface AdaptiveTimeoutSummaryProps {
  endpoints: AdaptiveTimeoutStatus[];
}

export function AdaptiveTimeoutSummary({
  endpoints,
}: AdaptiveTimeoutSummaryProps) {
  const activeCount = endpoints.filter((e) => e.active).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total endpoints */}
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm text-gray-400 font-medium">
            Endpoints Monitored
          </span>
        </div>
        <p className="text-3xl font-bold text-white">{endpoints.length}</p>
        <p className="text-xs text-gray-500 mt-1">
          across all registered services
        </p>
      </div>

      {/* Active alerts */}
      <div
        className={`rounded-2xl border p-5 ${
          activeCount > 0
            ? "bg-orange-500/5 border-orange-500/30"
            : "bg-gray-900/50 border-gray-800"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`p-2 rounded-lg ${
              activeCount > 0 ? "bg-orange-500/15" : "bg-gray-800"
            }`}
          >
            <AlertTriangle
              className={`w-4 h-4 ${
                activeCount > 0 ? "text-orange-400" : "text-gray-500"
              }`}
            />
          </div>
          <span className="text-sm text-gray-400 font-medium">
            Currently Active
          </span>
        </div>
        <p
          className={`text-3xl font-bold ${
            activeCount > 0 ? "text-orange-400" : "text-white"
          }`}
        >
          {activeCount}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {activeCount > 0
            ? "endpoints with latency spike detected"
            : "all endpoints within normal latency"}
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Info className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm text-gray-400 font-medium">
            How It Works
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          The AI continually analyzes your endpoints to determine a healthy
          baseline and stores a stable{" "}
          <span className="text-blue-300 font-mono">timeout threshold</span> in
          the database. The SDK enforces this stable timeout, protecting your
          connections even if latency suddenly spikes during an incident.
        </p>
      </div>
    </div>
  );
}
