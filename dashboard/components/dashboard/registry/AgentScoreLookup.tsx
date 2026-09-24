"use client";

import { useState } from "react";
import {
  Search,
  ShieldCheck,
  Star,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Wallet,
  Coins,
  Copy,
  Check,
  Zap,
  ExternalLink,
} from "lucide-react";
import { useAgentLookup, AgentLookupResult } from "@/hooks/useAgentRegistry";

interface AgentScoreLookupProps {
  contractAddress: string;
  onSelectAgent?: (agentId: string) => void;
}

const SAMPLE_AGENTS = [
  "agent_good_market_v1",
  "agent_weather_oracle_v2",
  "agent_trading_bot_v2",
  "agent_malicious_scraper_v0",
];

export function AgentScoreLookup({
  contractAddress,
}: AgentScoreLookupProps) {
  const [searchInput, setSearchInput] = useState("");
  const [queriedAgent, setQueriedAgent] = useState<string | null>("agent_good_market_v1");
  const [copiedWallet, setCopiedWallet] = useState(false);

  const { data: agent, isLoading, isError, error, refetch } = useAgentLookup(queriedAgent);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setQueriedAgent(searchInput.trim());
  };

  const handleSelectSample = (sample: string) => {
    setSearchInput(sample);
    setQueriedAgent(sample);
  };

  const handleCopyWallet = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const score = agent?.trust_score ?? 50;
  const isRevoked = agent?.is_revoked ?? false;
  const isHighTrust = score >= 80 && !isRevoked;
  const isMediumTrust = score >= 60 && score < 80 && !isRevoked;
  const isLowTrust = score < 60 || isRevoked;

  return (
    <div className="relative p-5 rounded-xl bg-[#091020]/80 border border-cyan-500/20 hover:border-cyan-500/40 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,240,255,0.05)] flex flex-col justify-between space-y-4 overflow-hidden">
      {/* Top Ambient Glow */}
      <div className="absolute inset-0 bg-linear-to-r from-cyan-500/5 via-purple-500/5 to-transparent rounded-xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                ERC-8004 REPUTATION
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">On-Chain Verifier</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
              Check Agent Trust Score
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
          Instant RPC Lookup
        </span>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleLookup} className="relative space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter Agent ID (e.g. agent_good_market_v1)"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#091020] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] text-xs font-mono text-white placeholder-slate-500 transition-all focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !searchInput.trim()}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-black" /> : <Search className="w-3.5 h-3.5 text-black" />}
            <span>Lookup</span>
          </button>
        </div>

        {/* Quick Sample Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-mono text-slate-500">Sample Agents:</span>
          {SAMPLE_AGENTS.map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#070d1a]/80 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 border border-white/[0.06] hover:border-cyan-500/30 transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </form>

      {/* Result Display Box */}
      {isLoading ? (
        <div className="p-5 rounded-xl bg-[#070d1a]/80 border border-white/[0.06] flex items-center justify-center space-x-3">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-slate-400">Querying Avalanche Fuji contract...</span>
        </div>
      ) : isError ? (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{error?.message || "Agent not found in registry"}</span>
        </div>
      ) : agent && !agent.is_registered ? (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Agent &quot;{agent.agent_id}&quot; is not registered on Avalanche Fuji</span>
          </div>
          <span className="text-[10px] text-slate-400">Score 0/100</span>
        </div>
      ) : agent ? (
        <div className="p-3.5 rounded-xl bg-[#070d1a]/80 border border-cyan-500/20 space-y-3 animate-in fade-in duration-200">
          {/* Top Info */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {agent.agent_id}
                </span>
                {/* Status Pill */}
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  isRevoked
                    ? "bg-red-500/15 text-red-400 border-red-500/30"
                    : isHighTrust
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                }`}>
                  {isRevoked ? "REVOKED" : isHighTrust ? "VERIFIED TRUSTED" : "REGISTERED"}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                {agent.name || "Autonomous Agent Identity"}
              </p>
            </div>

            {/* Score Star Badge */}
            <div className="flex flex-col items-end">
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border ${
                isRevoked
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : isHighTrust
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
              }`}>
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{score} / 100</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-0.5 uppercase">
                {agent.tier || "Reputation Tier"}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Owner Wallet */}
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-0.5">
              <span className="text-[10px] text-slate-500 block">OWNER WALLET</span>
              <div className="flex items-center justify-between">
                <span className="text-white truncate" title={agent.owner_wallet}>
                  {agent.owner_wallet ? `${agent.owner_wallet.slice(0, 6)}...${agent.owner_wallet.slice(-4)}` : "0x00...00"}
                </span>
                {agent.owner_wallet && (
                  <button
                    type="button"
                    onClick={() => handleCopyWallet(agent.owner_wallet)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
                    title="Copy wallet address"
                  >
                    {copiedWallet ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>

            {/* Staked Balance */}
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04] space-y-0.5">
              <span className="text-[10px] text-slate-500 block">STAKED DEPOSIT</span>
              <span className="text-cyan-300 font-bold">
                {agent.staked_balance_avax ? `${agent.staked_balance_avax.toFixed(4)} AVAX` : "0.0100 AVAX"}
              </span>
            </div>
          </div>

          {/* x402 Bypass Status Banner */}
          <div className={`p-2 rounded-xl border text-xs font-mono flex items-center justify-between ${
            score >= 60 && !isRevoked
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/20 text-amber-300"
          }`}>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>
                {score >= 60 && !isRevoked
                  ? "Eligible for x402 Rate-Limit Payment Bypass"
                  : "Insufficient Score for Autonomous Bypass (Threshold 60)"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {agent.lookup_source === "on_chain" ? "Verified On-Chain" : "Cached Registry"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
