"use client";

import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value?: number | string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: "cyan" | "emerald" | "purple" | "amber";
  sparklineData?: number[];
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "cyan",
  sparklineData,
}: MetricCardProps) {
  const defaultSparklines: Record<string, number[]> = {
    cyan: [24, 28, 26, 32, 30, 38, 42, 39, 48, 52, 49, 58],
    emerald: [45, 48, 46, 50, 52, 51, 55, 58, 60, 62, 65, 68],
    purple: [15, 18, 24, 20, 28, 35, 30, 42, 38, 48, 52, 60],
    amber: [30, 28, 32, 29, 34, 31, 28, 33, 30, 27, 25, 22],
  };

  const points =
    sparklineData && sparklineData.length > 2
      ? sparklineData
      : defaultSparklines[variant] || defaultSparklines.cyan;

  const width = 120;
  const height = 36;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coordinates = points.map((p, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  const pathD = coordinates.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const controlX = (prev.x + point.x) / 2;
    return `${acc} C ${controlX},${prev.y} ${controlX},${point.y} ${point.x},${point.y}`;
  }, "");

  const themeStyles = {
    cyan: {
      border: "hover:border-cyan-500/40",
      iconBg: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
      stroke: "#06b6d4",
      trendText: trend?.isPositive ? "text-emerald-400" : "text-cyan-400",
    },
    emerald: {
      border: "hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
      stroke: "#10b981",
      trendText: "text-emerald-400",
    },
    purple: {
      border: "hover:border-purple-500/40",
      iconBg: "bg-purple-500/10 border-purple-500/25 text-purple-400",
      stroke: "#8b5cf6",
      trendText: "text-purple-400",
    },
    amber: {
      border: "hover:border-amber-500/40",
      iconBg: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      stroke: "#f59e0b",
      trendText: "text-amber-400",
    },
  }[variant || "cyan"];

  const hasActivity = points.some((p) => p > 0);
  const strokeColor = hasActivity ? themeStyles.stroke : "#475569";

  return (
    <div
      className={`rounded-xl p-5 bg-[#0d1527] border border-blue-500/15 ${themeStyles.border} transition-colors flex flex-col justify-between`}
    >
      {/* Top Header: Title & Icon */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg border ${themeStyles.iconBg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Value & Trend */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="space-y-1">
          <p className="text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums text-white">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 text-xs font-mono">
              {trend.value !== undefined && trend.value !== "" ? (
                <>
                  {trend.isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span className={themeStyles.trendText}>
                    {typeof trend.value === "number"
                      ? `${trend.isPositive ? "+" : ""}${trend.value}%`
                      : trend.value}
                  </span>
                </>
              ) : null}
              {trend.label && (
                <span className="text-slate-500">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mini Crisp Sparkline - Colored stroke without blurry gradient fog or glow */}
        <div className="w-24 sm:w-28 h-9 shrink-0 relative self-end mb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
          >
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
