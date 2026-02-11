"use client";

import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { DynamicMetrics } from "@/components/dashboard/DynamicMetrics";
import { DynamicChart } from "@/components/dashboard/DynamicChart";
import { DynamicErrorChart } from "@/components/dashboard/DynamicErrorChart";
import { DynamicServices } from "@/components/dashboard/DynamicServices";
import { TimeRangeSelector, TimeRange } from "@/components/TimeRangeSelector";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { Server, LogIn, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

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
  const getServicesApiUrl = () => {
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
  };

  // Show loading while checking auth
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 mb-4">
            <LogIn className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Verifying authentication...</p>
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
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Header with Connection Status */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Server className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-5xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-linear">
                AI Control Plane
              </h1>
              <ConnectionStatus status={sseStatus} onReconnect={reconnectSSE} />
            </div>
            <p className="text-gray-400 text-lg ml-16">
              Real-time microservice monitoring and autonomous control
            </p>
          </div>

          {/* Dynamic Metrics - SSE handles own loading */}
          <DynamicMetrics />

          {/* Dynamic Charts - SSE handles own loading */}
          <DynamicChart />
          <DynamicErrorChart />

          {/* Time Range Selector */}
          <div className="mb-8">
            <TimeRangeSelector
              onRangeChange={handleRangeChange}
              currentRange={timeRange}
            />
          </div>

          {/* Services Header with Historical Indicator */}
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Services
            </h2>

            {isHistoricalMode && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
                <Database className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  Historical View
                </span>
              </div>
            )}

            <div className="h-px flex-1 bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent" />
          </div>

          {/* Dynamic Services List - SSE handles own loading */}
          <DynamicServices apiUrl={getServicesApiUrl()} />
        </div>
      </div>
    </>
  );
}
