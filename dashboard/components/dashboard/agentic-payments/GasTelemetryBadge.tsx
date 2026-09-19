"use client";

import { Fuel, ExternalLink, Activity, Zap, CheckCircle2 } from "lucide-react";
import { useFujiGas } from "@/hooks/useAgenticPayments";

export function GasTelemetryBadge() {
  const { data: gas, isLoading } = useFujiGas();

  const baseFee = gas?.base_fee_gwei ?? 26.5;
  const congestion = gas?.congestion ?? "Nominal";
  const isOptimal = congestion === "Nominal";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#091020]/70 border border-white/[0.08] hover:border-cyan-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      {/* Left: Chain & Gas Label */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
          <Fuel className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-white tracking-wide">
              Avalanche Fuji EVM
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Chain 43113
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-400">
            Real time base gas fee telemetry
          </p>
        </div>
      </div>

      {/* Right: Telemetry chips */}
      <div className="flex items-center gap-3">
        {/* Base Gas Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono">
          <span className="text-slate-400">Base Gas:</span>
          <span className="font-bold text-cyan-300 tabular-nums">
            {isLoading ? "--" : baseFee}
          </span>
          <span className="text-[10px] text-slate-500">nAVAX (Gwei)</span>
        </div>

        {/* Priority Fee Chip */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
          <span className="text-slate-400">Priority:</span>
          <span className="font-bold text-purple-300 tabular-nums">
            {gas?.priority_fee_gwei ?? 1.5}
          </span>
          <span className="text-[10px] text-slate-500">Gwei</span>
        </div>

        {/* Congestion Pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold border ${
          isOptimal
            ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        }`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{congestion}</span>
        </div>

        {/* Snowtrace Explorer Link */}
        <a
          href={gas?.explorer_url ?? "https://testnet.snowtrace.io"}
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
