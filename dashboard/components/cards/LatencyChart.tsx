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
import { Signal } from "@/lib/types";
import { formatLatency } from "@/lib/function";
import { TrendingUp } from "lucide-react";

interface LatencyChartProps {
  signals: Signal[];
}

export function LatencyChart({ signals }: LatencyChartProps) {
  // Get last 20 signals and format with both date and time
  const chartData = signals.slice(-20).map((signal, idx) => {
    const date = new Date(signal.timestamp);
    return {
      index: idx,
      latency: signal.latency_ms,
      // Format as "HH:MM:SS" for better readability
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      // Full timestamp for tooltip
      fullTimestamp: date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  });

  return (
    <Card className="border-purple-500/20 bg-linear-to-br from-card to-purple-950/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Real-time Latency Monitoring
          </CardTitle>
          <div className="text-sm text-gray-400">
            Last {chartData.length} signals
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
            <XAxis
              dataKey="time"
              stroke="#666"
              tick={{ fill: "#999", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#666"
              tick={{ fill: "#999", fontSize: 12 }}
              tickFormatter={(value) => `${value}ms`}
              label={{
                value: "Latency (ms)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#999", fontSize: 12 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #8b5cf6",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
              }}
              labelStyle={{ color: "#fafafa", fontWeight: "bold" }}
              formatter={(value: number | undefined) =>
                value !== undefined
                  ? [formatLatency(value), "Latency"]
                  : ["N/A", "Latency"]
              }
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return payload[0].payload.fullTimestamp;
                }
                return label;
              }}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#8b5cf6"
              strokeWidth={3}
              fill="url(#latencyGradient)"
              dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 2, stroke: "#1a1a1a" }}
              activeDot={{
                r: 6,
                fill: "#a78bfa",
                stroke: "#8b5cf6",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
