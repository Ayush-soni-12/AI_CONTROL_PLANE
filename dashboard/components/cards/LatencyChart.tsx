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
import { TrendingUp } from "lucide-react";

interface LatencyChartProps {
  signals?: { timestamp: string; latency_ms: number; status?: string }[];
  limit?: number;
}

export function LatencyChart({ signals = [], limit }: LatencyChartProps) {
  const hasSignals = signals && signals.length > 0;
  const now = new Date();

  const viewSignals = hasSignals
    ? (limit ? signals.slice(-limit) : signals)
    : [];

  const chartData = hasSignals
    ? viewSignals.map((signal, idx) => {
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
    <Card className="border border-cyan-500/20 bg-[#0d1527] rounded-xl">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-white tracking-tight">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
              <TrendingUp className="w-4 h-4 shrink-0" />
            </div>
            <span>Real-time Latency Telemetry</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>{hasSignals ? `Last ${chartData.length} signals` : "Listening for signals..."}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Sampled response times across microservice endpoints and AI routing channels
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-4">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-137.5 sm:min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
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
                    backgroundColor: "#091020",
                    borderColor: "rgba(6, 182, 212, 0.4)",
                    borderRadius: "8px",
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
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="latency"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="#06b6d4"
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#06b6d4",
                    stroke: "#070a13",
                    strokeWidth: 2,
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
