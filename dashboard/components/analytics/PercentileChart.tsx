"use client";

import React, { useState, useMemo, useEffect } from "react";
import { usePercentiles } from "@/hooks/useAnalytics";
import { useServices } from "@/hooks/useSignals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Activity,
  Zap,
  AlertTriangle,
  Flame,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type PercentileView = "all" | "p50" | "p95" | "p99";
type ChartType = "area" | "line";
type TimeRangeDays = 1 | 7 | 30;

export function PercentileChart() {
  const [days, setDays] = useState<TimeRangeDays>(7);
  const [selectedService, setSelectedService] = useState<string | undefined>(undefined);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [percentileView, setPercentileView] = useState<PercentileView>("all");
  const [chartType, setChartType] = useState<ChartType>("area");

  const { data: servicesData } = useServices();
  const { data: percentileResponse, isLoading } = usePercentiles(days, selectedService);

  // Extract unique endpoints across all received data
  const endpoints = useMemo(() => {
    if (!percentileResponse?.data || percentileResponse.data.length === 0) return [];
    const endpointSet = new Set<string>();
    percentileResponse.data.forEach((point) => {
      point.endpoints?.forEach((ep) => endpointSet.add(ep.endpoint));
    });
    return Array.from(endpointSet);
  }, [percentileResponse]);

  // Ensure an active endpoint is always selected
  const activeEndpoint = useMemo(() => {
    if (endpoints.length === 0) return "";
    if (selectedEndpoint && endpoints.includes(selectedEndpoint)) {
      return selectedEndpoint;
    }
    return endpoints[0];
  }, [endpoints, selectedEndpoint]);

  // Transformed chart data for the active endpoint
  const chartData = useMemo(() => {
    if (!percentileResponse?.data || !activeEndpoint) return [];

    return percentileResponse.data.map((point) => {
      const date = new Date(point.timestamp);
      const timeFormatted =
        days === 1
          ? date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit" });

      const epData = point.endpoints?.find((e) => e.endpoint === activeEndpoint);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entry: any = {
        time: timeFormatted,
        rawTimestamp: point.timestamp,
        p50: epData ? parseFloat(epData.p50.toFixed(1)) : null,
        p95: epData ? parseFloat(epData.p95.toFixed(1)) : null,
        p99: epData ? parseFloat(epData.p99.toFixed(1)) : null,
      };

      return entry;
    });
  }, [percentileResponse, days, activeEndpoint]);

  // Dynamically calculate KPI stats for activeEndpoint
  const currentStats = useMemo(() => {
    if (!percentileResponse?.data || percentileResponse.data.length === 0 || !activeEndpoint) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        scopeLabel: "No Endpoint",
        source: percentileResponse?.source || "raw_signals",
        endpoints: [],
      };
    }

    const latestPoint = percentileResponse.data[percentileResponse.data.length - 1];
    const latestEndpoints = latestPoint.endpoints || [];

    // Search backwards for the latest point with this specific endpoint
    const pointWithEp = [...percentileResponse.data]
      .reverse()
      .find((p) => p.endpoints?.some((e) => e.endpoint === activeEndpoint));

    const epData = pointWithEp?.endpoints.find(
      (e) => e.endpoint === activeEndpoint
    );

    if (epData) {
      return {
        p50: epData.p50,
        p95: epData.p95,
        p99: epData.p99,
        scopeLabel: activeEndpoint,
        source: percentileResponse.source,
        endpoints: latestEndpoints,
      };
    }

    return {
      p50: 0,
      p95: 0,
      p99: 0,
      scopeLabel: activeEndpoint,
      source: percentileResponse.source,
      endpoints: latestEndpoints,
    };
  }, [percentileResponse, activeEndpoint]);

  const services = servicesData?.services || [];

  if (isLoading) {
    return (
      <Card className="glass-card border-blue-500/15 p-6 mb-6">
        <div className="flex items-center justify-between pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-64 bg-slate-800/60 rounded animate-pulse mt-2" />
            </div>
          </div>
        </div>
        <div className="text-center py-20 text-slate-400 font-mono text-sm">
          <div className="inline-block p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-3 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
            <Zap className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
          <p>Compiling high resolution percentile curves...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-blue-500/15 overflow-hidden mb-6 relative">
      {/* Top ambient glow line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-amber-500 opacity-60" />

      <CardHeader className="p-5 sm:p-6 pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                SLA TELEMETRY
              </span>
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Endpoint: <strong className="text-cyan-300 font-normal">{activeEndpoint || "None"}</strong></span>
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <span>Latency Percentiles & Tail Distribution</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Track median execution speed (p50), 95th percentile standard SLA (p95), and worst case tail spikes (p99) for each individual endpoint.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Time Horizon */}
            <div className="flex items-center p-1 rounded-lg bg-[#070a13] border border-white/[0.08]">
              {([1, 7, 30] as TimeRangeDays[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-all ${
                    days === d
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-medium shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {d === 1 ? "24h" : `${d}d`}
                </button>
              ))}
            </div>

            {/* Service Filter */}
            <select
              value={selectedService || ""}
              onChange={(e) => {
                setSelectedService(e.target.value || undefined);
                setSelectedEndpoint("");
              }}
              className="px-3 py-1.5 bg-[#070a13] border border-blue-500/20 rounded-lg text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500/60 transition-colors"
            >
              <option value="">All Services</option>
              {services.map((service) => (
                <option key={service.name} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>

            {/* Endpoint Filter Dropdown */}
            {endpoints.length > 0 && (
              <select
                value={activeEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
                className="px-3 py-1.5 bg-[#070a13] border border-cyan-500/30 rounded-lg text-cyan-200 text-xs font-mono focus:outline-none focus:border-cyan-400 transition-colors max-w-[220px] truncate"
              >
                {endpoints.map((ep) => (
                  <option key={ep} value={ep}>
                    {ep}
                  </option>
                ))}
              </select>
            )}

            {/* Chart Mode Toggle */}
            <button
              onClick={() => setChartType(chartType === "area" ? "line" : "area")}
              title="Toggle Area / Line View"
              className="p-1.5 rounded-lg bg-[#070a13] border border-white/[0.08] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-all text-xs flex items-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-mono uppercase text-[10px]">{chartType}</span>
            </button>
          </div>
        </div>

        {/* Metric Focus Filter Pill Group */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Focus:
            </span>
            <button
              onClick={() => setPercentileView("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all ${
                percentileView === "all"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)] font-semibold"
                  : "bg-[#070a13]/60 text-slate-400 border border-white/[0.05] hover:text-slate-200 hover:border-white/[0.12]"
              }`}
            >
              All Layers
            </button>
            <button
              onClick={() => setPercentileView("p50")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                percentileView === "p50"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(0,230,153,0.15)] font-semibold"
                  : "bg-[#070a13]/60 text-slate-400 border border-white/[0.05] hover:text-slate-200 hover:border-white/[0.12]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              p50 Median
            </button>
            <button
              onClick={() => setPercentileView("p95")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                percentileView === "p95"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)] font-semibold"
                  : "bg-[#070a13]/60 text-slate-400 border border-white/[0.05] hover:text-slate-200 hover:border-white/[0.12]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              p95 SLA
            </button>
            <button
              onClick={() => setPercentileView("p99")}
              className={`px-2.5 py-1 rounded-md text-xs font-mono flex items-center gap-1.5 transition-all ${
                percentileView === "p99"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-semibold"
                  : "bg-[#070a13]/60 text-slate-400 border border-white/[0.05] hover:text-slate-200 hover:border-white/[0.12]"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              p99 Outliers
            </button>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/[0.06] text-slate-400">
            Source: <span className="text-cyan-400 uppercase">{currentStats.source}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 pt-2">
        {/* KPI Stat Cards Bar - Bound directly to activeEndpoint */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {/* p50 Card */}
          <div
            onClick={() => setPercentileView("p50")}
            className={`cursor-pointer p-4 rounded-xl bg-[#091020]/80 border transition-all duration-300 relative group overflow-hidden ${
              percentileView === "p50" || percentileView === "all"
                ? "border-emerald-500/30 hover:border-emerald-400/50 shadow-[0_4px_20px_rgba(0,230,153,0.06)]"
                : "border-white/[0.06] opacity-60 hover:opacity-100"
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>p50 (Median)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {currentStats.p50 < 50 ? "Optimal" : currentStats.p50 < 150 ? "Healthy" : "Elevated"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight my-1 flex items-baseline gap-1">
              <span>{currentStats.p50.toFixed(1)}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-white/[0.04] mt-1" title={activeEndpoint}>
              {activeEndpoint}
            </div>
          </div>

          {/* p95 Card */}
          <div
            onClick={() => setPercentileView("p95")}
            className={`cursor-pointer p-4 rounded-xl bg-[#091020]/80 border transition-all duration-300 relative group overflow-hidden ${
              percentileView === "p95" || percentileView === "all"
                ? "border-amber-500/30 hover:border-amber-400/50 shadow-[0_4px_20px_rgba(245,158,11,0.06)]"
                : "border-white/[0.06] opacity-60 hover:opacity-100"
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>p95 (Tail SLA)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {currentStats.p95 < 200 ? "SLA Met" : "At Risk"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight my-1 flex items-baseline gap-1">
              <span>{currentStats.p95.toFixed(1)}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-white/[0.04] mt-1" title={activeEndpoint}>
              {activeEndpoint}
            </div>
          </div>

          {/* p99 Card */}
          <div
            onClick={() => setPercentileView("p99")}
            className={`cursor-pointer p-4 rounded-xl bg-[#091020]/80 border transition-all duration-300 relative group overflow-hidden ${
              percentileView === "p99" || percentileView === "all"
                ? "border-rose-500/30 hover:border-rose-400/50 shadow-[0_4px_20px_rgba(239,68,68,0.06)]"
                : "border-white/[0.06] opacity-60 hover:opacity-100"
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-pink-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>p99 (Outliers)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-300 border border-rose-500/30">
                {currentStats.p99 < 350 ? "Tolerable" : "High Jitter"}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 tracking-tight my-1 flex items-baseline gap-1">
              <span>{currentStats.p99.toFixed(1)}</span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-white/[0.04] mt-1" title={activeEndpoint}>
              {activeEndpoint}
            </div>
          </div>
        </div>

        {/* Main Chart Canvas */}
        {chartData.length === 0 ? (
          <div className="text-center py-20 rounded-xl bg-[#091020]/40 border border-white/[0.05] text-slate-400">
            <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-mono text-sm">No percentile records available for this endpoint</p>
            <p className="text-xs text-slate-500 mt-1">Send traffic through {activeEndpoint} to view telemetry percentiles</p>
          </div>
        ) : (
          <div className="w-full h-[340px] sm:h-[420px] p-2 sm:p-4 rounded-xl bg-[#070a13]/70 border border-blue-500/15 relative">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e699" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00e699" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="p99Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                    tickMargin={8}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`)}
                    width={70}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
                  />

                  <Tooltip
                    content={
                      <CustomCyberTooltip
                        activeEndpoint={activeEndpoint}
                        percentileView={percentileView}
                      />
                    }
                  />

                  {(percentileView === "all" || percentileView === "p99") && (
                    <Area
                      type="monotone"
                      dataKey="p99"
                      name={`${activeEndpoint} (p99 Peak)`}
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      fill="url(#p99Grad)"
                      dot={{ r: 4, fill: "#ef4444", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                  {(percentileView === "all" || percentileView === "p95") && (
                    <Area
                      type="monotone"
                      dataKey="p95"
                      name={`${activeEndpoint} (p95 Tail SLA)`}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#p95Grad)"
                      dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                  {(percentileView === "all" || percentileView === "p50") && (
                    <Area
                      type="monotone"
                      dataKey="p50"
                      name={`${activeEndpoint} (p50 Median)`}
                      stroke="#00e699"
                      strokeWidth={2}
                      fill="url(#p50Grad)"
                      dot={{ r: 4, fill: "#00e699", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#00e699", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />

                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}s` : `${val}ms`)}
                    width={70}
                  />

                  <Tooltip
                    content={
                      <CustomCyberTooltip
                        activeEndpoint={activeEndpoint}
                        percentileView={percentileView}
                      />
                    }
                  />

                  {(percentileView === "all" || percentileView === "p99") && (
                    <Line
                      type="monotone"
                      dataKey="p99"
                      name={`${activeEndpoint} (p99 Peak)`}
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#ef4444", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                  {(percentileView === "all" || percentileView === "p95") && (
                    <Line
                      type="monotone"
                      dataKey="p95"
                      name={`${activeEndpoint} (p95 Tail SLA)`}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#f59e0b", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#f59e0b", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                  {(percentileView === "all" || percentileView === "p50") && (
                    <Line
                      type="monotone"
                      dataKey="p50"
                      name={`${activeEndpoint} (p50 Median)`}
                      stroke="#00e699"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#00e699", strokeWidth: 1.5, stroke: "#070a13" }}
                      activeDot={{ r: 6, fill: "#00e699", stroke: "#ffffff", strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-Endpoint Selector Cards (Only Concrete Endpoints) */}
        {currentStats.endpoints.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">
                  Endpoint Telemetry Selectors
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Click any endpoint card to inspect
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentStats.endpoints.map((ep) => {
                const isSelected = activeEndpoint === ep.endpoint;
                const p50 = ep.p50;
                const p95 = ep.p95;
                const p99 = ep.p99;
                const maxSpread = Math.max(p99, 100);

                return (
                  <div
                    key={ep.endpoint}
                    onClick={() => setSelectedEndpoint(ep.endpoint)}
                    className={`p-3.5 rounded-xl bg-[#091020]/90 border transition-all cursor-pointer relative group ${
                      isSelected
                        ? "border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)] bg-[#0d162d]"
                        : "border-white/[0.06] hover:border-cyan-500/40 hover:bg-[#0c1428]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`text-xs font-mono font-medium truncate max-w-[170px] ${
                          isSelected ? "text-cyan-300 font-semibold" : "text-slate-200 group-hover:text-cyan-300"
                        }`}
                        title={ep.endpoint}
                      >
                        {ep.endpoint}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-medium ${
                          p99 > 300
                            ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            : p95 > 150
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {p99 > 300 ? "High Latency" : p95 > 150 ? "At Risk" : "Compliant"}
                      </span>
                    </div>

                    {/* Proportional Latency Bar */}
                    <div className="space-y-1 mb-2.5">
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.min((p50 / maxSpread) * 100, 100)}%` }}
                          className="h-full bg-emerald-400 rounded-l-full"
                          title={`p50: ${p50.toFixed(1)}ms`}
                        />
                        <div
                          style={{ width: `${Math.min(((p95 - p50) / maxSpread) * 100, 100)}%` }}
                          className="h-full bg-amber-400"
                          title={`p95: ${p95.toFixed(1)}ms`}
                        />
                        <div
                          style={{ width: `${Math.min(((p99 - p95) / maxSpread) * 100, 100)}%` }}
                          className="h-full bg-rose-400 rounded-r-full"
                          title={`p99: ${p99.toFixed(1)}ms`}
                        />
                      </div>
                    </div>

                    {/* Metric Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                      <div className="p-1 rounded bg-[#070a13] border border-white/[0.04]">
                        <div className="text-[9px] text-slate-500">p50</div>
                        <div className="text-emerald-400 font-semibold">{p50.toFixed(0)}<span className="text-[9px] text-slate-500">ms</span></div>
                      </div>
                      <div className="p-1 rounded bg-[#070a13] border border-white/[0.04]">
                        <div className="text-[9px] text-slate-500">p95</div>
                        <div className="text-amber-400 font-semibold">{p95.toFixed(0)}<span className="text-[9px] text-slate-500">ms</span></div>
                      </div>
                      <div className="p-1 rounded bg-[#070a13] border border-white/[0.04]">
                        <div className="text-[9px] text-slate-500">p99</div>
                        <div className="text-rose-400 font-semibold">{p99.toFixed(0)}<span className="text-[9px] text-slate-500">ms</span></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom Glass Cyber Tooltip
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomCyberTooltip({ active, payload, label, activeEndpoint }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="p-3.5 rounded-xl bg-[#091020]/95 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] min-w-[200px] text-xs font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] mb-2.5">
        <span className="text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          {label}
        </span>
        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 truncate max-w-[130px]">
          {activeEndpoint}
        </span>
      </div>

      <div className="space-y-1.5">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((item: any, i: number) => {
          const color = item.color || "#00f0ff";
          const val = typeof item.value === "number" ? item.value.toFixed(1) : item.value;

          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-300 text-[11px] truncate max-w-[140px]">{item.name}</span>
              </div>
              <span className="font-bold text-slate-100 shrink-0" style={{ color }}>
                {val} ms
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
