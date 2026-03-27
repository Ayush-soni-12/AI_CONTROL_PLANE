"use client";

import { useState, useRef, useEffect } from "react";
import { FeatureFlag } from "@/hooks/useFlags";
import {
  ToggleLeft,
  ToggleRight,
  Zap,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { FlagAuditLog } from "./FlagAuditLog";

interface FlagCardProps {
  flag: FeatureFlag;
  onUpdate: (flagName: string, rolloutPercent: number, reason?: string) => void;
}

export function FlagCard({ flag, onUpdate }: FlagCardProps) {
  const [localPercent, setLocalPercent] = useState(flag.rollout_percent);
  const [saving, setSaving] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when flag updates from SSE/Polling
  useEffect(() => {
    setLocalPercent(flag.rollout_percent);
  }, [flag.rollout_percent]);

  const isAutoDisabled = flag.status === "auto-disabled";
  const isEnabled = flag.status === "enabled" && flag.rollout_percent > 0;

  const handleSlider = (val: number) => {
    setLocalPercent(val);
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(async () => {
      setSaving(true);
      await onUpdate(flag.name, val);
      setSaving(false);
    }, 600);
  };

  const handleKillSwitch = async () => {
    setSaving(true);
    setLocalPercent(0);
    await onUpdate(flag.name, 0, "Manual kill switch");
    setSaving(false);
  };

  const statusBadge = isAutoDisabled
    ? { text: "AI Auto-Disabled", cls: "bg-red-900/40 text-red-300 border border-red-500/30", icon: <AlertTriangle className="w-3 h-3" /> }
    : isEnabled
    ? { text: "Enabled", cls: "bg-green-900/40 text-green-300 border border-green-500/30", icon: <ToggleRight className="w-3 h-3" /> }
    : { text: "Disabled", cls: "bg-gray-800/60 text-gray-400 border border-gray-700/40", icon: <ToggleLeft className="w-3 h-3" /> };

  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl p-5 transition-all ${
        isAutoDisabled
          ? "bg-red-950/20 border-red-500/30"
          : "bg-gray-900/40 border-gray-800/50 hover:border-purple-500/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-mono font-semibold text-white text-base">{flag.name}</h3>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.cls}`}>
              {statusBadge.icon}
              {statusBadge.text}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {flag.service_name} · Last updated by{" "}
            <span className={flag.updated_by === "NeuralControl AI" ? "text-purple-400 font-semibold" : "text-gray-400"}>
              {flag.updated_by}
            </span>
          </p>
        </div>

        {/* Kill Switch */}
        <button
          onClick={handleKillSwitch}
          disabled={localPercent === 0 || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-red-900/30 text-red-400 border border-red-500/30 hover:bg-red-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <Zap className="w-3 h-3" />
          Kill Switch
        </button>
      </div>

      {/* Rollout Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400 font-medium">Rollout</span>
          <span className={`text-sm font-bold tabular-nums ${localPercent === 0 ? "text-gray-500" : localPercent === 100 ? "text-green-400" : "text-purple-400"}`}>
            {localPercent}%
            {saving && <span className="ml-2 text-xs text-gray-500 font-normal">saving…</span>}
          </span>
        </div>

        {/* Visual progress bar + slider */}
        <div className="relative h-7 flex items-center">
          <div className="absolute inset-x-0 h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${localPercent}%`,
                background: localPercent === 0
                  ? "#374151"
                  : `linear-gradient(90deg, #a855f7 0%, #ec4899 100%)`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={localPercent}
            onChange={(e) => handleSlider(parseInt(e.target.value))}
            className="absolute inset-x-0 h-2 w-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Auto-disabled banner */}
      {isAutoDisabled && (
        <div className="mt-3 p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            NeuralControl AI automatically disabled this flag due to a detected performance anomaly.
            Check the audit log for the linked trace.
          </span>
        </div>
      )}

      {/* Audit log toggle */}
      <button
        onClick={() => setShowAudit(!showAudit)}
        className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <BookOpen className="w-3 h-3" />
        Audit Log
        {showAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Audit Log Content */}
      {showAudit && (
        <FlagAuditLog 
          serviceName={flag.service_name} 
          flagName={flag.name} 
        />
      )}
    </div>
  );
}
