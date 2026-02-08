// Time range selector component for historical data

import React, { useState } from "react";

export type TimeRange = "7d" | "30d" | "90d" | "custom";

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
      value: "7d" as TimeRange,
      label: "Last 7 Days",
      description: "Live data",
    },
    {
      value: "30d" as TimeRange,
      label: "Last 30 Days",
      description: "Hourly aggregates",
    },
    {
      value: "90d" as TimeRange,
      label: "Last 90 Days",
      description: "Daily aggregates",
    },
    {
      value: "custom" as TimeRange,
      label: "Custom Range",
      description: "Choose dates",
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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          📊 Time Range
        </h3>
        {currentRange !== "7d" && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
            Historical Data
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ranges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleRangeClick(range.value)}
            className={`
              p-3 rounded-lg border-2 transition-all
              ${
                currentRange === range.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
              }
            `}
          >
            <div className="text-sm font-medium">{range.label}</div>
            <div className="text-xs opacity-75 mt-1">{range.description}</div>
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCustomApply}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Apply Range
            </button>
            <button
              onClick={() => {
                setShowCustom(false);
                setCustomStart("");
                setCustomEnd("");
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
