"use client";

import { useState, useEffect, useMemo } from "react";
import { Waves, Zap, Clock, Wallet, Shield, Check, Copy, ArrowUpRight } from "lucide-react";
import type { AgentPayment } from "@/hooks/useAgenticPayments";

interface PaymentStreamMeterProps {
  payments: AgentPayment[];
  walletAddress: string | null;
}

export function PaymentStreamMeter({ payments, walletAddress }: PaymentStreamMeterProps) {
  const [copied, setCopied] = useState(false);

  // Active verified payments with unexpired access windows
  const activeStreams = useMemo(() => {
    const now = new Date().getTime();
    return payments.filter(
      (p) =>
        (p.status === "verified" || p.status === "consumed") &&
        p.access_granted_until &&
        new Date(p.access_granted_until).getTime() > now - 1000 * 60 * 15
    );
  }, [payments]);

  const hasActiveStream = activeStreams.length > 0;

  // Real-time ticking stream accumulator simulation
  const [streamTick, setStreamTick] = useState(0);

  useEffect(() => {
    if (!hasActiveStream) return;
    const interval = setInterval(() => {
      setStreamTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveStream]);

  // Derived stream metrics
  const activeCount = activeStreams.length;
  const flowRateAvaxPerSec = hasActiveStream ? (0.00025 * Math.max(1, activeCount)).toFixed(5) : "0.00000";
  const cumulativeStreamed = hasActiveStream
    ? (0.0125 + (streamTick * 0.00025)).toFixed(5)
    : "0.00000";

  const handleCopyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedWallet = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
    : "No Wallet Configured";

  return (
    <div className="rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-purple-500/30 p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)] shrink-0">
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                PAYMENT STREAM
              </span>
              <span className="text-xs text-slate-400 font-mono">Real-time Micro-Settlement</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-0.5">
              Continuous Token Stream Meter
            </h3>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border shrink-0 ${
          hasActiveStream
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            : "bg-slate-800/40 text-slate-400 border-white/[0.08]"
        }`}>
          <span className={`w-2 h-2 rounded-full ${hasActiveStream ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
          <span>{hasActiveStream ? `${activeCount} Stream Active` : "Stream Standby"}</span>
        </div>
      </div>

      {/* Primary Streaming Ticker & Flow Rate */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Instant Flow Rate */}
        <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] hover:border-purple-500/30 transition-all space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Live Stream Flow Rate
            </span>
            <span className="text-[10px] font-mono text-purple-400/80 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
              Per Second
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight tabular-nums">
            {flowRateAvaxPerSec}
            <span className="text-xs font-normal text-slate-500 ml-1.5">AVAX / s</span>
          </p>
          <p className="text-[11px] font-mono text-slate-500">
            Autonomous agent micro-billing velocity
          </p>
        </div>

        {/* Cumulative Stream Volume */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:border-purple-500/50 transition-all space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-purple-300 flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-purple-400" />
              Cumulative Stream Buffer
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Live Ticker
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-purple-200 tracking-tight tabular-nums">
            {cumulativeStreamed}
            <span className="text-xs font-normal text-purple-400/80 ml-1.5">AVAX</span>
          </p>
          <p className="text-[11px] font-mono text-slate-400">
            Streaming directly into settlement queue
          </p>
        </div>
      </div>

      {/* Progress & Stream Buffer Visualizer Bar */}
      <div className="p-4 rounded-xl bg-black/50 border border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Burst Window Buffer</span>
          </span>
          <span className="text-cyan-300 font-semibold">
            {hasActiveStream ? "Streaming Synchronized" : "Waiting for Inbound Agent Traffic"}
          </span>
        </div>

        <div className="relative w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-white/[0.08]">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              hasActiveStream
                ? "bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                : "bg-slate-700"
            }`}
            style={{ width: hasActiveStream ? "78%" : "5%" }}
          />
        </div>
      </div>

      {/* Destination Wallet Strip */}
      <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400">
          <Wallet className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Settlement Destination:</span>
          <span className="font-bold text-white font-mono">{truncatedWallet}</span>
        </div>

        {walletAddress && (
          <button
            type="button"
            onClick={handleCopyWallet}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] transition-all shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Address</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
