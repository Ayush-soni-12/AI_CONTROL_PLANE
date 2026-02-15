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
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl blur-md opacity-50" />
                <div className="relative p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                  <Brain className="w-8 h-8 text-purple-400" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  AI Insights
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <p className="text-gray-400">
                    AI-powered threshold optimization and pattern detection
                  </p>
                </div>
              </div>
            </div>
          </div>

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
                className="px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
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
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab("thresholds")}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
                ${
                  activeTab === "thresholds"
                    ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/50 hover:border-gray-600"
                }
              `}
            >
              <TrendingUp className="w-5 h-5" />
              AI Thresholds
              {thresholdsData && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-xs">
                  {thresholdsData.total}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("insights")}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300
                ${
                  activeTab === "insights"
                    ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/50 shadow-lg shadow-purple-500/10"
                    : "text-gray-400 hover:text-white bg-gray-800/50 border border-gray-700/50 hover:border-gray-600"
                }
              `}
            >
              <Sparkles className="w-5 h-5" />
              Insights Feed
              {insightsData && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-xs">
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
