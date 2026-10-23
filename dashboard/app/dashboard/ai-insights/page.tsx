"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { useAIInsights, useAIThresholds } from "@/hooks/useAIInsights";
import { AIThresholdsTable } from "@/components/dashboard/AIThresholdsTable";
import { AIInsightsList } from "@/components/dashboard/AIInsightsList";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import {
  Brain,
  LogIn,
  SlidersHorizontal,
  Filter,
  ShieldCheck,
  Lightbulb,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

export default function AIInsightsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"thresholds" | "insights">("thresholds");
  const [selectedService, setSelectedService] = useState<string>("");

  // Check authentication
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Fetch AI data
  const { data: thresholdsData, isLoading: thresholdsLoading } = useAIThresholds();
  const { data: insightsData, isLoading: insightsLoading } = useAIInsights(
    selectedService || undefined,
    50
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  const activeThresholds = useMemo(() => {
    return thresholdsData?.thresholds || [];
  }, [thresholdsData]);

  const activeInsights = useMemo(() => {
    return insightsData?.insights || [];
  }, [insightsData]);

  // Filter thresholds & insights by selected service
  const filteredThresholds = useMemo(() => {
    if (!selectedService) return activeThresholds;
    return activeThresholds.filter((t) => t.service_name === selectedService);
  }, [activeThresholds, selectedService]);

  const filteredInsights = useMemo(() => {
    if (!selectedService) return activeInsights;
    return activeInsights.filter((i) => i.service_name === selectedService);
  }, [activeInsights, selectedService]);

  // Unique services list
  const servicesList = useMemo(() => {
    const uniqueServices = new Set<string>();
    activeInsights.forEach((insight) => uniqueServices.add(insight.service_name));
    activeThresholds.forEach((threshold) => uniqueServices.add(threshold.service_name));
    return Array.from(uniqueServices).sort();
  }, [activeInsights, activeThresholds]);

  // Overall summary metrics
  const summaryMetrics = useMemo(() => {
    const totalThresholds = activeThresholds.length;
    const totalInsights = activeInsights.length;

    let totalConfidence = 0;
    let confidenceCount = 0;

    activeThresholds.forEach((t) => {
      totalConfidence += t.confidence;
      confidenceCount += 1;
    });

    const avgConfidence =
      confidenceCount > 0 ? (totalConfidence / confidenceCount) * 100 : 0;

    const anomaliesCount =
      activeInsights.filter((i) => i.insight_type === "anomaly").length;

    return {
      totalThresholds,
      totalInsights,
      avgConfidence: Math.round(avgConfidence),
      anomaliesCount,
    };
  }, [activeThresholds, activeInsights]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-slate-200">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
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
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  AI COGNITIVE CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Autonomous Protection Loop
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white flex items-center gap-2.5">
                <span>Autonomous Insights & Thresholds</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
                Machine learning anomaly detection, traffic pattern recognition, and self-tuning protection thresholds
              </p>
            </div>
          </div>

          {/* Top AI Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl bg-[#091020] border border-cyan-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tuned Endpoints</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Active
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-cyan-300">
                {summaryMetrics.totalThresholds}
              </div>
              <div className="text-[11px] font-sans text-slate-400 mt-1">
                Self-calibrating gateway limits
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#091020] border border-emerald-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mean AI Confidence</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  High Fidelity
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-emerald-400">
                {summaryMetrics.avgConfidence}%
              </div>
              <div className="text-[11px] font-sans text-slate-400 mt-1">
                Based on historical traffic signals
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#091020] border border-rose-500/20">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Brain className="w-3.5 h-3.5 text-rose-400" />
                  <span>Cognitive Signals</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {summaryMetrics.totalInsights} Total
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-rose-300">
                {summaryMetrics.anomaliesCount}{" "}
                <span className="text-xs text-slate-400 font-normal font-sans">
                  flagged anomalies
                </span>
              </div>
              <div className="text-[11px] font-sans text-slate-400 mt-1">
                Real-time pattern analysis
              </div>
            </div>
          </div>

          {/* Controls & Tab Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            {/* Cyber Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[#070a13] border border-white/8 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab("thresholds")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs font-sans transition-all ${
                  activeTab === "thresholds"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>AI Thresholds</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 border border-cyan-500/30 font-mono tabular-nums font-semibold">
                  {filteredThresholds.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("insights")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-lg text-xs font-sans transition-all ${
                  activeTab === "insights"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium"
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                <span>Insights Feed</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-[10px] text-cyan-300 border border-cyan-500/30 font-mono tabular-nums font-semibold">
                  {filteredInsights.length}
                </span>
              </button>
            </div>

            {/* Service Scope Selector */}
            {servicesList.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-sans font-medium text-slate-400 sm:inline flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyan-400" /> Service:
                </span>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full sm:w-auto px-3.5 py-2 bg-[#070a13] border border-blue-500/20 rounded-xl text-slate-200 text-xs font-sans focus:outline-none focus:border-cyan-500/60 transition-colors"
                >
                  <option value="">All Registered Services</option>
                  {servicesList.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Main Content Area */}
          <div className="min-h-100">
            {activeTab === "thresholds" && (
              <AIThresholdsTable
                thresholds={filteredThresholds}
                isLoading={thresholdsLoading}
              />
            )}

            {activeTab === "insights" && (
              <AIInsightsList
                insights={filteredInsights}
                isLoading={insightsLoading}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
