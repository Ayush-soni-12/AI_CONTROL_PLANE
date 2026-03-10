"use client";

import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useCheckAuth } from "@/hooks/useSignals";
import { useAdaptiveTimeout } from "@/hooks/useAdaptiveTimeout";
import { AdaptiveTimeoutSummary } from "@/components/dashboard/adaptive-timeout/AdaptiveTimeoutSummary";
import { AdaptiveTimeoutEndpointCard } from "@/components/dashboard/adaptive-timeout/AdaptiveTimeoutEndpointCard";
import { AdaptiveTimeoutUsage } from "@/components/dashboard/adaptive-timeout/AdaptiveTimeoutUsage";
import { Timer, LogIn, AlertTriangle, CheckCircle } from "lucide-react";

export default function AdaptiveTimeoutPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: endpoints = [], isLoading, error } = useAdaptiveTimeout();

  // Auth guard
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
  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Timer className="w-6 h-6 text-orange-400" />
                Adaptive Timeout
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                AI-tuned timeout thresholds per endpoint. When latency spikes,
                the SDK automatically enforces a tighter timeout to fail fast
                and protect your connection pool.
              </p>
            </div>
          </div>

          {/* ── Summary cards ─────────────────────────────────────────── */}
          <AdaptiveTimeoutSummary endpoints={endpoints} />

          {/* ── Endpoint cards ─────────────────────────────────────────── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Per-Endpoint Status
            </h3>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-900/50 border border-gray-800 h-32 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-400 font-medium">
                  Failed to load status
                </p>
                <p className="text-xs text-gray-500 mt-1">{error.message}</p>
                <p className="text-xs text-gray-600 mt-2">
                  Make sure the control plane is running and the
                  /api/adaptive-timeout/status endpoint is registered.
                </p>
              </div>
            ) : endpoints.length === 0 ? (
              <div className="rounded-2xl bg-gray-900/40 border border-gray-800/50 p-10 text-center">
                <Timer className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                  No endpoints tracked yet
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Start sending signals from your SDK — the AI will begin
                  monitoring latency automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {endpoints.map((ep) => (
                  <AdaptiveTimeoutEndpointCard
                    key={`${ep.service_name}-${ep.endpoint}`}
                    ep={ep}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── How to use ────────────────────────────────────────────── */}
          <AdaptiveTimeoutUsage />
        </div>
      </div>
    </>
  );
}
