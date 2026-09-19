"use client";

import { useState, useMemo } from "react";
import {
  History,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Zap,
  XCircle,
  ShieldCheck,
  Star,
  Copy,
  Check,
  Lock,
  Coins,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { AgentPayment } from "@/hooks/useAgenticPayments";

interface EncryptedLedgerTableProps {
  payments: AgentPayment[];
  isLoading?: boolean;
}

export function EncryptedLedgerTable({
  payments,
  isLoading = false,
}: EncryptedLedgerTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus =
        statusFilter === "all" || p.status.toLowerCase() === statusFilter.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.agent_id.toLowerCase().includes(q) ||
        (p.tx_hash && p.tx_hash.toLowerCase().includes(q)) ||
        p.service_name.toLowerCase().includes(q) ||
        p.endpoint.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const statusBadges: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    verified: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
      icon: CheckCircle2,
    },
    pending: {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/30",
      icon: Clock,
    },
    consumed: {
      bg: "bg-cyan-500/15",
      text: "text-cyan-400",
      border: "border-cyan-500/30",
      icon: Zap,
    },
    failed: {
      bg: "bg-red-500/15",
      text: "text-red-400",
      border: "border-red-500/30",
      icon: XCircle,
    },
    expired: {
      bg: "bg-slate-700/30",
      text: "text-slate-400",
      border: "border-white/[0.08]",
      icon: Clock,
    },
  };

  return (
    <div className="rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-purple-500/20 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] transition-all overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <History className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-mono text-white">
                Encrypted Ledger History
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold font-mono border border-purple-500/30">
                {filteredPayments.length} records
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Avalanche Fuji C-Chain & Zero-Knowledge encrypted transactions
            </p>
          </div>
        </div>

        {/* Filter and Search controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter agent or hash..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono">
            {["all", "verified", "pending", "consumed"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  statusFilter === status
                    ? "bg-purple-500/25 text-purple-300 font-bold shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : paginatedPayments.length === 0 ? (
        <div className="p-12 text-center">
          <History className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-mono font-medium">No encrypted ledger records found</p>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Click &quot;Seed Demo Payments&quot; above to populate verified testnet transactions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/30 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3 font-semibold">Tx Hash</th>
                <th className="px-5 py-3 font-semibold">Agent Identity</th>
                <th className="px-5 py-3 font-semibold">ERC-8004 Trust</th>
                <th className="px-5 py-3 font-semibold">Service Endpoint</th>
                <th className="px-5 py-3 font-semibold">Settlement Value</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedPayments.map((p) => {
                const badge = statusBadges[p.status.toLowerCase()] || statusBadges.expired;
                const StatusIcon = badge.icon;
                const repScore = p.agent_reputation_score ?? 85;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Hash with copy + Snowtrace */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {p.tx_hash ? (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={p.explorer_url ?? `https://testnet.snowtrace.io/tx/${p.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1 hover:underline"
                            title={p.tx_hash}
                          >
                            <span>
                              {p.tx_hash.slice(0, 6)}...{p.tx_hash.slice(-4)}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyHash(p.tx_hash!)}
                            className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                            title="Copy full transaction hash"
                          >
                            {copiedHash === p.tx_hash ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Off-Chain Invoice</span>
                      )}
                    </td>

                    {/* Agent ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">
                        {p.agent_id}
                      </span>
                    </td>

                    {/* ERC-8004 Score */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        repScore >= 80
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span>{repScore} / 100</span>
                      </span>
                    </td>

                    {/* Service & Endpoint */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-300">
                      <span className="text-slate-400">{p.service_name}</span>
                      <span className="text-slate-600 mx-1">•</span>
                      <span className="text-slate-200">{p.endpoint}</span>
                    </td>

                    {/* Settlement Value */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {p.is_eerc ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]">
                          <Lock className="w-3 h-3 text-purple-400" />
                          <span>Confidential cAGT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-cyan-300 tabular-nums">
                          <Coins className="w-3.5 h-3.5 text-cyan-400" />
                          <span>
                            {p.amount_avax !== null ? `${p.amount_avax.toFixed(4)} AVAX` : "0.0100 AVAX"}
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <StatusIcon className={`w-3 h-3 ${p.status === "pending" ? "animate-spin" : ""}`} />
                        <span className="capitalize">{p.status}</span>
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-slate-400 text-[11px]">
                      {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{" "}
                      <span className="text-slate-600">•</span>{" "}
                      {new Date(p.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredPayments.length > pageSize && (
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400 bg-black/20">
          <span>
            Showing page {currentPage} of {totalPages} ({filteredPayments.length} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
