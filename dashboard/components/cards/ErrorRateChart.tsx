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
import { AlertTriangle } from "lucide-react";

interface ErrorRateChartProps {
  signals: {
    timestamp: string;
    latency_ms: number;
    status: "success" | "error";
  }[];
  limit?: number;
  windowSize?: number;
}

export function ErrorRateChart({
  signals,
  limit = 20,
  windowSize = 5,
}: ErrorRateChartProps) {
  // 1. Signals are already DESC (Newest First).
  // We take the top 'limit' signals.
  // Display order: Newest (Left) -> Oldest (Right)
  const viewSignals = signals.slice(0, limit);

  // 2. Calculate Moving Average Error Rate
  const chartData = viewSignals.map((signal, idx, arr) => {
    // Window: Look at the current signal and the next 'windowSize - 1' signals
    // Since the array is Newest->Oldest, looking 'forward' in the array means looking back in time
    // which effectively gives us the "Last N requests" relative to this point.
    const endIdx = Math.min(idx + windowSize, arr.length);
    const window = arr.slice(idx, endIdx);

    const errorCount = window.filter((s) => s.status === "error").length;
    // Prevent division by zero if window is empty (unlikely)
    const errorRate =
      window.length > 0 ? (errorCount / window.length) * 100 : 0;

    const date = new Date(signal.timestamp);

    return {
      index: idx,
      errorRate: errorRate,
      status: signal.status,
      // Format time
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      fullTimestamp: date.toLocaleString("en-US"),
    };
  });

  const xAxisInterval = Math.max(0, Math.floor(chartData.length / 6));

  return (
    <Card className="border-red-500/20 bg-linear-to-br from-card to-red-950/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Error Rate Trend
          </CardTitle>
          <div className="text-sm text-gray-400">
            Moving avg (last {windowSize} req)
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="index"
              stroke="#666"
              tick={{ fill: "#999", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={xAxisInterval}
              tickFormatter={(index) => {
                const dataPoint = chartData[index];
                return dataPoint ? dataPoint.time : "";
              }}
            />
            <YAxis
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={[0, 100]}
              label={{
                value: "Error Rate (%)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#999", fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
              }}
              labelStyle={{ color: "#fafafa", fontWeight: "bold" }}
              formatter={(value: number | undefined) => [
                value !== undefined ? `${value.toFixed(1)}%` : "N/A",
                "Error Rate",
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullTimestamp;
                }
                return label;
              }}
              cursor={{
                stroke: "#ef4444",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
            />
            <Area
              type="monotone"
              dataKey="errorRate"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#errorGradient)"
              isAnimationActive={false}
              dot={(props) => {
                // Only show dot if this specific point was an error
                const isError = props.payload.status === "error";
                if (!isError) return <></>;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    fill="#ef4444"
                    stroke="#1a1a1a"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
