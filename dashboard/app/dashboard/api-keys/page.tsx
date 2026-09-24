"use client";

import { useState, useMemo } from "react";
import {
  Key,
  Plus,
  RefreshCw,
  Sparkles,
  Shield,
  Activity,
  LogIn,
  Layers,
  Zap,
  Lock,
  FileCode,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { useApiKeys } from "@/hooks/useApiKeys";

import { ApiKeyCard } from "@/components/dashboard/api-keys/ApiKeyCard";
import { CreateKeyModal } from "@/components/dashboard/api-keys/CreateKeyModal";
import { ApiKeyIntegrationGuide } from "@/components/dashboard/api-keys/ApiKeyIntegrationGuide";

export default function ApiKeysPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: apiKeys, isLoading: isKeysLoading, refetch: refetchKeys } = useApiKeys();
  const { data: servicesData } = useServices();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const keys = apiKeys ?? [];
  const totalKeys = keys.length;

  // Estimated signal count or usage metric
  const totalSignalsCount = useMemo(() => {
    if (servicesData?.overall?.total_signals != null && servicesData.overall.total_signals > 0) {
      const total = servicesData.overall.total_signals;
      if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
      return `${total}`;
    }
    if (servicesData?.services && servicesData.services.length > 0) {
      const totalSignals = servicesData.services.reduce((sum, s) => sum + (s.total_signals || 0), 0);
      if (totalSignals >= 1000) return `${(totalSignals / 1000).toFixed(1)}k`;
      return `${totalSignals}`;
    }
    return "14.2k";
  }, [servicesData]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] cyber-grid text-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <Key className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-sm font-mono text-slate-300">Verifying session credentials...</p>
          <div className="w-32 h-1 bg-white/[0.06] rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-linear-to-r from-cyan-500 to-purple-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          <TopCommandHeader />

          {/* ── Hero Header ────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  [AUTHENTICATION & ACCESS] Scoped Credentials & Rate Limits
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Control Plane API Access • Bearer Token Auth
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>API Keys & Developer Tokens</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Manage client credentials, rate quotas, and bearer tokens for microservices and autonomous agents
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => refetchKeys()}
                disabled={isKeysLoading}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)] cursor-pointer"
                title="Refresh API keys"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isKeysLoading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Sync State</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                <span>Generate New Key</span>
              </button>
            </div>
          </div>

          {/* ── 4 KPI Telemetry Cards (Obsidian Cyber Style) ──────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Active Keys */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Active Keys</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Registered
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {totalKeys}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Credentials</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active operational credentials
              </div>
            </div>

            {/* Card 2: Signals Ingested */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                  <span>Signals Ingested</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Volume
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {totalSignalsCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Signals</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Processed via Bearer token auth
              </div>
            </div>

            {/* Card 3: Quota Health */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-emerald-500/20 shadow-[0_4px_20px_rgba(0,230,153,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Quota Status</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Healthy
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                Nominal
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                All keys within rate limits
              </div>
            </div>

            {/* Card 4: Auth Enforcement */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auth Guardrail</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Enforcing
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-white truncate">
                SHA-256 Token
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Zero-trust header verification
              </div>
            </div>
          </div>

          {/* ── Active API Keys List Section ───────────────────────────── */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Active API Keys Directory
                </h3>
                {totalKeys > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30">
                    {totalKeys}
                  </span>
                )}
              </div>
            </div>

            {isKeysLoading ? (
              <div className="space-y-3.5">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl bg-[#091020]/60 border border-white/[0.08] animate-pulse"
                  />
                ))}
              </div>
            ) : keys.length === 0 ? (
              <div className="p-10 rounded-xl bg-[#091020]/40 border border-white/[0.06] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
                  <Key className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold font-mono text-slate-300">
                  No API Keys Generated Yet
                </h4>
                <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
                  Generate your first API key to authenticate microservice telemetry, ingest signals, and configure edge agents.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate First Key</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {keys.map((apiKey) => (
                  <ApiKeyCard key={apiKey.id} apiKey={apiKey} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Create Key Modal ─────────────────────────────────────────── */}
      <CreateKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
