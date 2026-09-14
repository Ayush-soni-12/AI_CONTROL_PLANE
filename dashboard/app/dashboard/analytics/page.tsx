"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { LogIn, TrendingUp, Sparkles, HelpCircle, ShieldCheck, Zap, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TrafficHeatmap } from "@/components/analytics/TrafficHeatmap";
import { PercentileChart } from "@/components/analytics/PercentileChart";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-slate-200">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <LogIn className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-slate-400 text-sm font-mono">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Command Bar & Search Header */}
          <TopCommandHeader />

          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-blue-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  DEEP TELEMETRY & SLA
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Tail Distribution Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Advanced Analytics</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                High resolution latency percentiles, temporal traffic density heatmaps, and outlier SLA diagnostics
              </p>
            </div>
          </div>

          {/* Percentile Analysis Section */}
          <PercentileChart />

          {/* Traffic Heatmap Section */}
          <TrafficHeatmap />

          {/* Educational / SLA Insights Guide */}
          <div className="glass-card border-blue-500/15 rounded-xl p-5 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-white/[0.06]">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">
                Understanding Percentile Distributions & SLA Targets
              </h3>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold text-cyan-300 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Latency Percentiles Demystified
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-[#070a13] border border-white/[0.06] flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-emerald-400 font-semibold">p50 (Median)</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Half of all incoming requests execute faster than this value. Reflects standard baseline user experience.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#070a13] border border-white/[0.06] flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-amber-400 font-semibold">p95 (Standard SLA)</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        95% of requests execute faster. Standard enterprise SLA target that filters out rare transient spikes.
                      </p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#070a13] border border-white/[0.06] flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-rose-400 font-semibold">p99 (Tail & Outliers)</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        99% of requests faster. Exposes worst-case concurrency bottlenecks, cache misses, and database lock contention.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-cyan-300 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Traffic Heatmap & Capacity Insights
                </h4>
                <div className="space-y-2.5 text-xs text-slate-400">
                  <div className="p-3 rounded-lg bg-[#070a13] border border-white/[0.06]">
                    <div className="text-slate-200 font-medium mb-1 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      Peak Load Detection
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Brighter neon emerald and cyan cells indicate maximum concurrency periods. Schedule heavy batch migrations during quiet darker cells.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#070a13] border border-white/[0.06]">
                    <div className="text-slate-200 font-medium mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Automated Protection Triggers
                    </div>
                    <p className="text-[11px] text-slate-400">
                      When p99 spikes coincide with peak volume heat cells, the AI Control Plane automatically scales rate limits and activates speculative caching.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
