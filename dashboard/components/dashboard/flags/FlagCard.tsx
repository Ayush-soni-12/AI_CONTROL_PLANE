"use client";

import { useState, useRef, useEffect } from "react";
import { FeatureFlag } from "@/hooks/useFlags";
import {
  Zap,
  AlertTriangle,
  History,
  ChevronDown,
  ChevronUp,
  Layers,
  Shield,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { FlagAuditLog } from "./FlagAuditLog";
import { TraceWaterfall } from "@/components/dashboard/incidents/TraceWaterfall";

interface FlagCardProps {
  flag: FeatureFlag;
  onUpdate: (flagName: string, rolloutPercent: number, reason?: string) => Promise<boolean> | void;
  onKill?: (flagName: string) => Promise<boolean> | void;
  latestTraceId?: string | null;
}

const PRESET_STAGES = [
  { label: "0% Off", value: 0 },
  { label: "10% Canary", value: 10 },
  { label: "25% Pilot", value: 25 },
  { label: "50% Half", value: 50 },
  { label: "100% Full", value: 100 },
];

export function FlagCard({ flag, onUpdate, onKill, latestTraceId }: FlagCardProps) {
  const [localPercent, setLocalPercent] = useState(flag.rollout_percent);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when flag updates from SSE or external refetch
  useEffect(() => {
    setLocalPercent(flag.rollout_percent);
  }, [flag.rollout_percent]);

  const isAutoDisabled = flag.status === "auto-disabled";
  const isEnabled = flag.status === "enabled" && flag.rollout_percent > 0;
  const isAIUpdated = flag.updated_by === "NeuralControl AI";

  const triggerUpdate = (val: number, reason?: string) => {
    setLocalPercent(val);
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(async () => {
      setSaving(true);
      await onUpdate(flag.name, val, reason);
      setSaving(false);
    }, 400);
  };

  const handleSliderChange = (val: number) => {
    triggerUpdate(val, `Canary slider adjusted to ${val}%`);
  };

  const handlePresetClick = (val: number) => {
    triggerUpdate(val, `Canary stage jumped to ${val}%`);
  };

  const handleKillSwitch = async () => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    setSaving(true);
    setLocalPercent(0);
    if (onKill) {
      await onKill(flag.name);
    } else {
      await onUpdate(flag.name, 0, "Emergency operator kill switch");
    }
    setSaving(false);
  };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl p-5 sm:p-6 transition-all duration-300 relative overflow-hidden ${
        isAutoDisabled
          ? "bg-[#140a12]/85 border-rose-500/40 shadow-[0_0_35px_rgba(244,63,94,0.12)]"
          : isEnabled
          ? "bg-[#091020]/80 border-white/[0.08] hover:border-cyan-500/40 shadow-[0_0_25px_rgba(0,0,0,0.3)]"
          : "bg-[#070d18]/70 border-white/[0.05] hover:border-white/[0.12]"
      }`}
    >
      {/* Top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isAutoDisabled
            ? "bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500"
            : isEnabled
            ? "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400"
            : "bg-slate-800"
        }`}
      />

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-base sm:text-lg font-bold text-slate-100 truncate">
              {flag.name}
            </span>

            {/* Status Pill */}
            {isAutoDisabled ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(244,63,94,0.2)] animate-pulse">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                AI AUTO-DISABLED
              </span>
            ) : isEnabled ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ACTIVE ({localPercent}%)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider bg-slate-800/80 text-slate-400 border border-white/[0.08] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-slate-500" />
                DISABLED (0%)
              </span>
            )}

            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-cyan-300 border border-white/[0.06]">
              {flag.service_name}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-400 flex flex-wrap items-center gap-2">
            <span>
              Updated by{" "}
              <span className={isAIUpdated ? "text-purple-400 font-bold" : "text-slate-200"}>
                {flag.updated_by}
              </span>
            </span>
            <span>·</span>
            <span>
              {new Date(flag.updated_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
          </div>
        </div>

        {/* Emergency Kill Switch */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleKillSwitch}
            disabled={localPercent === 0 || saving}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Terminate rollout immediately to 0%"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            Kill Switch
          </button>
        </div>
      </div>

      {/* Canary Slider & Progress Track */}
      <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">
              Canary Traffic Distribution
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] font-mono text-slate-400 animate-pulse">
                propagating...
              </span>
            )}
            <span
              className={`text-sm sm:text-base font-mono font-bold tabular-nums ${
                localPercent === 0
                  ? "text-slate-500"
                  : localPercent === 100
                  ? "text-emerald-400"
                  : "text-cyan-300"
              }`}
            >
              {localPercent}%
            </span>
          </div>
        </div>

        {/* Custom Neon Slider Track */}
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-x-0 h-2.5 bg-slate-900/90 rounded-full border border-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${localPercent}%`,
                background:
                  localPercent === 0
                    ? "#334155"
                    : "linear-gradient(90deg, #06b6d4 0%, #14b8a6 50%, #10b981 100%)",
                boxShadow:
                  localPercent > 0
                    ? "0 0 12px rgba(6,182,212,0.5)"
                    : "none",
              }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={localPercent}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="absolute inset-x-0 h-4 w-full opacity-0 cursor-pointer z-10"
          />
        </div>

        {/* Quick Jump Preset Buttons */}
        <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-white/[0.04] flex-wrap">
          {PRESET_STAGES.map((preset) => {
            const isSelected = localPercent === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
                  isSelected
                    ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)] scale-105"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:border-white/[0.15]"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Auto-Disabled Anomaly Hazard Banner */}
      {isAutoDisabled && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-rose-200 leading-relaxed">
              NeuralControl AI automatically disabled this flag due to a detected performance anomaly or error spike.
            </div>
          </div>

          {latestTraceId && (
            <button
              onClick={() => setSelectedTrace(latestTraceId)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[11px] font-mono font-semibold transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-[0_0_10px_rgba(244,63,94,0.2)]"
            >
              <Layers className="w-3.5 h-3.5 text-rose-300" />
              Inspect Telemetry Trace
            </button>
          )}
        </div>
      )}

      {/* Audit Log Drawer Toggle */}
      <div className="pt-2 flex items-center justify-between">
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>Audit History Trail</span>
          {showAudit ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </button>
      </div>

      {/* Expandable Audit Log Panel */}
      {showAudit && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <FlagAuditLog
            serviceName={flag.service_name}
            flagName={flag.name}
            onSelectTrace={(traceId) => setSelectedTrace(traceId)}
          />
        </div>
      )}

      {/* Trace Waterfall Modal */}
      {selectedTrace && (
        <TraceWaterfall
          traceId={selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}

