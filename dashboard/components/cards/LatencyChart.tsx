"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatLatency } from "@/lib/function";
import { TrendingUp, Activity } from "lucide-react";

interface LatencyChartProps {
  signals?: { timestamp: string; latency_ms: number; status?: string }[];
  limit?: number;
}

export function LatencyChart({ signals = [], limit = 25 }: LatencyChartProps) {
  // If signals is empty, generate baseline dummy points for live visual readiness
  const hasSignals = signals && signals.length > 0;
  const now = new Date();

  const chartData = hasSignals
    ? signals.slice(0, limit).map((signal, idx) => {
        const date = new Date(signal.timestamp);
        return {
          index: idx,
          latency: signal.latency_ms,
          time: date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          fullTimestamp: date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };
      })
    : Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(now.getTime() - (12 - i) * 5000);
        return {
          index: i,
          latency: 0,
          time: d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
          fullTimestamp: d.toLocaleString(),
        };
      });

  const xAxisInterval = Math.max(0, Math.floor(chartData.length / 6));

  return (
    <Card className="border border-blue-500/15 bg-[#0d1527]/85 backdrop-blur-xl shadow-2xl shadow-black/40">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-slate-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg text-white font-bold">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <span>Real-time Latency Telemetry</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{hasSignals ? `Last ${chartData.length} signals` : "Listening for signals..."}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Sampled response times across microservice endpoints and AI routing channels
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[550px] sm:min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  opacity={0.6}
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  interval={xAxisInterval}
                  tickFormatter={(index) => {
                    const dataPoint = chartData[index];
                    return dataPoint ? dataPoint.time : "";
                  }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(value) => `${value}ms`}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09101f",
                    borderColor: "rgba(6, 182, 212, 0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  formatter={(value: number | undefined) => [
                    value !== undefined ? `${formatLatency(value)}` : "0ms",
                    "Latency",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload && payload[0] ? payload[0].payload.fullTimestamp : ""
                  }
                  cursor={{
                    stroke: "#06b6d4",
                    strokeWidth: 1.5,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#latencyGradient)"
                  dot={{
                    fill: "#06b6d4",
                    r: 3.5,
                    strokeWidth: 2,
                    stroke: "#070a13",
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#67e8f9",
                    stroke: "#06b6d4",
                    strokeWidth: 2.5,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
