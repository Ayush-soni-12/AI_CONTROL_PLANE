"use client";

import { useState } from "react";
import {
  Shield,
  Plus,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  LogIn,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { CreateOverrideForm } from "@/components/dashboard/overrides/CreateOverrideForm";
import { OverrideCard } from "@/components/dashboard/overrides/OverrideCard";
import { useOverrides } from "@/hooks/useOverrides";
import { useCheckAuth } from "@/hooks/useSignals";

export default function OverridesPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: overrides, isLoading, error } = useOverrides();
  const [showForm, setShowForm] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  const active = overrides?.filter((o) => o.is_active) ?? [];
  const expired = overrides?.filter((o) => !o.is_active) ?? [];

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
  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ── Header ──────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                Manual Overrides
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Override specific numeric thresholds the AI uses. The AI still
                runs — it just uses your value for the thresholds you set.
              </p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Override
            </button>
          </div>

          {/* ── CreateOverrideForm ───────────────────────────── */}
          {showForm && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <CreateOverrideForm onClose={() => setShowForm(false)} />
            </div>
          )}

          {/* ── How it works banner ──────────────────────────── */}
          {!showForm && active.length === 0 && !isLoading && (
            <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5">
              <div className="flex gap-3">
                <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-300 mb-1">
                    How threshold overrides work
                  </p>
                  <ul className="text-xs text-gray-400 leading-relaxed space-y-1 list-disc list-inside">
                    <li>
                      The AI engine always runs — overrides don&apos;t bypass it
                    </li>
                    <li>
                      Set a threshold: the AI uses <em>your</em> value instead
                      of its computed one
                    </li>
                    <li>
                      Leave a threshold unset: the AI keeps full control of that
                      specific decision
                    </li>
                    <li>
                      Overrides expire automatically — AI resumes full control
                      after
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── Active Overrides (OverrideCard) ──────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-gray-300">
                Active Overrides
                {active.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                    {active.length}
                  </span>
                )}
              </h3>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-gray-900/50 border border-gray-800 h-32 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <p className="text-sm text-red-400">
                    Failed to load overrides. Is the control plane running?
                  </p>
                </div>
              </div>
            ) : active.length === 0 ? (
              <div className="rounded-2xl bg-gray-900/40 border border-gray-800/50 p-8 text-center">
                <Shield className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">
                  No active overrides
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  The AI engine is making all decisions autonomously.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((o) => (
                  <OverrideCard key={o.id} override={o} />
                ))}
              </div>
            )}
          </div>

          {/* ── Expired Overrides (OverrideCard) ─────────────── */}
          {expired.length > 0 && (
            <div>
              <button
                onClick={() => setShowExpired((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors mb-3"
              >
                <Clock className="w-4 h-4" />
                Expired / Cancelled ({expired.length})
                {showExpired ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showExpired && (
                <div className="grid gap-3 sm:grid-cols-2 animate-in slide-in-from-top-1 duration-200">
                  {expired.map((o) => (
                    <OverrideCard key={o.id} override={o} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
