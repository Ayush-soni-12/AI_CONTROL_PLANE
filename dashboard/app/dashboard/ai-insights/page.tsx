"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { useAIInsights, useAIThresholds } from "@/hooks/useAIInsights";
import { AIThresholdsTable } from "@/components/dashboard/AIThresholdsTable";
import { AIInsightsList } from "@/components/dashboard/AIInsightsList";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Brain, LogIn, TrendingUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AIInsightsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"thresholds" | "insights">(
    "thresholds",
  );
  const [selectedService, setSelectedService] = useState<string>("");

  // Check authentication
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Fetch AI data
  const { data: thresholdsData, isLoading: thresholdsLoading } =
    useAIThresholds();
  const { data: insightsData, isLoading: insightsLoading } = useAIInsights(
    selectedService || undefined,
    50,
  );

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

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

  // Get unique service names for filter
  const uniqueServices = new Set<string>();
  insightsData?.insights.forEach((insight) =>
    uniqueServices.add(insight.service_name),
  );
  thresholdsData?.thresholds.forEach((threshold) =>
    uniqueServices.add(threshold.service_name),
  );
  const servicesList = Array.from(uniqueServices).sort();

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Header */}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-8 text-center sm:text-left">
            <div className="p-4 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shrink-0">
              <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                AI Insights
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-1">
                AI-powered threshold optimization and pattern detection
              </p>
            </div>
          </div>

        <div className="h-px w-full bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent mb-6" />

          {/* Service Filter */}
          {servicesList.length > 0 && (
            <div className="mb-6">
              <label
                htmlFor="service-filter"
                className="block text-sm font-medium text-gray-400 mb-2"
              >
                Filter by Service
              </label>
              <select
                id="service-filter"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white text-sm focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all appearance-none pr-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 1rem center",
                  backgroundSize: "1em",
                }}
              >
                <option value="">All Services</option>
                {servicesList.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-8">
            <button
              onClick={() => setActiveTab("thresholds")}
              className={`
                flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 w-full sm:w-auto text-sm sm:text-base
                ${
                  activeTab === "thresholds"
                    ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/50 hover:border-gray-600"
                }
              `}
            >
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>AI Thresholds</span>
              {thresholdsData && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] sm:text-xs shrink-0">
                  {thresholdsData.total}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("insights")}
              className={`
                flex items-center justify-center sm:justify-start gap-2 px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-300 w-full sm:w-auto text-sm sm:text-base
                ${
                  activeTab === "insights"
                    ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/50 hover:border-gray-600"
                }
              `}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Insights Feed</span>
              {insightsData && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-[10px] sm:text-xs shrink-0">
                  {insightsData.total}
                </span>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="min-h-[400px]">
            {activeTab === "thresholds" && (
              <AIThresholdsTable
                thresholds={
                  selectedService
                    ? thresholdsData?.thresholds.filter(
                        (t) => t.service_name === selectedService,
                      ) || []
                    : thresholdsData?.thresholds || []
                }
                isLoading={thresholdsLoading}
              />
            )}

            {activeTab === "insights" && (
              <AIInsightsList
                insights={insightsData?.insights || []}
                isLoading={insightsLoading}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
