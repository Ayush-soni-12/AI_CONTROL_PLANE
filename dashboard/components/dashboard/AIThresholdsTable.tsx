"use client";

import { AIThreshold } from "@/lib/types";
import {
  TrendingUp,
  Clock,
  Activity,
  Zap,
  Shield,
  ShieldAlert,
  Users,
  Brain,
  Layers,
  Flame,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 rounded-xl bg-[#091020]/60 border border-white/[0.05] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (thresholds.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl bg-[#091020]/40 border border-white/[0.05]">
        <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          <Brain className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-base font-bold font-mono text-slate-200 mb-1">
          No AI Thresholds Generated Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          The background AI cognitive analyzer runs periodically on traffic signals to derive optimal protection thresholds.
        </p>
      </div>
    );
  }

  const getConfidenceConfig = (confidence: number) => {
    if (confidence >= 0.85) {
      return {
        label: "High Confidence",
        pill: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
        dot: "bg-emerald-400",
      };
    }
    if (confidence >= 0.7) {
      return {
        label: "Optimal Confidence",
        pill: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
        dot: "bg-cyan-400",
      };
    }
    return {
      label: "Moderate Confidence",
      pill: "text-amber-300 bg-amber-500/10 border-amber-500/30",
      dot: "bg-amber-400",
    };
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
      {thresholds.map((threshold, index) => {
        const conf = getConfidenceConfig(threshold.confidence);

        return (
          <div
            key={`${threshold.service_name}-${threshold.endpoint}-${index}`}
            className="group relative rounded-xl bg-[#091020]/90 backdrop-blur-md border border-blue-500/15 hover:border-cyan-500/40 transition-all duration-300 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
          >
            {/* Top subtle glow line */}
            <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-blue-500 opacity-40 group-hover:opacity-100 transition-opacity" />

            <div className="p-5 sm:p-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {threshold.service_name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        AI TUNED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {threshold.endpoint}
                    </p>
                  </div>
                </div>

                {/* Confidence Pill */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-medium ${conf.pill}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${conf.dot} animate-pulse`} />
                  <span>{(threshold.confidence * 100).toFixed(0)}% Confidence</span>
                </div>
              </div>

              {/* 5-Column Threshold Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                {/* 1. Speculative Cache Latency */}
                <div className="p-3.5 rounded-xl bg-[#070a13] border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cache Threshold</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-cyan-300">
                    {threshold.cache_latency_ms}
                    <span className="text-xs text-slate-500 ml-1 font-normal">ms</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Speculative trigger</div>
                </div>

                {/* 2. Circuit Breaker Error Rate */}
                <div className="p-3.5 rounded-xl bg-[#070a13] border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Circuit Breaker</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-rose-300">
                    {(threshold.circuit_breaker_error_rate * 100).toFixed(0)}
                    <span className="text-xs text-slate-500 ml-1 font-normal">%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Trip threshold</div>
                </div>

                {/* 3. Queue Deferral RPM */}
                <div className="p-3.5 rounded-xl bg-[#070a13] border border-violet-500/20 hover:border-violet-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    <span>Queue Deferral</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-violet-300">
                    {threshold.queue_deferral_rpm}
                    <span className="text-xs text-slate-500 ml-1 font-normal">rpm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Async buffer point</div>
                </div>

                {/* 4. Load Shedding */}
                <div className="p-3.5 rounded-xl bg-[#070a13] border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Load Shedding</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
                    {threshold.load_shedding_rpm}
                    <span className="text-xs text-slate-500 ml-1 font-normal">rpm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Backpressure ceiling</div>
                </div>

                {/* 5. Rate Limit */}
                <div className="p-3.5 rounded-xl bg-[#070a13] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-mono mb-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Rate Limit</span>
                  </div>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
                    {threshold.rate_limit_customer_rpm}
                    <span className="text-xs text-slate-500 ml-1 font-normal">rpm</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Per-customer quota</div>
                </div>
              </div>

              {/* AI Reasoning Container */}
              <div className="p-4 rounded-xl bg-[#070a13]/80 border border-white/[0.08] relative">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-semibold text-cyan-300 mb-1">
                      AI Reasoning & Control Strategy
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {threshold.reasoning}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.04] text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Optimized {formatDate(threshold.last_updated)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Enforced at Edge</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
