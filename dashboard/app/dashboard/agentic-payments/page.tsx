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
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Bot className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-sm font-mono text-slate-300">Verifying session credentials...</p>
          <div className="w-32 h-1 bg-white/[0.06] rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-linear-to-r from-cyan-500 to-cyan-400 animate-pulse" />
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
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border  border-cyan-500/30">
                  [FINANCIAL MESH] Agentic Payments & Gas Telemetry
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  Avalanche Fuji C-Chain & Zero-Knowledge Invoicing
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Agentic Payments & Confidential Invoices</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Autonomous agent x402 micro-billing, confidential token streaming, gas fee analytics, and real time transaction settlement
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Demo Transaction Seeder */}
              <button
                type="button"
                onClick={handleSeedDemo}
                disabled={isSeeding}
                className="px-4 py-2 rounded-xl  bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-mono font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Seed realistic test payments directly into database for UI verification"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
                <span>{isSeeding ? "Seeding Records..." : "Seed Demo Payments"}</span>
              </button>

              {/* Monetization Settings Drawer Trigger */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-cyan-200 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Monetization Settings</span>
              </button>

              {/* Sync Telemetry Button */}
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={isHistoryLoading || isSettingsLoading}
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh financial telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isHistoryLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              {/* Docs Link */}
              <a
                href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/blob/main/docs/AGENTIC_PAYMENTS.md"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-purple-300 border border-white/[0.08] hover:border-purple-500/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="View documentation"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* ── 4 KPI Telemetry Cards (Matching Overrides Style) ──────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Earned */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-emerald-500/20 shadow-[0_4px_20px_rgba(0,230,153,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Total Revenue</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Direct Vault
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                  {totalEarnedAvax.toFixed(4)} <span className="text-xs font-normal text-slate-400">AVAX</span>
                </div>
                {totalEarnedEerc > 0 && (
                  <p className="text-xs font-mono font-semibold text-purple-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-purple-400" />
                    <span>+{totalEarnedEerc} cAGT (Confidential)</span>
                  </p>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Non-custodial micro-billing income
              </div>
            </div>

            {/* Card 2: Active Payment Streams */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Active Streams</span>
                </div>
                <span className={`w-2 h-2 rounded-full ${activeStreamsCount > 0 ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {activeStreamsCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Concurrencies</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active burst window micro-settlements
              </div>
            </div>

            {/* Card 3: Verified Invoices */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Settled Invoices</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  ERC-8004
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {verifiedCount}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Verified</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Cryptographically audited payments
              </div>
            </div>

            {/* Card 4: Fuji EVM Gas Price */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fuji Gas Fee</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {gas?.congestion ?? "Nominal"}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-300">
                {gas?.base_fee_gwei ?? 26.5}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Gwei</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Live Avalanche C-Chain network rate
              </div>
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
