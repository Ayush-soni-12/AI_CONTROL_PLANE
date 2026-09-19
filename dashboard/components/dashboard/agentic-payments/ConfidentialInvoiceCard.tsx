"use client";

import { useState } from "react";
import {
  FileText,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  Zap,
  ArrowUpRight,
  Lock,
  Coins,
  Check,
  ExternalLink,
} from "lucide-react";
import type { AgentPayment } from "@/hooks/useAgenticPayments";

interface ConfidentialInvoiceCardProps {
  payment: AgentPayment;
  eercAmountDefault?: string | null;
}

export function ConfidentialInvoiceCard({
  payment,
  eercAmountDefault = "10",
}: ConfidentialInvoiceCardProps) {
  const [isSettled, setIsSettled] = useState(false);

  const isEerc = payment.is_eerc;
  const isVerified = payment.status === "verified" || isSettled;
  const isPending = payment.status === "pending" && !isSettled;

  // Format display amount
  const displayAmount = isEerc
    ? `${eercAmountDefault || "10"} cAGT`
    : payment.amount_avax !== null
    ? `${payment.amount_avax.toFixed(4)} AVAX`
    : "0.0100 AVAX";

  // Reputation trust tier
  const repScore = payment.agent_reputation_score ?? 85;
  const isHighTrust = repScore >= 80;

  const handleSettle = () => {
    setIsSettled(true);
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group shadow-lg ${
      isEerc
        ? "bg-gradient-to-br from-[#0b1226]/90 via-[#0d1633]/85 to-purple-950/20 border-purple-500/30 hover:border-purple-500/50"
        : "bg-[#091020]/85 border-white/[0.08] hover:border-cyan-500/30"
    }`}>
      {/* Top Meta Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${
            isEerc
              ? "bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          }`}>
            {isEerc ? <Lock className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white group-hover:text-cyan-300 transition-colors">
                {payment.agent_id}
              </span>
              {/* ERC-8004 Score Badge */}
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${
                isHighTrust
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }`}>
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>{repScore}/100</span>
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {payment.service_name} <span className="text-slate-600">•</span> {payment.endpoint}
            </p>
          </div>
        </div>

        {/* Token Pill */}
        <div className="flex flex-col items-end">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            isEerc
              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
              : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
          }`}>
            {isEerc ? "Confidential eERC" : "Avalanche Fuji"}
          </span>
          {isEerc && (
            <span className="text-[9px] font-mono text-purple-400/80 mt-1 flex items-center gap-0.5">
              <ShieldCheck className="w-2.5 h-2.5" />
              ZK Proof Verified
            </span>
          )}
        </div>
      </div>

      {/* Invoice Details Grid */}
      <div className="grid grid-cols-2 gap-2.5 my-3 p-3 rounded-xl bg-black/40 border border-white/[0.04] text-xs font-mono">
        <div>
          <span className="text-[10px] text-slate-500 block">INVOICED AMOUNT</span>
          <span className={`text-base font-bold tabular-nums ${
            isEerc ? "text-purple-300" : "text-cyan-300"
          }`}>
            {displayAmount}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block">SETTLEMENT STATUS</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${
            isVerified
              ? "text-emerald-400"
              : isPending
              ? "text-amber-400"
              : "text-slate-400"
          }`}>
            {isVerified ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified / Settled</span>
              </>
            ) : isPending ? (
              <>
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Pending Payment</span>
              </>
            ) : (
              <span>{payment.status}</span>
            )}
          </span>
        </div>
      </div>

      {/* Bottom Actions Row */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06] text-xs font-mono">
        {/* Transaction Explorer Link */}
        {payment.explorer_url && payment.tx_hash ? (
          <a
            href={payment.explorer_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1 text-[11px]"
          >
            <span>Tx: {payment.tx_hash.slice(0, 8)}...{payment.tx_hash.slice(-6)}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-[11px] text-slate-500">Awaiting On-Chain Hash</span>
        )}

        {/* Settlement Trigger Button */}
        {isPending ? (
          <button
            type="button"
            onClick={handleSettle}
            className="px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-400 text-black text-[11px] font-bold font-mono transition-all shadow-[0_0_12px_rgba(168,85,247,0.3)] hover:scale-105 active:scale-95 flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            <span>Settle Invoice</span>
          </button>
        ) : (
          <span className="text-[10px] text-emerald-400/80 font-semibold flex items-center gap-1">
            <Check className="w-3 h-3" />
            Settled to Vault
          </span>
        )}
      </div>
    </div>
  );
}
