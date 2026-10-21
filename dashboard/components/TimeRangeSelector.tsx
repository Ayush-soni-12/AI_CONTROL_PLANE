// Time range selector component for historical data

import React, { useState } from "react";
import { Calendar, Radio, History } from "lucide-react";

export type TimeRange = "live" | "24h" | "7d" | "30d" | "custom";

interface TimeRangeSelectorProps {
  onRangeChange: (range: TimeRange, startDate?: Date, endDate?: Date) => void;
  currentRange: TimeRange;
}

export function TimeRangeSelector({
  onRangeChange,
  currentRange,
}: TimeRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const ranges = [
    {
      value: "live" as TimeRange,
      label: "Live Stream",
      description: "Real-time Redis",
    },
    {
      value: "24h" as TimeRange,
      label: "Last 24 Hours",
      description: "Hourly snapshots",
    },
    {
      value: "7d" as TimeRange,
      label: "Last 7 Days",
      description: "Weekly history",
    },
    {
      value: "30d" as TimeRange,
      label: "Last 30 Days",
      description: "Monthly history",
    },
    {
      value: "custom" as TimeRange,
      label: "Custom Range",
      description: "Up to 30 days",
    },
  ];

  const handleRangeClick = (range: TimeRange) => {
    if (range === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      onRangeChange(range);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      onRangeChange("custom", start, end);
      setShowCustom(false);
    }
  };

  return (
    <div className="bg-[#091020] rounded-xl p-4 sm:p-5 border border-cyan-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Time Range
          </h3>
        </div>

        {currentRange !== "live" ? (
          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Historical Data</span>
          </span>
        ) : (
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Live SSE Stream</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {ranges.map((range) => {
          const isSelected = currentRange === range.value;
          return (
            <button
              key={range.value}
              type="button"
              onClick={() => handleRangeClick(range.value)}
              className={`
                p-3 rounded-lg border transition-colors text-left cursor-pointer
                ${
                  isSelected
                    ? "border-cyan-500/40 bg-cyan-500/15 text-white"
                    : "border-slate-800 bg-[#070a13] text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }
              `}
            >
              <div className={`text-xs sm:text-sm font-semibold ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                {range.label}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {range.description}
              </div>
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div className="mt-4 p-4 bg-[#070a13] rounded-lg border border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-[#091020] text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg text-xs bg-[#091020] text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              onClick={handleCustomApply}
              className="flex-1 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Apply Range
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustom(false);
                setCustomStart("");
                setCustomEnd("");
              }}
              className="px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-mono transition-colors cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
