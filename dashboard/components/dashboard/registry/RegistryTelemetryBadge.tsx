"use client";

import { Shield, ExternalLink, Activity, Coins, Sparkles } from "lucide-react";

interface RegistryTelemetryBadgeProps {
  contractAddress: string;
  totalAgents: number;
  totalStakedAvax: number;
}

export function RegistryTelemetryBadge({
  contractAddress,
  totalAgents,
  totalStakedAvax,
}: RegistryTelemetryBadgeProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#091020]/80 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.05)]">
      {/* Left: Chain & Registry Protocol Label */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              Avalanche Fuji EVM
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Chain 43113
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Real time agent registry & ERC-8004 trust verification
          </p>
        </div>
      </div>

      {/* Right: Telemetry chips */}
      <div className="flex items-center gap-3">
        {/* Contract Address Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono">
          <span className="text-slate-400">Contract:</span>
          <span className="font-bold text-purple-300 tabular-nums font-mono" title={contractAddress}>
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
          </span>
        </div>

        {/* Min Anti-Spam Deposit Chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
          <span className="text-slate-400">Stake Per Agent:</span>
          <span className="font-bold text-cyan-300 tabular-nums">0.01 AVAX</span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active</span>
        </div>

        {/* Snowtrace Explorer Link */}
        <a
          href={`https://testnet.snowtrace.io/address/${contractAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          title="Open Snowtrace Testnet Explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
