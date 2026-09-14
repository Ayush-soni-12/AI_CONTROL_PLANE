"use client";

import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { DynamicMetrics } from "@/components/dashboard/DynamicMetrics";
import { DynamicChart } from "@/components/dashboard/DynamicChart";
import { DynamicErrorChart } from "@/components/dashboard/DynamicErrorChart";
import { DynamicServices } from "@/components/dashboard/DynamicServices";
import { TimeRangeSelector, TimeRange } from "@/components/TimeRangeSelector";
import { LogIn, Database, Sparkles, Activity, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";

export default function DashboardPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customDates, setCustomDates] = useState<{ start?: Date; end?: Date }>(
    {},
  );
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);

  // Check authentication (validates token)
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Get SSE connection status for indicator
  const { status: sseStatus, reconnect: reconnectSSE } = useServices();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  // Handle time range changes
  const handleRangeChange = (
    range: TimeRange,
    startDate?: Date,
    endDate?: Date,
  ) => {
    setTimeRange(range);
    setIsHistoricalMode(range !== "7d");

    if (range === "custom" && startDate && endDate) {
      setCustomDates({ start: startDate, end: endDate });
    }
  };

  // Build API URL based on selected time range
  const servicesApiUrl = useMemo(() => {
    if (timeRange === "7d") {
      return "/api/sse/services";
    }

    const now = new Date();
    let start: Date;

    if (timeRange === "30d") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "90d") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      // custom
      start = customDates.start!;
    }

    const end = timeRange === "custom" ? customDates.end! : now;

    return `/api/history/services?start_date=${start.toISOString()}&end_date=${end.toISOString()}`;
  }, [timeRange, customDates.start, customDates.end]);

  // Show loading while checking auth
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

  // If not authenticated, show nothing (will redirect)
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

          {/* Page Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-blue-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME OVERVIEW
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Autonomous Protection Loop
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Mission Control</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time microservice signals, anomaly mitigation, and adaptive traffic orchestration
              </p>
            </div>
          </div>

          {/* 1. Dynamic Metrics - SSE streams live telemetry */}
          <DynamicMetrics />

          {/* 2. Real-time Telemetry & Error Rate Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DynamicChart />
            <DynamicErrorChart />
          </div>

          {/* 3. Time Range Selector */}
          <div>
            <TimeRangeSelector
              onRangeChange={handleRangeChange}
              currentRange={timeRange}
            />
          </div>

          {/* 4. Services Header with Historical Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4 border-t border-blue-500/15">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
                Registered Services
              </h2>
            </div>

            {isHistoricalMode && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-400 font-mono">
                  Historical View
                </span>
              </div>
            )}
          </div>

          {/* 5. Dynamic Services Grid - SSE streams live services */}
          <DynamicServices apiUrl={servicesApiUrl} />
        </div>
      </div>
    </>
  );
}
