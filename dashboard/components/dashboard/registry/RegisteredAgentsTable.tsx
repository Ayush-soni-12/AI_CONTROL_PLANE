"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Search,
  Star,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  XCircle,
  Clock,
  Sparkles,
  Coins,
} from "lucide-react";
import type { RegisteredAgent } from "@/hooks/useAgentRegistry";

interface RegisteredAgentsTableProps {
  agents: RegisteredAgent[];
  isLoading: boolean;
  onSeedDemo?: () => void;
  isSeeding?: boolean;
  onSelectAgent?: (agentId: string) => void;
}

export function RegisteredAgentsTable({
  agents,
  isLoading,
  onSeedDemo,
  isSeeding = false,
  onSelectAgent,
}: RegisteredAgentsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWallet(text);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        agent.agent_id.toLowerCase().includes(q) ||
        (agent.name && agent.name.toLowerCase().includes(q)) ||
        (agent.owner_wallet && agent.owner_wallet.toLowerCase().includes(q));

      const score = agent.trust_score ?? 50;
      const isRevoked = agent.is_revoked;

      let matchesStatus = true;
      if (statusFilter === "trusted") {
        matchesStatus = score >= 80 && !isRevoked;
      } else if (statusFilter === "neutral") {
        matchesStatus = score >= 50 && score < 80 && !isRevoked;
      } else if (statusFilter === "revoked") {
        matchesStatus = isRevoked || score < 50;
      }

      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / pageSize));
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAgents.slice(start, start + pageSize);
  }, [filteredAgents, currentPage, pageSize]);

  return (
    <div className="rounded-xl bg-[#091020]/80 border border-purple-500/20 hover:border-purple-500/30 backdrop-blur-xl shadow-[0_4px_20px_rgba(168,85,247,0.05)] transition-all overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-mono text-white">
                Registered Agents Directory
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold font-mono border border-purple-500/30">
                {filteredAgents.length} records
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Avalanche Fuji C-Chain & Zero-Knowledge verified agent identities
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
              placeholder="Filter agent or wallet..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#091020] border border-white/[0.12] hover:border-purple-500/30 focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] text-xs font-mono text-white placeholder-slate-500 transition-all focus:outline-none"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[#070d1a]/80 border border-white/[0.08] text-xs font-mono">
            {[
              { id: "all", label: "All" },
              { id: "trusted", label: "High Trust" },
              { id: "neutral", label: "Neutral" },
              { id: "revoked", label: "Revoked" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-purple-500/25 text-purple-300 font-bold shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Seed Demo Trigger Button */}
          {onSeedDemo && (
            <button
              type="button"
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="px-3.5 py-1.5 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-200 hover:text-purple-300 border border-white/[0.08] hover:border-purple-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Populate test agents"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin text-purple-400" : "text-purple-400"}`} />
              <span>Seed Demo</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="p-8 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.02] border border-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : paginatedAgents.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-700 mx-auto" />
          <div>
            <p className="text-sm text-slate-400 font-mono font-medium">No registered agents found</p>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Register a new agent with MetaMask or click &quot;Seed Demo&quot; to populate test records.
            </p>
          </div>
          {onSeedDemo && (
            <button
              type="button"
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs transition-all inline-flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>Seed Demo Agents</span>
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#070d1a]/90 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3 font-semibold">Agent Identity</th>
                <th className="px-5 py-3 font-semibold">Owner Wallet</th>
                <th className="px-5 py-3 font-semibold">ERC-8004 Trust</th>
                <th className="px-5 py-3 font-semibold">Staked Deposit</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedAgents.map((agent) => {
                const score = agent.trust_score ?? 50;
                const isRevoked = agent.is_revoked;
                const isHighTrust = score >= 80 && !isRevoked;
                const isMediumTrust = score >= 50 && score < 80 && !isRevoked;

                return (
                  <tr key={agent.agent_id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Agent ID & Name */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {agent.agent_id}
                        </span>
                        {onSelectAgent && (
                          <button
                            type="button"
                            onClick={() => onSelectAgent(agent.agent_id)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 underline opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            Inspect
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Owner Wallet */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                        <span>
                          {agent.owner_wallet
                            ? `${agent.owner_wallet.slice(0, 6)}...${agent.owner_wallet.slice(-4)}`
                            : "0x00...00"}
                        </span>
                        {agent.owner_wallet && (
                          <button
                            type="button"
                            onClick={() => handleCopy(agent.owner_wallet)}
                            className="p-1 rounded text-slate-500 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                            title="Copy wallet address"
                          >
                            {copiedWallet === agent.owner_wallet ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* ERC-8004 Trust Score */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-xs border ${
                        isRevoked
                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : isHighTrust
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      }`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span>{score} / 100</span>
                      </span>
                    </td>

                    {/* Staked Deposit */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-cyan-400 font-mono font-bold text-xs">
                        <Coins className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{agent.staked_balance_avax ? `${agent.staked_balance_avax.toFixed(4)} AVAX` : "0.0100 AVAX"}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        isRevoked
                          ? "bg-red-500/15 text-red-400 border-red-500/30"
                          : isHighTrust
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                      }`}>
                        {isRevoked ? (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Revoked</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Registered Date & Tx Link */}
                    <td className="px-5 py-3.5 whitespace-nowrap text-right text-slate-400 text-[11px]">
                      <div className="flex items-center justify-end gap-2">
                        <span>
                          {new Date(agent.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                        {agent.tx_hash && (
                          <a
                            href={`https://testnet.snowtrace.io/tx/${agent.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-500 hover:text-cyan-300 hover:bg-white/[0.05] transition-colors"
                            title="View on Snowtrace"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {filteredAgents.length > pageSize && (
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-400 bg-black/20">
          <span>
            Showing page {currentPage} of {totalPages} ({filteredAgents.length} total)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
