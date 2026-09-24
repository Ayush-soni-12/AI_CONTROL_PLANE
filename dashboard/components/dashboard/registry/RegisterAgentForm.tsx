"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  PlusCircle,
  Wallet,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Coins,
  Sparkles,
} from "lucide-react";

import { useRecordAgentRegistration } from "@/hooks/useAgentRegistry";

interface RegisterAgentFormProps {
  walletAddress: string | null;
  provider: ethers.BrowserProvider | null;
  contractAddress: string;
  onConnectWallet: () => void;
  onSuccessRegistered?: (agentId: string) => void;
}

const REGISTRY_ABI = [
  "function registerAgent(string memory agentId) external payable",
  "function depositFunds(string memory agentId) external payable",
  "function getAgent(string memory agentId) external view returns (tuple(address ownerWallet, uint256 trustScore, uint256 balance, bool isRegistered, bool isRevoked))"
];

export function RegisterAgentForm({
  walletAddress,
  provider,
  contractAddress,
  onConnectWallet,
  onSuccessRegistered,
}: RegisterAgentFormProps) {
  const [agentId, setAgentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { mutateAsync: recordAgent } = useRecordAgentRegistration();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setTxHash(null);

    if (!walletAddress || !provider) {
      onConnectWallet();
      return;
    }

    const trimmedId = agentId.trim();
    if (!trimmedId) {
      setError("Agent ID cannot be empty.");
      return;
    }

    setLoading(true);
    try {
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, REGISTRY_ABI, signer);

      // 0.01 AVAX required stake
      const tx = await contract.registerAgent(trimmedId, {
        value: ethers.parseEther("0.01"),
        gasLimit: 300000,
      });

      setTxHash(tx.hash);
      setSuccessMsg("Transaction broadcasted! Awaiting Avalanche Fuji confirmation...");

      await tx.wait();

      try {
        await recordAgent({
          agent_id: trimmedId,
          owner_wallet: walletAddress,
          tx_hash: tx.hash,
          staked_balance_avax: 0.01,
        });
      } catch (recErr) {
        console.warn("Failed to record agent in control plane cache:", recErr);
      }

      setSuccessMsg(`Agent "${trimmedId}" registered successfully on Avalanche Fuji with 0.01 AVAX stake.`);
      setAgentId("");
      if (onSuccessRegistered) {
        onSuccessRegistered(trimmedId);
      }
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction reverted on Avalanche Fuji.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative p-5 rounded-xl bg-[#091020]/80 border border-purple-500/20 hover:border-purple-500/40 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.05)] flex flex-col justify-between space-y-4 overflow-hidden">
      {/* Top Ambient Glow */}
      <div className="absolute inset-0 bg-linear-to-r from-purple-500/5 via-cyan-500/5 to-transparent rounded-xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
            <PlusCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                ON-CHAIN STAKING
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">Avalanche Fuji</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold font-mono text-white mt-0.5">
              Register New AI Agent
            </h3>
          </div>
        </div>

        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 shrink-0">
          0.01 AVAX Stake
        </span>
      </div>

      {/* Form */}
      <form onSubmit={handleRegister} className="relative space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono font-semibold text-slate-300">
              Agent ID (Must be unique)
            </label>
            <span className="text-[10px] text-slate-500 font-mono">e.g. agent_trading_bot_v1</span>
          </div>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="e.g. agent_trading_bot_v1"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl bg-[#091020] border border-white/[0.12] hover:border-purple-500/30 focus:border-purple-400 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] text-xs font-mono text-white placeholder-slate-500 transition-all disabled:opacity-50 focus:outline-none"
          />
        </div>

        {/* Anti-spam Deposit Info Pill */}
        <div className="p-3 rounded-xl bg-[#070d1a]/80 border border-white/[0.06] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Coins className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Anti-Spam Security Deposit:</span>
          </div>
          <span className="font-bold text-cyan-300">0.0100 AVAX</span>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="break-all">{error}</span>
          </div>
        )}

        {/* Success / Broadcast State */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
            {txHash && (
              <a
                href={`https://testnet.snowtrace.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline"
              >
                <span>View on Snowtrace Testnet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Action Button */}
        {!walletAddress ? (
          <button
            type="button"
            onClick={onConnectWallet}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-white" />
            <span>Connect MetaMask to Register</span>
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !agentId.trim()}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Confirming on Avalanche Fuji...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>Register Agent (Deposit 0.01 AVAX)</span>
              </>
            )}
          </button>
        )}
      </form>
    </div>
  );
}
