"use client";

import { useTrafficPatterns } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Zap, Flame, BarChart2, Calendar } from "lucide-react";
import { useMemo, useState } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function TrafficHeatmap() {
  const { data: patterns, isLoading } = useTrafficPatterns(7);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Create a map in LOCAL timezone for display
  const patternMap = useMemo(() => {
    if (!patterns) return new Map<string, { count: number; latency: number }>();

    const map = new Map<string, { count: number; latency: number }>();

    // Get UTC offset in hours for the local timezone
    const offsetMinutes = -new Date().getTimezoneOffset();
    const offsetHours = offsetMinutes / 60;

    patterns.forEach((p) => {
      let localHour = p.hour + offsetHours;
      let localDay = p.day_of_week;

      if (localHour >= 24) {
        localHour -= 24;
        localDay = (localDay + 1) % 7;
      } else if (localHour < 0) {
        localHour += 24;
        localDay = (localDay - 1 + 7) % 7;
      }

      localHour = Math.floor(localHour);

      const key = `${localDay}-${localHour}`;
      const existing = map.get(key);
      if (existing) {
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

  // Find max count and summary stats
  const { maxCount, totalRequests, peakHourInfo } = useMemo(() => {
    if (!patterns || patterns.length === 0) {
      return { maxCount: 1, totalRequests: 0, peakHourInfo: null };
    }

    let max = 1;
    let total = 0;
    let peakDay = 0;
    let peakHr = 0;
    let peakCount = 0;
    let peakLat = 0;

    patternMap.forEach((val, key) => {
      total += val.count;
      if (val.count > max) {
        max = val.count;
        peakCount = val.count;
        peakLat = val.latency;
        const [d, h] = key.split("-");
        peakDay = parseInt(d);
        peakHr = parseInt(h);
      }
    });

    return {
      maxCount: max,
      totalRequests: total,
      peakHourInfo: peakCount > 0 ? { day: DAYS[peakDay], hour: peakHr, count: peakCount, latency: peakLat } : null,
    };
  }, [patterns, patternMap]);

  // Get Obsidian Cyber color based on request count
  const getColor = (count: number) => {
    if (count === 0) return "bg-[#091020]/60 border-white/[0.04]";

    const intensity = count / maxCount;
    if (intensity > 0.8)
      return "bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(0,230,153,0.7)]";
    if (intensity > 0.6)
      return "bg-cyan-400 border-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.5)]";
    if (intensity > 0.4)
      return "bg-cyan-600 border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.3)]";
    if (intensity > 0.2)
      return "bg-cyan-900/80 border-cyan-700/60";
    return "bg-cyan-950/60 border-cyan-800/40";
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-blue-500/15 p-6">
        <div className="flex items-center gap-3 pb-6 border-b border-white/[0.06]">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="text-center py-16 text-slate-400 font-mono text-sm">
          <Clock className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
          Generating temporal traffic density grid...
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-blue-500/15 overflow-hidden mb-6 relative">
      {/* Top ambient glow line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 opacity-60" />

      <CardHeader className="p-5 sm:p-6 pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                TEMPORAL HEATMAP
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                7-Day Hourly Distribution
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <span>Traffic Velocity Matrix</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Identify peak traffic hours, load distribution patterns, and scheduled cron spikes across local time horizons.
            </p>
          </div>

          {/* Quick Summary Badges */}
          {peakHourInfo && (
            <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-xl bg-[#070a13] border border-white/[0.08]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                <span>Peak: {peakHourInfo.day} {peakHourInfo.hour}:00 ({peakHourInfo.count.toLocaleString()} reqs)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Total: {totalRequests.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2">
        <div className="p-4 sm:p-5 bg-[#070a13]/80 rounded-xl border border-blue-500/15 overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Hour Labels Header */}
            <div className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 mb-2">
              <div className="text-center text-[11px] font-mono text-slate-400 font-semibold uppercase">
                Day
              </div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="text-center text-[10px] font-mono text-slate-400"
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Heatmap Grid Matrix */}
            <div className="space-y-1.5">
              {DAYS.map((day, dayIndex) => (
                <div
                  key={day}
                  className="grid grid-cols-[60px_repeat(24,1fr)] gap-1 items-center"
                >
                  <div className="text-xs font-mono font-medium text-slate-300 pr-2 text-right">
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
                          aspect-square rounded-md ${getColor(count)}
                          transition-all duration-200 cursor-pointer
                          border relative
                          ${
                            isHovered
                              ? "scale-125 z-20 shadow-[0_0_15px_rgba(0,240,255,0.8)] border-white"
                              : "hover:scale-110 hover:z-10"
                          }
                        `}
                        onMouseEnter={() => setHoveredCell(key)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={`${day} ${hour}:00 - ${count.toLocaleString()} reqs (${latency.toFixed(1)}ms)`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Hover Detail Inspector */}
          {hoveredCell &&
            (() => {
              const data = patternMap.get(hoveredCell);
              const [dayIdx, hourStr] = hoveredCell.split("-");
              const day = DAYS[parseInt(dayIdx)];
              const hour = parseInt(hourStr);

              return data && data.count > 0 ? (
                <div className="mt-5 p-3.5 bg-[#091020]/95 backdrop-blur-md rounded-xl border border-cyan-500/30 shadow-[0_4px_20px_rgba(0,240,255,0.15)] flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-semibold text-slate-100">
                        {day} · {hour.toString().padStart(2, "0")}:00 - {(hour + 1).toString().padStart(2, "0")}:00 Local
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Temporal window load telemetry
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs">
                    <div className="px-3 py-1 rounded-lg bg-[#070a13] border border-white/[0.08]">
                      <span className="text-slate-400 mr-1.5">Volume:</span>
                      <span className="text-cyan-400 font-bold">{data.count.toLocaleString()}</span>
                      <span className="text-slate-500 ml-1">reqs</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-[#070a13] border border-white/[0.08]">
                      <span className="text-slate-400 mr-1.5">Avg Latency:</span>
                      <span className="text-emerald-400 font-bold">{data.latency.toFixed(1)}</span>
                      <span className="text-slate-500 ml-1">ms</span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

          {/* Matrix Legend */}
          <div className="mt-5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
            <span className="text-slate-400">Load Intensity</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">Zero</span>
              <div className="w-4 h-4 rounded bg-[#091020]/60 border border-white/[0.04]" />
              <div className="w-4 h-4 rounded bg-cyan-950/60 border border-cyan-800/40" />
              <div className="w-4 h-4 rounded bg-cyan-900/80 border border-cyan-700/60" />
              <div className="w-4 h-4 rounded bg-cyan-600 border border-cyan-500" />
              <div className="w-4 h-4 rounded bg-cyan-400 border border-cyan-300" />
              <div className="w-4 h-4 rounded bg-emerald-400 border border-emerald-300 shadow-[0_0_8px_rgba(0,230,153,0.6)]" />
              <span className="text-emerald-400 text-[10px] font-semibold">Peak</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
