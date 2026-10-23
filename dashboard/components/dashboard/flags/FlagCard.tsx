/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useRef, useEffect } from "react";
import { FeatureFlag, FlagAuditLogEntry } from "@/hooks/useFlags";
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
  onUpdate: (flagName: string, rolloutPercent: number, reason?: string) => Promise<boolean | void> | void;
  onKill?: (flagName: string) => Promise<boolean | void> | void;
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

  // Sync local state when flag updates
  useEffect(() => {
    setLocalPercent(flag.rollout_percent);
  }, [flag.rollout_percent]);

  const isAutoDisabled = flag.status === "auto-disabled";
  const isEnabled = flag.status === "enabled" && localPercent > 0;
  const isFullRollout = localPercent === 100;
  const isAIUpdated = flag.updated_by === "NeuralControl AI";

  const triggerUpdate = (val: number, reason?: string) => {
    setLocalPercent(val);
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(async () => {
      setSaving(true);
      await onUpdate(flag.name, val, reason);
      setSaving(false);
    }, 300);
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
      className={`rounded-xl border transition-colors p-5 sm:p-6 ${
        isAutoDisabled
          ? "bg-[#140a12] border-rose-500/40"
          : isFullRollout
          ? "bg-[#111113] border-[#27272a] hover:border-[#3f3f46]"
          : isEnabled
          ? "bg-[#111113] border-[#27272a] hover:border-[#3f3f46]"
          : "bg-[#111113] border-[#27272a] hover:border-[#3f3f46]"
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <span className="text-base sm:text-lg font-semibold text-[#fafafa] tracking-tight truncate">
              {flag.name}
            </span>

            {/* Status Pill */}
            {isAutoDisabled ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                AI AUTO-DISABLED
              </span>
            ) : isFullRollout ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-[#18181b] text-[#22c55e] border border-[#27272a] flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                GA FULL ROLLOUT (100%)
              </span>
            ) : isEnabled ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-[#18181b] text-[#22c55e] border border-[#27272a] flex items-center gap-1.5">
                <Sliders className="w-3 h-3 text-[#22c55e]" />
                ACTIVE CANARY ({localPercent}%)
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-[#18181b] text-[#71717a] border border-[#27272a] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#71717a]" />
                DISABLED (0%)
              </span>
            )}

            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
              {flag.service_name}
            </span>
          </div>

          <div className="text-xs text-[#a1a1aa] flex flex-wrap items-center gap-2">
            <span>
              Updated by{" "}
              <span className={isAIUpdated ? "text-[#a78bfa] font-mono font-semibold" : "text-[#fafafa]"}>
                {flag.updated_by}
              </span>
            </span>
            <span>·</span>
            <span className="font-mono text-[#71717a]">
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
            className="px-3 py-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            title="Terminate rollout immediately to 0%"
          >
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            Kill Switch
          </button>
        </div>
      </div>

      {/* Canary Slider & Progress Track */}
      <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span className="text-xs font-mono font-medium text-[#fafafa]">
              Canary Traffic Distribution
            </span>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[10px] font-mono text-[#a1a1aa] animate-pulse">
                propagating...
              </span>
            )}
            <span
              className={`text-sm sm:text-base font-mono font-semibold tabular-nums ${
                localPercent === 0
                  ? "text-[#71717a]"
                  : localPercent === 100
                  ? "text-[#22c55e]"
                  : "text-[#fafafa]"
              }`}
            >
              {localPercent}%
            </span>
          </div>
        </div>

        {/* Range Slider Track */}
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-x-0 h-2 bg-[#09090b] rounded-full border border-[#27272a] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${localPercent}%`,
                background:
                  localPercent === 0
                    ? "#27272a"
                    : localPercent === 100
                    ? "#22c55e"
                    : "#22c55e",
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
        <div className="flex items-center justify-between gap-1.5 mt-3 pt-3 border-t border-[#27272a] flex-wrap">
          {PRESET_STAGES.map((preset) => {
            const isSelected = localPercent === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={`px-3 py-1 rounded-md text-[11px] font-mono font-medium transition-colors border cursor-pointer ${
                  isSelected
                    ? "bg-[#fafafa] text-[#09090b] border-[#fafafa]"
                    : "bg-[#111113] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]"
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
        <div className="mb-4 p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono text-rose-200 leading-relaxed">
              NeuralControl AI automatically disabled this flag due to a detected performance anomaly or latency spike.
            </div>
          </div>

          {latestTraceId && (
            <button
              onClick={() => setSelectedTrace(latestTraceId)}
              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[11px] font-mono font-medium transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
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
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span>Audit History Trail</span>
          {showAudit ? (
            <ChevronUp className="w-3.5 h-3.5 text-[#71717a]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-[#71717a]" />
          )}
        </button>
      </div>

      {/* Expandable Audit Log Panel */}
      {showAudit && (
        <div className="mt-3 pt-3 border-t border-[#27272a]">
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
