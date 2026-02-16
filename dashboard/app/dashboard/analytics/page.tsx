"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { LogIn, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TrafficHeatmap } from "@/components/analytics/TrafficHeatmap";
import { PercentileChart } from "@/components/analytics/PercentileChart";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

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

  return (
    <>
    <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <TrendingUp className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Advanced Analytics
            </h1>
            <p className="text-gray-400 mt-1">
              Deep insights into traffic patterns and performance percentiles
            </p>
          </div>
        </div>

        {/* Percentile Analysis */}
        <PercentileChart />

        {/* Traffic Heatmap */}
        <TrafficHeatmap />

        {/* Insights */}
        <div className="bg-linear-to-br from-card to-purple-950/10 border border-purple-500/20 rounded-xl p-6 mt-5">
          <h3 className="text-xl font-bold text-gray-200 mb-4">
            💡 Understanding the Data
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-purple-300 mb-2">
                Percentiles Explained
              </h4>
              <ul className="text-gray-400 space-y-1 list-disc list-inside">
                <li>
                  <span className="text-green-400">p50 (Median)</span> - Half of
                  requests are faster
                </li>
                <li>
                  <span className="text-yellow-400">p95</span> - 95% of requests
                  are faster (excludes outliers)
                </li>
                <li>
                  <span className="text-red-400">p99</span> - 99% of requests
                  are faster (catches worst cases)
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-purple-300 mb-2">
                Traffic Heatmap Tips
              </h4>
              <ul className="text-gray-400 space-y-1 list-disc list-inside">
                <li>Darker colors = more traffic</li>
                <li>Identify peak hours for capacity planning</li>
                <li>Spot unusual patterns or anomalies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
