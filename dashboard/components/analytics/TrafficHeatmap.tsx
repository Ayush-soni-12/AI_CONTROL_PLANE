"use client";

import { useTrafficPatterns } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock } from "lucide-react";
import { useMemo, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TrafficHeatmap() {
  const { data: patterns, isLoading } = useTrafficPatterns(7);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Create a map in LOCAL timezone for display
  const patternMap = useMemo(() => {
    if (!patterns) return new Map();

    const map = new Map<string, { count: number; latency: number }>();

    // Get UTC offset in hours for the local timezone
    // getTimezoneOffset() returns minutes, negative for east of UTC
    // For IST (UTC+5:30), getTimezoneOffset() returns -330
    const offsetMinutes = -new Date().getTimezoneOffset(); // positive for east of UTC
    const offsetHours = offsetMinutes / 60; // 5.5 for IST

    patterns.forEach((p) => {
      // Convert UTC hour to local hour
      let localHour = p.hour + offsetHours;
      let localDay = p.day_of_week;

      // Handle day overflow (e.g., UTC 20:00 + 5.5h = next day 01:30)
      if (localHour >= 24) {
        localHour -= 24;
        localDay = (localDay + 1) % 7;
      } else if (localHour < 0) {
        localHour += 24;
        localDay = (localDay - 1 + 7) % 7;
      }

      // Round to nearest hour for the grid
      localHour = Math.floor(localHour);

      const key = `${localDay}-${localHour}`;
      const existing = map.get(key);
      if (existing) {
        // Merge if two UTC hours map to same local hour
        map.set(key, {
          count: existing.count + p.request_count,
          latency:
            (existing.latency * existing.count +
              p.avg_latency * p.request_count) /
            (existing.count + p.request_count),
        });
      } else {
        map.set(key, { count: p.request_count, latency: p.avg_latency });
      }
    });
    return map;
  }, [patterns]);

  // Find max count for color scaling
  const maxCount = useMemo(() => {
    if (!patterns || patterns.length === 0) return 1;
    return Math.max(...patterns.map((p) => p.request_count));
  }, [patterns]);

  // Get color based on request count
  const getColor = (count: number) => {
    if (count === 0) return "bg-gray-900/40 border-gray-800";

    const intensity = count / maxCount;
    if (intensity > 0.8) return "bg-purple-500 border-purple-400";
    if (intensity > 0.6) return "bg-purple-600 border-purple-500";
    if (intensity > 0.4) return "bg-purple-700 border-purple-600";
    if (intensity > 0.2) return "bg-purple-800 border-purple-700";
    return "bg-purple-900 border-purple-800";
  };

  if (isLoading) {
    return (
      <Card className="bg-linear-to-br from-gray-900/90 to-purple-900/20 border-purple-500/30 backdrop-blur-sm ">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-200 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Traffic Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-3 animate-spin text-purple-400" />
            Loading heatmap...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-linear-to-br from-gray-900/90 to-purple-900/20 border-purple-500/30 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Traffic Heatmap
        </CardTitle>
        <p className="text-gray-400 text-xs mt-1">
          Request volume by day and hour (Local Time)
        </p>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-gray-950/40 rounded-lg border border-purple-900/30">
          {/* Hour labels */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-0.5 mb-1">
            <div className="text-center text-[10px] font-medium text-gray-500"></div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-center text-[10px] font-medium text-gray-400"
              >
                {hour}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="space-y-0.5">
            {DAYS.map((day, dayIndex) => (
              <div
                key={day}
                className="grid grid-cols-[60px_repeat(24,1fr)] gap-0.5"
              >
                <div className="flex items-center text-xs font-medium text-gray-300 pr-2">
                  {day}
                </div>
                {HOURS.map((hour) => {
                  const key = `${dayIndex}-${hour}`;
                  const data = patternMap.get(key);
                  const count = data?.count || 0;
                  const latency = data?.latency || 0;
                  const isHovered = hoveredCell === key;

                  return (
                    <div
                      key={hour}
                      className={`
                        aspect-square rounded ${getColor(count)}
                        transition-all duration-200 cursor-pointer
                        border
                        ${isHovered ? "scale-125 z-10 shadow-lg shadow-purple-500/50" : "hover:scale-110"}
                      `}
                      onMouseEnter={() => setHoveredCell(key)}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${day} ${hour}:00\n${count.toLocaleString()} requests\n${latency.toFixed(1)}ms avg`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hover Info Card */}
          {hoveredCell &&
            (() => {
              const data = patternMap.get(hoveredCell);
              const [dayIdx, hourStr] = hoveredCell.split("-");
              const day = DAYS[parseInt(dayIdx)];
              const hour = parseInt(hourStr);

              return data ? (
                <div className="mt-4 p-3 bg-linear-to-r from-purple-900/40 to-pink-900/40 rounded border border-purple-500/40">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs text-gray-300 font-medium">
                        {day} {hour}:00 - {hour + 1}:00
                      </div>
                      <div className="flex gap-3 mt-0.5 text-[11px]">
                        <span className="text-purple-300">
                          {data.count.toLocaleString()} requests
                        </span>
                        <span className="text-pink-300">
                          {data.latency.toFixed(1)}ms avg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-[10px] font-medium text-gray-400">Low</span>
            <div className="flex gap-0.5">
              {[
                "bg-purple-900 border-purple-800",
                "bg-purple-800 border-purple-700",
                "bg-purple-700 border-purple-600",
                "bg-purple-600 border-purple-500",
                "bg-purple-500 border-purple-400",
              ].map((colorClass, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded border ${colorClass}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium text-gray-400">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
