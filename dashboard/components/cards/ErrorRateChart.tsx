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
    status: "success" | "error";
  }[];
  limit?: number;
  windowSize?: number;
}

export function ErrorRateChart({
  signals = [],
  limit = 25,
  windowSize = 5,
}: ErrorRateChartProps) {
  const hasSignals = signals && signals.length > 0;
  const now = new Date();

  const viewSignals = signals.slice(0, limit);

  const chartData = hasSignals
    ? viewSignals.map((signal, idx, arr) => {
        const endIdx = Math.min(idx + windowSize, arr.length);
        const window = arr.slice(idx, endIdx);
        const errorCount = window.filter((s) => s.status === "error").length;
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
          fullTimestamp: date.toLocaleString(),
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
    <Card className="border border-blue-500/15 bg-[#0d1527]/85 backdrop-blur-xl shadow-2xl shadow-black/40">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-slate-800/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
          <CardTitle className="flex items-center gap-2.5 text-base sm:text-lg text-white font-bold">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            </div>
            <span>Rolling Error Rate & Anomalies</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>5-request sliding window</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Moving average error rate detection triggering adaptive mitigation thresholds
        </p>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[550px] sm:min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
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
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#09101f",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
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
                    strokeWidth: 1.5,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#errorGradient)"
                  dot={{
                    fill: "#f59e0b",
                    r: 3.5,
                    strokeWidth: 2,
                    stroke: "#070a13",
                  }}
                  activeDot={{
                    r: 6,
                    fill: "#fcd34d",
                    stroke: "#f59e0b",
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
