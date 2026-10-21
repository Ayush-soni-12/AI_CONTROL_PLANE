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
import { AlertTriangle, ShieldCheck } from "lucide-react";

interface ErrorRateChartProps {
  signals?: {
    timestamp: string;
    latency_ms: number;
    status: string;
  }[];
  limit?: number;
  windowSize?: number;
}

const isErrorStatus = (st?: string | number) => {
  if (!st) return false;
  if (typeof st === "number") return st >= 400 && ![402, 429].includes(st);
  const s = String(st).toLowerCase().trim();
  return s === "error" || s === "down" || s === "failed" || (s.startsWith("5") && s.length === 3);
};

export function ErrorRateChart({
  signals = [],
  limit,
  windowSize = 5,
}: ErrorRateChartProps) {
  const hasSignals = signals && signals.length > 0;
  const now = new Date();

  const viewSignals = hasSignals
    ? (limit ? signals.slice(-limit) : signals)
    : [];

  const chartData = hasSignals
    ? viewSignals.map((signal, idx, arr) => {
        const endIdx = Math.min(idx + windowSize, arr.length);
        const window = arr.slice(idx, endIdx);
        const errorCount = window.filter((s) => isErrorStatus(s.status)).length;
        const errorRate = window.length > 0 ? (errorCount / window.length) * 100 : 0;
        const date = new Date(signal.timestamp);

        return {
          index: idx,
          errorRate: errorRate,
          status: signal.status,
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
          errorRate: 0,
          status: "success" as const,
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
    <Card className="border border-amber-500/20 bg-[#0d1527] rounded-xl">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-white tracking-tight">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <AlertTriangle className="w-4 h-4 shrink-0" />
            </div>
            <span>Rolling Error Rate &amp; Anomalies</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{hasSignals ? `Last ${chartData.length} signals` : "5-request sliding window"}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Moving average error rate detection triggering adaptive mitigation thresholds
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
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#091020",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                  formatter={(value: number | undefined) => [
                    value !== undefined ? `${value.toFixed(1)}%` : "0%",
                    "Error Rate",
                  ]}
                  labelFormatter={(_, payload) =>
                    payload && payload[0] ? payload[0].payload.fullTimestamp : ""
                  }
                  cursor={{
                    stroke: "#f59e0b",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="#f59e0b"
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#f59e0b",
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
