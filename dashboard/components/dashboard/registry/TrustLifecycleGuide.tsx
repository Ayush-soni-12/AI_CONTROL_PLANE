"use client";

import { Wallet, ShieldCheck, TrendingUp, Zap, HelpCircle } from "lucide-react";

export function TrustLifecycleGuide() {
  const steps = [
    {
      num: "01",
      title: "Connect Wallet",
      desc: "Link your MetaMask wallet to the Avalanche Fuji Testnet (Chain 43113) to manage on-chain agent identities.",
      icon: Wallet,
      badge: "Step 1",
      color: "purple",
    },
    {
      num: "02",
      title: "Register & Stake",
      desc: "Claim a unique Agent ID and deposit 0.01 AVAX into the ERC-8004 contract to prevent sybil attacks and spam bots.",
      icon: ShieldCheck,
      badge: "0.01 AVAX",
      color: "cyan",
    },
    {
      num: "03",
      title: "Build Trust Score",
      desc: "Agents start with a base Trust Score of 50. As agents interact responsibly without generating anomalies, their score increases.",
      icon: TrendingUp,
      badge: "Score 0-100",
      color: "emerald",
    },
    {
      num: "04",
      title: "Bypass Rate Limits",
      desc: "High-trust agents (Score >= 60) can autonomously pay x402 payment invoices on Avalanche to bypass rate limits.",
      icon: Zap,
      badge: "x402 Micro-Billing",
      color: "cyan",
    },
  ];

  return (
    <div className="rounded-xl bg-[#091020]/80 border border-cyan-500/20 hover:border-cyan-500/40 p-5 sm:p-6 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,240,255,0.05)] space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-white">
              ERC-8004 Trust Lifecycle
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              How the &quot;DMV for AI&quot; establishes verifiable agent trust
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
          Decentralized Protocol
        </span>
      </div>

      {/* 4 Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="p-4 rounded-xl bg-[#070d1a]/80 border border-white/[0.08] hover:border-cyan-500/30 transition-all space-y-2.5 group relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-cyan-400 transition-colors">
                  {step.num}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.05] text-slate-300 border border-white/[0.06]">
                  {step.badge}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 group-hover:text-cyan-200 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {step.title}
                </h4>
              </div>

              <p className="text-[11px] font-mono text-slate-400 leading-relaxed">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
