"use client";

import { useSignals, useCheckAuth } from "@/hooks/useSignals";
import { aggregateServices } from "@/lib/function";
import { MetricCard } from "@/components/cards/MetricCard";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { LatencyChart } from "@/components/cards/LatencyChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Zap,
  AlertTriangle,
  TrendingUp,
  Server,
  LogIn,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default function DashboardPage() {
  const router = useRouter();

  // Check authentication (validates token)
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Fetch signals data
  const { data: signals, isLoading: isSignalsLoading, error } = useSignals();

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center p-8 rounded-2xl border border-red-500/20 bg-card/50 backdrop-blur-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2 text-red-400">
            Failed to load data
          </h2>
          <p className="text-gray-400 mb-2">
            Make sure Control Plane is running
          </p>
          <code className="text-sm bg-gray-900/50 px-4 py-2 rounded-lg inline-block border border-gray-800">
            http://localhost:8000
          </code>
        </div>
      </div>
    );
  }

  if (isSignalsLoading || !signals) {
    return (
      <div className="min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-80 bg-linear-to-r from-purple-500/20 to-pink-500/20 rounded-lg animate-pulse mb-3" />
            <div className="h-5 w-96 bg-gray-800/50 rounded animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton className="h-32 rounded-xl" key={i} />
            ))}
          </div>

          <Skeleton className="h-96 rounded-xl mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton className="h-64 rounded-xl" key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const services = aggregateServices(signals);
  const totalSignals = signals.length;
  const avgLatency =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + s.latency_ms, 0) / signals.length
      : 0;
  const errorRate =
    signals.length > 0
      ? signals.filter((s) => s.status === "error").length / signals.length
      : 0;
  const activeServices = services.length;

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Header with enhanced linear */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Server className="w-8 h-8 text-purple-400" />
              </div>
              <h1 className="text-5xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-linear">
                AI Control Plane
              </h1>
            </div>
            <p className="text-gray-400 text-lg ml-16">
              Real-time microservice monitoring and autonomous control
            </p>
          </div>

          {/* Metrics Cards with enhanced styling */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <MetricCard
              title="Total Signals"
              value={totalSignals}
              icon={Activity}
              color="bg-blue-500/20"
            />

            <MetricCard
              title="Active Services"
              value={activeServices}
              icon={Zap}
              color="bg-purple-500/20"
            />

            <MetricCard
              title="Avg Latency"
              value={`${Math.round(avgLatency)}ms`}
              icon={TrendingUp}
              color="bg-green-500/20"
            />

            <MetricCard
              title="Error Rate"
              value={`${(errorRate * 100).toFixed(1)}%`}
              icon={AlertTriangle}
              color={errorRate > 0.1 ? "bg-red-500/20" : "bg-green-500/20"}
            />
          </div>

          {/* Latency Chart */}
          {signals.length > 0 && (
            <div className="mb-10">
              <LatencyChart signals={signals} />
            </div>
          )}

          {/* Services List */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Services
              </h2>
              <div className="h-px flex-1 bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent" />
            </div>

            {services.length === 0 ? (
              <div className="text-center py-16 bg-linear-to-br from-card to-purple-950/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
                <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
                  <Activity className="w-16 h-16 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-200">
                  No services detected
                </h3>
                <p className="text-gray-400 mb-6 text-lg">
                  Start sending signals from your services
                </p>
                <div className="inline-block">
                  <code className="text-sm bg-gray-900/80 px-6 py-3 rounded-lg border border-purple-500/30 text-purple-300">
                    curl -X POST http://localhost:8000/api/signals
                  </code>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <ServiceCard key={service.name} service={service} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
