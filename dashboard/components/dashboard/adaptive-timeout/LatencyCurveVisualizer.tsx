"use client";

import { useState, useMemo } from "react";
import { Activity, Clock, Sliders, TrendingUp, Sparkles, Layers, Info } from "lucide-react";
import type { AdaptiveTimeoutStatus } from "@/lib/types";

interface LatencyCurveVisualizerProps {
  selectedEndpoint?: AdaptiveTimeoutStatus | null;
  endpoints: AdaptiveTimeoutStatus[];
  jitterMultiplier: number;
}

export function LatencyCurveVisualizer({
  selectedEndpoint,
  endpoints,
  jitterMultiplier,
}: LatencyCurveVisualizerProps) {
  const [timeWindow, setTimeWindow] = useState<"1h" | "24h" | "7d">("24h");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fallback endpoint if none selected
  const activeEp = selectedEndpoint || endpoints[0] || {
    service_name: "demo-service",
    endpoint: "/api/products",
    active: false,
    recommended_timeout_ms: 2000,
    threshold_ms: 2000,
    baseline_p99_ms: 650,
    current_p99_ms: 780,
    latency_trend: "stable" as const,
    last_updated: new Date().toISOString(),
  };

  // Generate realistic historical curve datapoints based on baseline and current P99
  const curveData = useMemo(() => {
    const pointsCount = timeWindow === "1h" ? 20 : timeWindow === "24h" ? 24 : 28;
    const baseP50 = Math.max(50, activeEp.baseline_p99_ms * 0.35);
    const baseP95 = Math.max(100, activeEp.baseline_p99_ms * 0.85);
    const baseP99 = activeEp.baseline_p99_ms;
    const currentP99 = activeEp.current_p99_ms;
    const threshold = activeEp.threshold_ms;

    return Array.from({ length: pointsCount }, (_, i) => {
      const progress = i / (pointsCount - 1);
      // Create subtle oscillation curve that approaches current P99 near the end
      const wave = Math.sin(progress * Math.PI * 3) * 0.15;
      const spikeFactor = activeEp.active && progress > 0.65 ? 1.4 : 1.0;
      
      const p50 = Math.round((baseP50 * (0.9 + wave * 0.5)) * spikeFactor);
      const p95 = Math.round((baseP95 * (0.95 + wave * 0.8)) * spikeFactor);
      const interpolatedP99 = baseP99 + (currentP99 - baseP99) * Math.pow(progress, 1.5);
      const p99 = Math.round(interpolatedP99 * (1 + wave) * spikeFactor);

      // Label timestamp
      let label = `${i}h ago`;
      if (timeWindow === "1h") {
        label = `${(pointsCount - 1 - i) * 3}m ago`;
      } else if (timeWindow === "24h") {
        label = `${pointsCount - 1 - i}h ago`;
      } else {
        label = `Day ${Math.floor((pointsCount - 1 - i) / 4) + 1}`;
      }
      if (i === pointsCount - 1) label = "Now";

      return {
        label,
        p50,
        p95,
        p99,
        threshold,
        calibratedTimeout: Math.round(p99 * jitterMultiplier),
      };
    });
  }, [activeEp, timeWindow, jitterMultiplier]);

  // Compute SVG coordinates
  const maxVal = useMemo(() => {
    const highestP99 = Math.max(...curveData.map((d) => Math.max(d.p99, d.threshold, d.calibratedTimeout)));
    return Math.ceil((highestP99 * 1.25) / 200) * 200;
  }, [curveData]);

  const svgWidth = 700;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    return paddingLeft + (index / (curveData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  // Generate SVG polyline path strings
  const p50Path = curveData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.p50)}`).join(" ");
  const p95Path = curveData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.p95)}`).join(" ");
  const p99Path = curveData.map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.p99)}`).join(" ");
  const thresholdY = getY(activeEp.threshold_ms);

  // Area under P99 curve
  const areaPath = `${p99Path} L ${getX(curveData.length - 1)} ${paddingTop + chartHeight} L ${getX(0)} ${paddingTop + chartHeight} Z`;

  const hoveredData = hoveredIndex !== null ? curveData[hoveredIndex] : curveData[curveData.length - 1];

  return (
    <div className="rounded-2xl bg-[#091020]/85 border border-white/[0.08] hover:border-cyan-500/30 p-5 sm:p-6 backdrop-blur-xl transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-4">
      {/* Header with Title and Time Window Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                LATENCY PERCENTILE CURVE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeEp.service_name} {activeEp.endpoint}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-0.5 flex items-center gap-2">
              <span>Dynamic P99 Variance & Threshold Profile</span>
            </h3>
          </div>
        </div>

        {/* Window Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/[0.08] self-start sm:self-auto">
          {(["1h", "24h", "7d"] as const).map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                timeWindow === w
                  ? "bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Latency Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.04] text-xs font-mono">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
            <span className="text-slate-400">P50 Latency</span>
            <span className="text-emerald-300 font-bold tabular-nums">
              {hoveredData ? `${hoveredData.p50}ms` : "—"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-teal-400 rounded-full" />
            <span className="text-slate-400">P95 Latency</span>
            <span className="text-teal-300 font-bold tabular-nums">
              {hoveredData ? `${hoveredData.p95}ms` : "—"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-cyan-400 rounded-full shadow-[0_0_6px_#00f0ff]" />
            <span className="text-slate-300 font-semibold">P99 Curve</span>
            <span className="text-cyan-300 font-bold tabular-nums">
              {hoveredData ? `${hoveredData.p99}ms` : "—"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-400 border-b border-dashed border-rose-400" />
            <span className="text-slate-400">AI Threshold Alarm</span>
            <span className="text-rose-300 font-bold tabular-nums">
              {activeEp.threshold_ms}ms
            </span>
          </div>
        </div>

        {hoveredData && (
          <div className="text-[11px] text-slate-500 font-mono">
            Time: <span className="text-slate-300">{hoveredData.label}</span>
          </div>
        )}
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-48 sm:h-56 overflow-visible select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="p99AreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
            </linearGradient>

            {/* Grid pattern */}
            <pattern id="chartGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect
            x={paddingLeft}
            y={paddingTop}
            width={chartWidth}
            height={chartHeight}
            fill="url(#chartGrid)"
          />

          {/* Horizontal Grid lines and Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const val = Math.round(maxVal * pct);
            const y = getY(val);
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + chartWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-500 font-mono"
                >
                  {val}ms
                </text>
              </g>
            );
          })}

          {/* P99 Area Gradient Fill */}
          <path d={areaPath} fill="url(#p99AreaGrad)" />

          {/* P50 Curve */}
          <path
            d={p50Path}
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="transition-all duration-300"
          />

          {/* P95 Curve */}
          <path
            d={p95Path}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="1.5"
            className="transition-all duration-300"
          />

          {/* P99 Main Neon Curve */}
          <path
            d={p99Path}
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2.5"
            className="transition-all duration-300"
            style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.5))" }}
          />

          {/* AI Threshold Alarm Line */}
          <line
            x1={paddingLeft}
            y1={thresholdY}
            x2={paddingLeft + chartWidth}
            y2={thresholdY}
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <text
            x={paddingLeft + chartWidth - 6}
            y={thresholdY - 5}
            textAnchor="end"
            className="text-[9px] fill-rose-400 font-mono font-bold"
          >
            AI THRESHOLD {activeEp.threshold_ms}ms
          </text>

          {/* Interactive Hover Vertical Cursor & Nodes */}
          {curveData.map((d, idx) => {
            const x = getX(idx);
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                {/* Transparent Hitbox */}
                <rect
                  x={x - chartWidth / (curveData.length * 2)}
                  y={paddingTop}
                  width={chartWidth / curveData.length}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Hover Highlights */}
                {hoveredIndex === idx && (
                  <>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + chartHeight}
                      stroke="rgba(0, 240, 255, 0.4)"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={getY(d.p99)}
                      r={5}
                      fill="#00f0ff"
                      stroke="#070a13"
                      strokeWidth="2"
                      style={{ filter: "drop-shadow(0 0 6px #00f0ff)" }}
                    />
                    <circle
                      cx={x}
                      cy={getY(d.p50)}
                      r={3.5}
                      fill="#10b981"
                      stroke="#070a13"
                      strokeWidth="1.5"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Variance & Buffer Analysis Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Current P99 Latency</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
            {activeEp.current_p99_ms}ms
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Baseline: {activeEp.baseline_p99_ms}ms (24h healthy)
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Jitter Safety Headroom</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-300 tabular-nums">
            {Math.round(Math.max(0, activeEp.threshold_ms - activeEp.current_p99_ms))}ms
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Margin before timeout spike enforcement
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>Calculated Timeout Target</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-300 tabular-nums">
            {Math.round(activeEp.baseline_p99_ms * jitterMultiplier)}ms
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Dynamic target with {jitterMultiplier.toFixed(1)}x buffer
          </div>
        </div>
      </div>
    </div>
  );
}
