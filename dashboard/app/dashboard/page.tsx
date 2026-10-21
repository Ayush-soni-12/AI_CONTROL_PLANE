/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { DynamicMetrics } from "@/components/dashboard/DynamicMetrics";
import { DashboardTelemetrySection } from "@/components/dashboard/DashboardTelemetrySection";
import { DynamicServices } from "@/components/dashboard/DynamicServices";
import { TimeRangeSelector, TimeRange } from "@/components/TimeRangeSelector";
import { LogIn, Database, Activity, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";

export default function DashboardPage() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("live");
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
    setIsHistoricalMode(range !== "live");

    if (range === "custom" && startDate && endDate) {
      setCustomDates({ start: startDate, end: endDate });
    }
  };

  // Build API URL based on selected time range
  const servicesApiUrl = useMemo(() => {
    if (timeRange === "live") {
      return "/api/sse/services";
    }

    const now = new Date();
    let start: Date;

    if (timeRange === "24h") {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === "7d") {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // custom
      start = customDates.start || new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const end = timeRange === "custom" && customDates.end ? customDates.end : now;

    return `/api/history/services?start_date=${start.toISOString()}&end_date=${end.toISOString()}`;
  }, [timeRange, customDates.start, customDates.end]);

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-[#fafafa]">
        <div className="text-center">
          <div className="inline-block p-4 rounded-xl bg-[#111113] border border-[#27272a] mb-4">
            <LogIn className="w-8 h-8 text-[#fafafa]" />
          </div>
          <p className="text-[#a1a1aa] text-xs font-mono">Verifying authentication...</p>
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
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-[#fafafa] relative">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Command Bar & Search Header */}
          <TopCommandHeader />

          {/* Page Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium tracking-wide bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Real-time Overview
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Autonomous Protection Loop
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#fafafa]">
                Neural Control
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl font-sans">
                Real-time microservice signals, anomaly mitigation, and adaptive traffic orchestration
              </p>
            </div>
          </div>

          {/* 1. Dynamic Metrics - SSE streams live telemetry */}
          <DynamicMetrics />

          {/* 2. Real-time Telemetry & Protection Streams with Service Filter and Configurable Limit */}
          <DashboardTelemetrySection />

          {/* 3. Time Range Selector */}
          <div>
            <TimeRangeSelector
              onRangeChange={handleRangeChange}
              currentRange={timeRange}
            />
          </div>

          {/* 4. Services Header with Historical Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-6 border-t border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold text-[#fafafa] tracking-tight">
                Registered Services
              </h2>
            </div>

            {isHistoricalMode && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18181b] border border-[#27272a] text-xs font-mono text-[#a1a1aa]">
                <Database className="w-3.5 h-3.5 text-[#a1a1aa]" />
                <span>Historical View</span>
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
