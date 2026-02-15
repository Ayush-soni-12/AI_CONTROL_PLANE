"use client";

import { AIThreshold } from "@/lib/types";
import { TrendingUp, Clock, Activity, Zap, Shield, Users } from "lucide-react";

interface AIThresholdsTableProps {
  thresholds: AIThreshold[];
  isLoading?: boolean;
}

export function AIThresholdsTable({
  thresholds,
  isLoading,
}: AIThresholdsTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-800/50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (thresholds.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 rounded-2xl bg-gray-800/50 mb-4">
          <Activity className="w-16 h-16 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          No AI Thresholds Yet
        </h3>
        <p className="text-gray-500">
          Thresholds will appear here once the AI analyzer processes your
          service data.
        </p>
      </div>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9)
      return "text-green-400 bg-green-500/10 border-green-500/30";
    if (confidence >= 0.7)
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <div className="space-y-4">
      {thresholds.map((threshold, index) => (
        <div
          key={`${threshold.service_name}-${threshold.endpoint}-${index}`}
          className="group relative rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-800 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
        >
          {/* Hover gradient effect */}
          <div className="absolute inset-0 bg-linear-to-r from-purple-600/0 via-purple-600/5 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {threshold.service_name}
                    </h3>
                    <p className="text-sm text-gray-400 font-mono">
                      {threshold.endpoint}
                    </p>
                  </div>
                </div>
              </div>

              {/* Confidence Badge */}
              <div
                className={`px-3 py-1.5 rounded-full border ${getConfidenceColor(threshold.confidence)}`}
              >
                <span className="text-xs font-semibold">
                  {(threshold.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
            </div>

            {/* Thresholds Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
              {/* Cache Latency */}
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-gray-400">Cache</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {threshold.cache_latency_ms}
                  <span className="text-sm text-gray-500 ml-1">ms</span>
                </p>
              </div>

              {/* Circuit Breaker */}
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-gray-400">Circuit</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {(threshold.circuit_breaker_error_rate * 100).toFixed(0)}
                  <span className="text-sm text-gray-500 ml-1">%</span>
                </p>
              </div>

              {/* Queue RPM */}
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">Queue</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {threshold.queue_deferral_rpm}
                  <span className="text-sm text-gray-500 ml-1">rpm</span>
                </p>
              </div>

              {/* Load Shedding */}
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-400">Shed</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {threshold.load_shedding_rpm}
                  <span className="text-sm text-gray-500 ml-1">rpm</span>
                </p>
              </div>

              {/* Rate Limit */}
              <div className="p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-400">Rate</span>
                </div>
                <p className="text-lg font-bold text-white">
                  {threshold.rate_limit_customer_rpm}
                  <span className="text-sm text-gray-500 ml-1">rpm</span>
                </p>
              </div>
            </div>

            {/* Reasoning */}
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <p className="text-sm text-gray-300 leading-relaxed">
                <span className="text-purple-400 font-semibold">
                  AI Reasoning:{" "}
                </span>
                {threshold.reasoning}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>Updated {formatDate(threshold.last_updated)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
