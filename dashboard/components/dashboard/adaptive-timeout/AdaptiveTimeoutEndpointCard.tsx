import { AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AdaptiveTimeoutStatus } from "@/lib/types";

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising")
    return <TrendingUp className="w-4 h-4 text-orange-400" />;
  if (trend === "falling")
    return <TrendingDown className="w-4 h-4 text-emerald-400" />;
  return <Minus className="w-4 h-4 text-gray-500" />;
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
      Active — Latency Spike
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Monitoring
    </span>
  );
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function AdaptiveTimeoutEndpointCard({
  ep,
}: {
  ep: AdaptiveTimeoutStatus;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 transition-all duration-300 ${
        ep.active
          ? "bg-orange-500/5 border-orange-500/25"
          : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        {/* Service + endpoint */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md">
              {ep.service_name}
            </span>
            <span className="text-sm font-semibold text-white font-mono">
              {ep.endpoint}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <TrendIcon trend={ep.latency_trend} />
            <span className="text-xs text-gray-500">
              latency is{" "}
              <span
                className={
                  ep.latency_trend === "rising"
                    ? "text-orange-400"
                    : ep.latency_trend === "falling"
                      ? "text-emerald-400"
                      : "text-gray-400"
                }
              >
                {ep.latency_trend}
              </span>
            </span>
          </div>
        </div>
        <StatusBadge active={ep.active} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">AI Threshold</p>
          <p className="text-base font-bold text-white">
            {formatMs(ep.threshold_ms)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">p99 alarm line</p>
        </div>
        <div
          className={`rounded-xl p-3 ${
            ep.active
              ? "bg-orange-500/10 border border-orange-500/20"
              : "bg-gray-800/50"
          }`}
        >
          <p className="text-xs text-gray-500 mb-1">Enforced Timeout</p>
          <p
            className={`text-base font-bold ${
              ep.active ? "text-orange-400" : "text-white"
            }`}
          >
            {formatMs(ep.recommended_timeout_ms)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">stable ai limit</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Baseline p99</p>
          <p className="text-base font-bold text-white">
            {formatMs(ep.baseline_p99_ms)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">healthy average</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Current p99</p>
          <p
            className={`text-base font-bold ${
              ep.current_p99_ms > ep.threshold_ms
                ? "text-orange-400"
                : ep.current_p99_ms > ep.baseline_p99_ms * 1.5
                  ? "text-yellow-400"
                  : "text-emerald-400"
            }`}
          >
            {formatMs(ep.current_p99_ms)}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">last 5 minutes</p>
        </div>
      </div>

      {/* Active warning banner */}
      {ep.active && (
        <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-300 leading-relaxed">
            Latency spike detected — SDK is enforcing{" "}
            <strong>{formatMs(ep.recommended_timeout_ms)}</strong> timeout
            (normally <strong>{formatMs(ep.threshold_ms)}</strong> trigger).
            Slow requests will be killed fast to protect your connection pool.
          </p>
        </div>
      )}
    </div>
  );
}
