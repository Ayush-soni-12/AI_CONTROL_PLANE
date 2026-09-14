"use client";

import React, { useId } from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number | string;
    isPositive: boolean;
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
  const gradientId = useId();

  // Default sparkline paths for each variant if not supplied
  const defaultSparklines: Record<string, number[]> = {
    cyan: [24, 28, 26, 32, 30, 38, 42, 39, 48, 52, 49, 58],
    emerald: [45, 48, 46, 50, 52, 51, 55, 58, 60, 62, 65, 68],
    purple: [15, 18, 24, 20, 28, 35, 30, 42, 38, 48, 52, 60],
    amber: [30, 28, 32, 29, 34, 31, 28, 33, 30, 27, 25, 22],
  };

  const points = sparklineData && sparklineData.length > 2
    ? sparklineData
    : defaultSparklines[variant] || defaultSparklines.cyan;

  // Generate SVG path for sparkline
  const width = 120;
  const height = 40;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coordinates = points.map((p, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 8) - 4;
    return { x, y };
  });

  // Smooth cubic bezier path
  const pathD = coordinates.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const controlX = (prev.x + point.x) / 2;
    return `${acc} C ${controlX},${prev.y} ${controlX},${point.y} ${point.x},${point.y}`;
  }, "");

  const fillD = `${pathD} L ${width},${height} L 0,${height} Z`;

  // Color mappings
  const themeStyles = {
    cyan: {
      border: "hover:border-cyan-500/40",
      glow: "group-hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]",
      iconBg: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
      stroke: "#06b6d4",
      gradientFrom: "rgba(6, 182, 212, 0.35)",
      gradientTo: "rgba(6, 182, 212, 0.0)",
      trendText: trend?.isPositive ? "text-emerald-400" : "text-cyan-400",
    },
    emerald: {
      border: "hover:border-emerald-500/40",
      glow: "group-hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]",
      iconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
      stroke: "#10b981",
      gradientFrom: "rgba(16, 185, 129, 0.35)",
      gradientTo: "rgba(16, 185, 129, 0.0)",
      trendText: "text-emerald-400",
    },
    purple: {
      border: "hover:border-purple-500/40",
      glow: "group-hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]",
      iconBg: "bg-purple-500/10 border-purple-500/25 text-purple-400",
      stroke: "#8b5cf6",
      gradientFrom: "rgba(139, 92, 246, 0.35)",
      gradientTo: "rgba(139, 92, 246, 0.0)",
      trendText: "text-purple-400",
    },
    amber: {
      border: "hover:border-amber-500/40",
      glow: "group-hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]",
      iconBg: "bg-amber-500/10 border-amber-500/25 text-amber-400",
      stroke: "#f59e0b",
      gradientFrom: "rgba(245, 158, 11, 0.35)",
      gradientTo: "rgba(245, 158, 11, 0.0)",
      trendText: "text-amber-400",
    },
  }[variant];

  return (
    <div
      className={`
        group relative rounded-2xl p-5 bg-[#0d1527]/80 backdrop-blur-xl border border-blue-500/15
        shadow-xl shadow-black/40 transition-all duration-300 hover:-translate-y-1
        ${themeStyles.border} ${themeStyles.glow} overflow-hidden
      `}
    >
      {/* Background Radial Glow */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
        style={{ backgroundColor: themeStyles.stroke, opacity: 0.08 }}
      />

      {/* Top Header: Title & Icon */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono font-medium tracking-wider uppercase text-slate-400 group-hover:text-slate-300 transition-colors">
          {title}
        </span>
        <div
          className={`p-2 rounded-xl border transition-all duration-300 group-hover:scale-105 ${themeStyles.iconBg}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Value & Trend */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="space-y-1">
          <p className="text-2xl sm:text-3xl font-bold tracking-tight font-mono text-white">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 text-xs font-mono font-semibold">
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className={themeStyles.trendText}>
                {typeof trend.value === "number"
                  ? `${trend.isPositive ? "+" : ""}${trend.value}%`
                  : trend.value}
              </span>
              {trend.label && (
                <span className="text-slate-500 font-normal ml-0.5">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mini SVG Sparkline */}
        <div className="w-24 sm:w-28 h-10 shrink-0 relative self-end mb-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient
                id={`grad-${gradientId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={themeStyles.gradientFrom} />
                <stop offset="100%" stopColor={themeStyles.gradientTo} />
              </linearGradient>
            </defs>

            {/* Filled Area */}
            <path d={fillD} fill={`url(#grad-${gradientId})`} />

            {/* Glowing Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke={themeStyles.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
