"use client";

import { useState, useEffect } from "react";
import {
  Bot,
  Wallet,
  Clock,
  ToggleLeft,
  ToggleRight,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Coins,
  ShieldCheck,
  AlertTriangle,
  LogIn,
  Zap,
  History,
  Star,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useCheckAuth } from "@/hooks/useSignals";
import {
  useAgentSettings,
  useUpdateAgentSettings,
  useAgentPayments,
  AgentPayment,
} from "@/hooks/useAgenticPayments";

// ── Status badge component ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentPayment["status"] }) {
  const styles = {
    verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    pending:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    failed:   "bg-red-500/15 text-red-400 border-red-500/30",
    expired:  "bg-gray-500/15 text-gray-400 border-gray-500/30",
    consumed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  const icons = {
    verified: <CheckCircle2 className="w-3 h-3" />,
    pending:  <Loader2 className="w-3 h-3 animate-spin" />,
    failed:   <XCircle className="w-3 h-3" />,
    expired:  <Clock className="w-3 h-3" />,
    consumed: <Zap className="w-3 h-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Reputation score badge ────────────────────────────────────────────────────

function ReputationBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-600">—</span>;
  const color =
    score >= 85 ? "text-emerald-400" :
    score >= 60 ? "text-blue-400" :
    "text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-sm ${color}`}>
      <Star className="w-3 h-3" />
      {score}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgenticPaymentsPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: settings, isLoading: isSettingsLoading } = useAgentSettings();
  const { data: history, isLoading: isHistoryLoading } = useAgentPayments();
  const { mutate: saveSettings, isPending: isSaving, isSuccess: isSaved, error: saveError } =
    useUpdateAgentSettings();

  // Local form state
  const [wallet, setWallet]     = useState("");
  const [amountAvax, setAmountAvax] = useState("0.01");
  const [duration, setDuration] = useState(10);
  const [enabled, setEnabled]   = useState(false);

  // Pay-Per-Request state
  const [pprEnabled, setPprEnabled] = useState(false);
  const [pprAmountAvax, setPprAmountAvax] = useState("0.01");
  const [pprDuration, setPprDuration] = useState(0);

  // eERC Confidential Mode State
  const [eercEnabled, setEercEnabled] = useState(false);
  const [eercAddress, setEercAddress] = useState("");
  const [eercAmount, setEercAmount] = useState("10");

  // Sync form with loaded settings
  useEffect(() => {
    if (!settings) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWallet(settings.avalanche_wallet ?? "");
    setAmountAvax(
      settings.payment_amount_wei
        ? (Number(settings.payment_amount_wei) / 1e18).toString()
        : "0.01"
    );
    setDuration(settings.access_duration_minutes);
    setEnabled(settings.agentic_payments_enabled);

    setPprEnabled(settings.pay_per_request_enabled);
    setPprAmountAvax(
      settings.pay_per_request_amount_wei
        ? (Number(settings.pay_per_request_amount_wei) / 1e18).toString()
        : "0.01"
    );
    setPprDuration(settings.pay_per_request_duration_minutes);

    setEercEnabled(settings.confidential_eerc_enabled ?? false);
    setEercAddress(settings.eerc_token_address ?? "");
    setEercAmount(settings.eerc_payment_amount ?? "10");
  }, [settings]);

  const handleSave = () => {
    saveSettings({
      avalanche_wallet: wallet || null,
      payment_amount_wei: Math.round(Number(amountAvax) * 1e18).toString(),
      access_duration_minutes: duration,
      agentic_payments_enabled: enabled,
      pay_per_request_enabled: pprEnabled,
      pay_per_request_amount_wei: Math.round(Number(pprAmountAvax) * 1e18).toString(),
      pay_per_request_duration_minutes: pprDuration,
      confidential_eerc_enabled: eercEnabled,
      eerc_token_address: eercAddress || null,
      eerc_payment_amount: eercAmount || null,
    });
  };

  // Derive summary stats
  const successfulPayments = history?.payments.filter((p) => p.status === "verified" || p.status === "consumed") ?? [];
  const verifiedCount = successfulPayments.length;
  const totalEarnedAvax = successfulPayments.reduce((sum, p) => sum + (p.amount_avax ?? 0), 0);
  const totalEarnedEerc = successfulPayments.filter(p => p.is_eerc).length * Number(eercAmount || "10");
  const activeWindows = history?.payments.filter(
    (p) => p.status === "verified" && p.access_granted_until && new Date(p.access_granted_until) > new Date()
  ).length ?? 0;

  // ── Auth loading ────────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 mb-4">
            <LogIn className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* ── Page Header ──────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 sm:py-0 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  <Bot className="w-8 h-8 text-purple-400" />
                  Agentic Payments & Trust
                </h1>
                <p className="text-gray-400 mt-2">
                  Let AI agents autonomously pay to bypass rate limits — money goes directly to your Avalanche wallet.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="/dashboard/registry" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-sm font-semibold transition-colors border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                  Global Agent Registry
                </a>
                <a href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE/blob/main/docs/AGENTIC_PAYMENTS.md" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition-colors border border-gray-700">
                  <ExternalLink className="w-4 h-4" />
                  Documentation
                </a>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent mb-6" />

          {/* ── Stats Row ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total earned */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Coins className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                <div className="flex flex-col">
                  <p className="text-xl font-bold text-white">
                    {totalEarnedAvax.toFixed(4)} <span className="text-sm text-gray-400">AVAX</span>
                  </p>
                  {totalEarnedEerc > 0 && (
                    <p className="text-sm font-bold text-emerald-400 mt-0.5">
                      + {totalEarnedEerc} <span className="text-xs text-emerald-400/80">cAGT (Confidential)</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payments verified */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Verified Payments</p>
                <p className="text-xl font-bold text-white">{verifiedCount}</p>
              </div>
            </div>

            {/* Active burst windows */}
            <div className="rounded-2xl bg-gray-900/60 border border-gray-800 p-5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Active Burst Windows</p>
                <p className="text-xl font-bold text-white">{activeWindows}</p>
              </div>
            </div>
          </div>

          {/* ── Settings Card ─────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Payment Configuration</h3>
              </div>
              {/* Master enable toggle */}
              <button
                onClick={() => setEnabled((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium transition-colors"
              >
                {enabled ? (
                  <>
                    <ToggleRight className="w-6 h-6 text-emerald-400" />
                    <span className="text-emerald-400">Enabled</span>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-500">Disabled</span>
                  </>
                )}
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-5">
              {isSettingsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-xl bg-gray-800/50 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Wallet address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Your Avalanche C-Chain Wallet Address
                    </label>
                    <input
                      type="text"
                      value={wallet}
                      onChange={(e) => setWallet(e.target.value)}
                      placeholder="0x742d35Cc6634C0532925a3b8D4C0C8b3d3b4e6d9"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500">
                      AI agents will send AVAX directly to this address on Avalanche Fuji testnet. NeuralControl never holds your funds.
                    </p>
                  </div>

                  {/* Amount + Duration — side by side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Price */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Price per Burst (AVAX)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={amountAvax}
                          onChange={(e) => setAmountAvax(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                          AVAX
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        ~{(Number(amountAvax) * 30).toFixed(2)} USD at $30/AVAX
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Burst Window Duration
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                          min
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Agent bypasses rate limits for this long after paying
                      </p>
                    </div>
                  </div>

                  {/* ── Standalone Monetization (Pay-Per-Request) ── */}
                  <div className="pt-6 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">Standalone Pay-Per-Request</h4>
                        <p className="text-xs text-gray-500 mt-1">
                          Charge for every single request (ignores rate limits). Useful for expensive AI generation endpoints.
                        </p>
                      </div>
                      <button
                        onClick={() => setPprEnabled((v) => !v)}
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                      >
                        {pprEnabled ? (
                          <>
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                            <span className="text-emerald-400">Enabled</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 text-gray-500" />
                            <span className="text-gray-500">Disabled</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* PPR Price */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Price per Request (AVAX)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={pprAmountAvax}
                            onChange={(e) => setPprAmountAvax(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                            AVAX
                          </span>
                        </div>
                      </div>

                      {/* PPR Duration */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Access Duration
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="60"
                            value={pprDuration}
                            onChange={(e) => setPprDuration(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                            min
                          </span>
                        </div>
                        <p className="text-xs text-emerald-500/80 mt-2 font-medium">
                          Strictly enforced: Agent gets exactly 1 request per payment.
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                          Set this to 5 or 10 minutes. This gives the agent a short window to claim their single request after paying. Once claimed, the payment is instantly marked as <strong>consumed</strong> so they cannot make a second request. (Do not set to 0, or it will expire instantly before they can fetch the data).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Confidential Settlements (eERC) ── */}
                  <div className="pt-6 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          Confidential eERC Settlements
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-xl">
                          Allow agents to pay using Encrypted ERC tokens (eERC) via Zero-Knowledge proofs. This shields B2B transaction volumes and operational costs from public blockchain analysis.
                        </p>
                      </div>
                      <button
                        onClick={() => setEercEnabled((v) => !v)}
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                      >
                        {eercEnabled ? (
                          <>
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                            <span className="text-emerald-400">Enabled</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-6 h-6 text-gray-500" />
                            <span className="text-gray-500">Disabled</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300 ${eercEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                      {/* eERC Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          eERC Token Contract Address
                        </label>
                        <input
                          type="text"
                          value={eercAddress}
                          onChange={(e) => setEercAddress(e.target.value)}
                          placeholder="0x5C533Cf0..."
                          className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 text-sm font-mono focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">
                          The smart contract address of the Encrypted Token (e.g. cAGT) on Avalanche.
                        </p>
                      </div>

                      {/* eERC Amount */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Price (Token Units)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            value={eercAmount}
                            onChange={(e) => setEercAmount(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                            Tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* How it works info banner */}
                  <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
                    <div className="flex gap-3">
                      <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-gray-400 leading-relaxed space-y-1">
                        <p className="text-blue-300 font-semibold mb-1">How it works</p>
                        <p>1. AI agent hits your rate limit and sends <span className="font-mono text-white">x-agent-id</span> header</p>
                        <p>2. NeuralControl checks the agent&apos;s ERC-8004 reputation score</p>
                        <p>3. Trusted agents receive an x402 invoice — they pay autonomously on Avalanche</p>
                        <p>4. AVAX goes directly to your wallet above — no custody, no middleman</p>
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold transition-all duration-200 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {isSaving ? "Saving..." : "Save Settings"}
                    </button>

                    {isSaved && (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-in fade-in duration-300">
                        <CheckCircle2 className="w-4 h-4" />
                        Saved!
                      </span>
                    )}

                    {saveError && (
                      <span className="flex items-center gap-1.5 text-sm text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        {saveError.message}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Payment History ───────────────────────────────────────────── */}
          <div className="rounded-2xl bg-gray-900/60 border border-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800">
              <History className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Payment History</h3>
              {history && history.total > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                  {history.total}
                </span>
              )}
            </div>

            {isHistoryLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-800/50 animate-pulse" />
                ))}
              </div>
            ) : !history || history.payments.length === 0 ? (
              <div className="p-12 text-center">
                <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 font-medium">No agent payments yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Enable agentic payments and run the demo agent to see transactions here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Agent</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Endpoint</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tx</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {history.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-800/20 transition-colors">
                        {/* Agent ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg">
                            {p.agent_id}
                          </span>
                        </td>
                        {/* Endpoint */}
                        <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                          {p.service_name}{p.endpoint}
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={p.status} />
                        </td>
                        {/* Reputation score */}
                        <td className="px-6 py-4">
                          <ReputationBadge score={p.agent_reputation_score} />
                        </td>
                        {/* Amount */}
                        <td className="px-6 py-4 text-white font-semibold">
                          {p.is_eerc ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Confidential cAGT
                            </span>
                          ) : p.amount_avax !== null ? (
                            `${p.amount_avax.toFixed(4)} AVAX`
                          ) : (
                            "—"
                          )}
                        </td>
                        {/* TX link */}
                        <td className="px-6 py-4">
                          {p.explorer_url ? (
                            <a
                              href={p.explorer_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors font-mono"
                            >
                              {p.tx_hash?.slice(0, 8)}...
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </td>
                        {/* Time */}
                        <td className="px-6 py-4 text-xs text-gray-500">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
