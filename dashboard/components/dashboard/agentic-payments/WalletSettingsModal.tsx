"use client";

import { useState, useEffect } from "react";
import {
  X,
  Wallet,
  Settings,
  ShieldCheck,
  Zap,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Info,
} from "lucide-react";
import type { AgentSettings } from "@/hooks/useAgenticPayments";

interface WalletSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettings | undefined;
  onSave: (settings: {
    avalanche_wallet?: string | null;
    payment_amount_wei?: string;
    access_duration_minutes?: number;
    agentic_payments_enabled?: boolean;
    pay_per_request_enabled?: boolean;
    pay_per_request_amount_wei?: string;
    pay_per_request_duration_minutes?: number;
    confidential_eerc_enabled?: boolean;
    eerc_token_address?: string | null;
    eerc_payment_amount?: string | null;
  }) => void;
  isSaving: boolean;
  isSaved: boolean;
  saveError: Error | null;
}

export function WalletSettingsModal({
  isOpen,
  onClose,
  settings,
  onSave,
  isSaving,
  isSaved,
  saveError,
}: WalletSettingsModalProps) {
  const [wallet, setWallet] = useState("");
  const [amountAvax, setAmountAvax] = useState("0.01");
  const [duration, setDuration] = useState(10);
  const [enabled, setEnabled] = useState(false);

  // Standalone PPR state
  const [pprEnabled, setPprEnabled] = useState(false);
  const [pprAmountAvax, setPprAmountAvax] = useState("0.01");
  const [pprDuration, setPprDuration] = useState(5);

  // Confidential eERC mode state
  const [eercEnabled, setEercEnabled] = useState(false);
  const [eercAddress, setEercAddress] = useState("");
  const [eercAmount, setEercAmount] = useState("10");

  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWallet(settings.avalanche_wallet ?? "");
    setAmountAvax(
      settings.payment_amount_wei
        ? (Number(settings.payment_amount_wei) / 1e18).toString()
        : "0.01"
    );
    setDuration(settings.access_duration_minutes ?? 10);
    setEnabled(settings.agentic_payments_enabled ?? false);

    setPprEnabled(settings.pay_per_request_enabled ?? false);
    setPprAmountAvax(
      settings.pay_per_request_amount_wei
        ? (Number(settings.pay_per_request_amount_wei) / 1e18).toString()
        : "0.01"
    );
    setPprDuration(settings.pay_per_request_duration_minutes ?? 5);

    setEercEnabled(settings.confidential_eerc_enabled ?? false);
    setEercAddress(settings.eerc_token_address ?? "");
    setEercAmount(settings.eerc_payment_amount ?? "10");
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      avalanche_wallet: wallet.trim() || null,
      payment_amount_wei: Math.round(Number(amountAvax || "0.01") * 1e18).toString(),
      access_duration_minutes: Number(duration || 10),
      agentic_payments_enabled: enabled,
      pay_per_request_enabled: pprEnabled,
      pay_per_request_amount_wei: Math.round(Number(pprAmountAvax || "0.01") * 1e18).toString(),
      pay_per_request_duration_minutes: Number(pprDuration || 5),
      confidential_eerc_enabled: eercEnabled,
      eerc_token_address: eercAddress.trim() || null,
      eerc_payment_amount: eercAmount.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#091020] border border-white/[0.1] shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] sticky top-0 bg-[#091020]/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-white">
                Monetization & Settlement Parameters
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Configure direct-to-wallet micro-billing and confidential eERC tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Master Enablement Toggle */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-white block">
                Agentic Rate-Limit Monetization
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Issue x402 payment requirements when AI agents exceed standard rate limits
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEnabled((v) => !v)}
              className="flex items-center gap-2 text-xs font-mono font-semibold transition-colors"
            >
              {enabled ? (
                <>
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400">ACTIVE</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-6 h-6 text-slate-500" />
                  <span className="text-slate-500">DISABLED</span>
                </>
              )}
            </button>
          </div>

          {/* Section 1: Settlement Destination Wallet */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300 font-semibold uppercase tracking-wider">
              <Wallet className="w-3.5 h-3.5" />
              <span>Avalanche Fuji Settlement Destination</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 block">
                Avalanche C-Chain Wallet Address (0x...)
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x742d35Cc6634C0532925a3b8D4C0C8b3d3b4e6d9"
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-purple-500/60 transition-colors"
              />
              <p className="text-[11px] font-mono text-slate-500">
                Payment fees flow directly to this address. NeuralControl maintains non-custodial operations.
              </p>
            </div>

            {/* Price & Duration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  Burst Window Price (AVAX)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={amountAvax}
                    onChange={(e) => setAmountAvax(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-purple-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    AVAX
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  Burst Window Duration (Minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-purple-500/60"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                    MIN
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Standalone Pay-Per-Request (PPR) */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 font-semibold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pay-Per-Request (PPR) Rate</span>
              </div>
              <button
                type="button"
                onClick={() => setPprEnabled((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-mono transition-colors"
              >
                {pprEnabled ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400">Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-500">Disabled</span>
                  </>
                )}
              </button>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${pprEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  PPR Fee (AVAX)
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={pprAmountAvax}
                  onChange={(e) => setPprAmountAvax(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  Access Claim Window (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={pprDuration}
                  onChange={(e) => setPprDuration(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-500/60"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Confidential eERC Mode */}
          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-purple-300 font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Confidential eERC (cAGT) Token Settlements</span>
              </div>
              <button
                type="button"
                onClick={() => setEercEnabled((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-mono transition-colors"
              >
                {eercEnabled ? (
                  <>
                    <ToggleRight className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-400">Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-5 h-5 text-slate-500" />
                    <span className="text-slate-500">Disabled</span>
                  </>
                )}
              </button>
            </div>

            <div className={`space-y-3 ${eercEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  Encrypted Token Contract Address
                </label>
                <input
                  type="text"
                  value={eercAddress}
                  onChange={(e) => setEercAddress(e.target.value)}
                  placeholder="0x5C533Cf04E72d0b503C350Ab..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-purple-500/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300 block">
                  Price in Encrypted Tokens (e.g. cAGT Units)
                </label>
                <input
                  type="number"
                  min="1"
                  value={eercAmount}
                  onChange={(e) => setEercAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-purple-500/60"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-5 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isSaved && (
                <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Settings saved successfully
                </span>
              )}
              {saveError && (
                <span className="flex items-center gap-1.5 text-xs font-mono text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  {saveError.message}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-slate-300 text-xs font-mono transition-colors"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? "Saving..." : "Save Parameters"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
