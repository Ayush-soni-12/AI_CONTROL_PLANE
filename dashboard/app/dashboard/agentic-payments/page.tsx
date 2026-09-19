"use client";

import { useState } from "react";
import {
  Bot,
  Wallet,
  Clock,
  ShieldCheck,
  Coins,
  Zap,
  ExternalLink,
  Sparkles,
  Sliders,
  RefreshCw,
  Fuel,
  FileText,
  CheckCircle2,
  Lock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { useCheckAuth } from "@/hooks/useSignals";
import {
  useAgentSettings,
  useUpdateAgentSettings,
  useAgentPayments,
  useFujiGas,
  useSeedDemoPayments,
} from "@/hooks/useAgenticPayments";

import { GasTelemetryBadge } from "@/components/dashboard/agentic-payments/GasTelemetryBadge";
import { EncryptedLedgerTable } from "@/components/dashboard/agentic-payments/EncryptedLedgerTable";
import { WalletSettingsModal } from "@/components/dashboard/agentic-payments/WalletSettingsModal";

export default function AgenticPaymentsPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: settings, isLoading: isSettingsLoading, refetch: refetchSettings } = useAgentSettings();
  const { data: history, isLoading: isHistoryLoading, refetch: refetchHistory } = useAgentPayments();
  const { data: gas, refetch: refetchGas } = useFujiGas();

  const {
    mutate: saveSettings,
    isPending: isSaving,
    isSuccess: isSaved,
    error: saveError,
  } = useUpdateAgentSettings();

  const {
    mutate: seedDemoPayments,
    isPending: isSeeding,
    isSuccess: isSeeded,
  } = useSeedDemoPayments();

  // Settings modal open state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Derived financial metrics
  const payments = history?.payments ?? [];
  const successfulPayments = payments.filter(
    (p) => p.status === "verified" || p.status === "consumed"
  );
  const verifiedCount = successfulPayments.length;
  const totalEarnedAvax = successfulPayments.reduce(
    (sum, p) => sum + (p.amount_avax ?? 0),
    0
  );
  const totalEarnedEerc =
    successfulPayments.filter((p) => p.is_eerc).length *
    Number(settings?.eerc_payment_amount || "10");

  const now = new Date().getTime();
  const activeStreamsCount = payments.filter(
    (p) =>
      (p.status === "verified" || p.status === "consumed") &&
      p.access_granted_until &&
      new Date(p.access_granted_until).getTime() > now - 1000 * 60 * 15
  ).length;

  const handleRefreshAll = () => {
    refetchSettings();
    refetchHistory();
    refetchGas();
  };

  const handleSeedDemo = () => {
    seedDemoPayments(5);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] cyber-grid text-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Bot className="w-10 h-10 text-purple-400 animate-pulse" />
          </div>
          <p className="text-sm font-mono text-slate-400">Verifying session credentials...</p>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-500/20">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  [FINANCIAL MESH] Agentic Payments & Gas Telemetry
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Avalanche Fuji C-Chain & Zero-Knowledge Invoicing
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Agentic Payments & Confidential Invoices</span>
                <Sparkles className="w-5 h-5 text-purple-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Autonomous agent x402 micro-billing, confidential token streaming, gas fee analytics, and real time transaction settlement
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Demo Transaction Seeder (AC-6) */}
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Seed realistic test payments directly into database for UI verification"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
                <span>{isSeeding ? "Seeding Records..." : "Seed Demo Payments"}</span>
              </button>

              {/* Monetization Settings Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-200 hover:text-white border border-white/[0.08] hover:border-purple-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Monetization Settings</span>
              </button>

              {/* Sync Telemetry Button */}
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={isHistoryLoading || isSettingsLoading}
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 transition-all"
                title="Refresh financial telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              {/* Docs Link */}
              <a
                href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/blob/main/docs/AGENTIC_PAYMENTS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-slate-200 border border-white/[0.08] transition-all"
                title="View documentation"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* ── 4 KPI Telemetry Cards (AC-1) ────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Earned */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-emerald-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  Total Revenue
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Direct Vault
                </span>
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                  {totalEarnedAvax.toFixed(4)} <span className="text-xs font-normal text-slate-400">AVAX</span>
                </p>
                {totalEarnedEerc > 0 && (
                  <p className="text-xs font-mono font-semibold text-purple-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span>+{totalEarnedEerc} cAGT (Confidential)</span>
                  </p>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-500">
                Non-custodial micro-billing income
              </p>
            </div>

            {/* Card 2: Active Payment Streams */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-purple-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Active Streams
                </span>
                <span className={`w-2 h-2 rounded-full ${activeStreamsCount > 0 ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
              </div>
              <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                {activeStreamsCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Concurrencies</span>
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Active burst window micro-settlements
              </p>
            </div>

            {/* Card 3: Verified Invoices */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-cyan-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Settled Invoices
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  ERC-8004
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                {verifiedCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Verified</span>
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Cryptographically audited payments
              </p>
            </div>

            {/* Card 4: Fuji EVM Gas Price */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-amber-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  Fuji Gas Fee
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {gas?.congestion ?? "Nominal"}
                </span>
              </div>
              <p className="text-2xl font-bold font-mono text-white tracking-tight tabular-nums">
                {gas?.base_fee_gwei ?? 26.5}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Gwei</span>
              </p>
              <p className="text-[11px] font-mono text-slate-500">
                Live Avalanche C-Chain network rate
              </p>
            </div>
          </div>

          {/* ── Gas Telemetry Strip (AC-4) ─────────────────────────────── */}
          <GasTelemetryBadge />

          {/* ── Encrypted Ledger Table (AC-5) ──────────────────────────── */}
          <EncryptedLedgerTable payments={payments} isLoading={isHistoryLoading} />
        </div>
      </div>

      {/* ── Monetization Settings Modal ──────────────────────────────── */}
      <WalletSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(data) => {
          saveSettings(data);
          setIsSettingsOpen(false);
        }}
        isSaving={isSaving}
        isSaved={isSaved}
        saveError={saveError}
      />
    </>
  );
}
