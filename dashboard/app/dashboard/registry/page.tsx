"use client";

import React, { useState, useMemo } from "react";
import { ethers } from "ethers";
import {
  Shield,
  Wallet,
  Coins,
  Star,
  Users,
  ExternalLink,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertCircle,
  LogIn,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { useCheckAuth } from "@/hooks/useSignals";
import {
  useRegisteredAgents,
  useSeedDemoAgents,
} from "@/hooks/useAgentRegistry";

import { RegisterAgentForm } from "@/components/dashboard/registry/RegisterAgentForm";
import { AgentScoreLookup } from "@/components/dashboard/registry/AgentScoreLookup";
import { RegisteredAgentsTable } from "@/components/dashboard/registry/RegisteredAgentsTable";
import { TrustLifecycleGuide } from "@/components/dashboard/registry/TrustLifecycleGuide";
import { RegistryTelemetryBadge } from "@/components/dashboard/registry/RegistryTelemetryBadge";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS ||
  "0x29243AD8082F5f0CEdCa89ED85db662975E5d96A";

export default function AgentRegistryPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Web3 MetaMask State
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Agent Registry Queries
  const { data: registryData, isLoading: isAgentsLoading, refetch: refetchAgents } = useRegisteredAgents();
  const { mutate: seedDemo, isPending: isSeeding } = useSeedDemoAgents();

  const agents = registryData?.agents ?? [];
  const totalAgents = agents.length;

  // Derived Telemetry Metrics
  const avgTrustScore = useMemo(() => {
    if (agents.length === 0) return 75;
    const sum = agents.reduce((acc, a) => acc + (a.trust_score ?? 50), 0);
    return Math.round(sum / agents.length);
  }, [agents]);

  const totalStakedAvax = useMemo(() => {
    return agents.reduce((acc, a) => acc + (a.staked_balance_avax ?? 0.01), 0);
  }, [agents]);

  const connectWallet = async () => {
    setWalletError(null);
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setWalletError("Please install MetaMask to connect with Avalanche Fuji.");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();

      setWalletAddress(address);
      setProvider(browserProvider);
    } catch (err: any) {
      setWalletError(err.message || "Failed to connect MetaMask wallet.");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setProvider(null);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] cyber-grid text-slate-100">
        <div className="text-center space-y-3">
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
            <Shield className="w-10 h-10 text-cyan-400 animate-pulse" />
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  [IDENTITY MESH] Global Agent Registry & ERC-8004 Trust
                </span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  The &quot;DMV for AI&quot; • Avalanche Fuji C-Chain
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Global Agent Registry</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Register autonomous AI agents, stake anti-spam deposits, and inspect ERC-8004 trust scores on Avalanche Fuji
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Wallet Connection Button */}
              {!walletAddress ? (
                <button
                  type="button"
                  onClick={connectWallet}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5 text-black" />
                  <span>Connect Wallet</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#091020]/80 border border-cyan-500/30 text-xs font-mono shadow-[0_0_10px_rgba(168,85,247,0.15)]">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-cyan-300 font-bold">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button
                    type="button"
                    onClick={disconnectWallet}
                    className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors ml-1 cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              )}

              {/* Seed Demo Records */}
              <button
                type="button"
                onClick={() => seedDemo()}
                disabled={isSeeding}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-200 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Populate test agents in registry"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                <span>Seed Demo Agents</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => refetchAgents()}
                disabled={isAgentsLoading}
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh registry data"
              >
                <RefreshCw className={`w-4 h-4 ${isAgentsLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              {/* Contract Link */}
              <a
                href={`https://testnet.snowtrace.io/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-400 hover:text-purple-300 border border-white/[0.08] hover:border-purple-500/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="View ERC8004Registry contract on Snowtrace"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Wallet Error Alert */}
          {walletError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{walletError}</span>
            </div>
          )}

          {/* ── 4 KPI Telemetry Cards (Matching Overrides Style) ──────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Registered Agents */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Registered Agents</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  ERC-8004
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {totalAgents}
                <span className="text-xs font-normal text-slate-400 ml-1.5">Identities</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Verified on Avalanche Fuji C-Chain
              </div>
            </div>

            {/* Card 2: Average Trust Score */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-emerald-500/20 shadow-[0_4px_20px_rgba(0,230,153,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Star className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Avg Trust Score</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Network Health
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {avgTrustScore}
                <span className="text-xs font-normal text-slate-400 ml-1">/ 100</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Consensus reputation rating
              </div>
            </div>

            {/* Card 3: Total Staked AVAX */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Coins className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Anti-Spam Staked Pool</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Collateral
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {totalStakedAvax.toFixed(4)}
                <span className="text-xs font-normal text-slate-400 ml-1.5">AVAX</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                0.01 AVAX security stake per agent
              </div>
            </div>

            {/* Card 4: Fuji EVM Contract Status */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-amber-500/20 shadow-[0_4px_20px_rgba(245,158,11,0.05)] transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fuji Registry Status</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Connected
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-white truncate" title={CONTRACT_ADDRESS}>
                {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Chain ID 43113 (Avalanche Fuji)
              </div>
            </div>
          </div>

          {/* ── Registry Telemetry Strip (Matching Payments page) ──────── */}
          <RegistryTelemetryBadge
            contractAddress={CONTRACT_ADDRESS}
            totalAgents={totalAgents}
            totalStakedAvax={totalStakedAvax}
          />

          {/* ── Interactive Staking & Score Lookup Grid ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* Left: Register Agent Form */}
            <RegisterAgentForm
              walletAddress={walletAddress}
              provider={provider}
              contractAddress={CONTRACT_ADDRESS}
              onConnectWallet={connectWallet}
              onSuccessRegistered={() => refetchAgents()}
            />

            {/* Right: Agent Score Lookup */}
            <AgentScoreLookup
              contractAddress={CONTRACT_ADDRESS}
            />
          </div>

          {/* ── How It Works (Trust Lifecycle Guide) ────────────────────── */}
          <TrustLifecycleGuide />

          {/* ── Registered Agents Directory Table ───────────────────────── */}
          <RegisteredAgentsTable
            agents={agents}
            isLoading={isAgentsLoading}
            onSeedDemo={() => seedDemo()}
            isSeeding={isSeeding}
          />
        </div>
      </div>
    </>
  );
}
