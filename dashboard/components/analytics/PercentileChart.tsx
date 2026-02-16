"use client";

import React, { useState, useMemo } from "react";
import { usePercentiles } from "@/hooks/useAnalytics";
import { useServices } from "@/hooks/useSignals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function PercentileChart() {
  const [selectedService, setSelectedService] = useState<string | undefined>(
    undefined,
  );
  const { data: servicesData } = useServices();
  const { data: percentileResponse, isLoading } = usePercentiles(
    7,
    selectedService,
  );

  // Transform per-endpoint data to chart format
  const chartData = useMemo(() => {
    if (!percentileResponse?.data) return [];

    // For each timestamp, create an entry with all endpoints' data
    return percentileResponse.data.map((point) => {
      const entry: any = {
        time: new Date(point.timestamp).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        }),
      };

      // Add each endpoint's percentiles as separate data series
      point.endpoints.forEach((ep) => {
        entry[`${ep.endpoint}_p50`] = ep.p50;
        entry[`${ep.endpoint}_p95`] = ep.p95;
        entry[`${ep.endpoint}_p99`] = ep.p99;
      });

      return entry;
    });
  }, [percentileResponse]);

  // Get list of all unique endpoints for legend
  const endpoints = useMemo(() => {
    if (!percentileResponse?.data || percentileResponse.data.length === 0)
      return [];
    const endpointSet = new Set<string>();
    percentileResponse.data.forEach((point) => {
      point.endpoints.forEach((ep) => endpointSet.add(ep.endpoint));
    });
    return Array.from(endpointSet);
  }, [percentileResponse]);

  const services = servicesData?.services || [];

  if (isLoading) {
    return (
      <Card className="bg-linear-to-br from-card to-purple-950/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-200 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-400" />
            Latency Percentiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-gray-400">
            Loading percentile data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-linear-to-br from-card to-purple-950/10 border-purple-500/20 mb-5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-200 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              Latency Percentiles
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              p50, p95, and p99 latency over time (last 7 days)
            </p>
          </div>

          {/* Service Filter */}
          <select
            value={selectedService || ""}
            onChange={(e) => setSelectedService(e.target.value || undefined)}
            className="px-4 py-2 bg-gray-800/50 border border-purple-500/30 rounded-lg text-gray-200 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Services</option>
            {services.map((service) => (
              <option key={service.name} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            No percentile data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
                label={{
                  value: "Latency (ms)",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "1px solid #9333EA",
                  borderRadius: "8px",
                  color: "#F3F4F6",
                }}
              />
              <Legend wrapperStyle={{ color: "#9CA3AF" }} />

              {/* Dynamically render lines for each endpoint's percentiles */}
              {endpoints.map((endpoint, idx) => {
                const colors = [
                  "#10B981",
                  "#F59E0B",
                  "#EF4444",
                  "#8B5CF6",
                  "#EC4899",
                  "#F97316",
                ];
                const baseColor = colors[idx % colors.length];

                return (
                  <React.Fragment key={endpoint}>
                    <Line
                      type="monotone"
                      dataKey={`${endpoint}_p50`}
                      stroke={baseColor}
                      strokeWidth={2}
                      dot={{ r: 3, fill: baseColor }}
                      name={`${endpoint} p50`}
                      strokeDasharray="5 5"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey={`${endpoint}_p95`}
                      stroke={baseColor}
                      strokeWidth={2}
                      dot={{ r: 3, fill: baseColor }}
                      name={`${endpoint} p95`}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey={`${endpoint}_p99`}
                      stroke={baseColor}
                      strokeWidth={3}
                      dot={{ r: 3, fill: baseColor }}
                      name={`${endpoint} p99`}
                      strokeDasharray="2 2"
                      connectNulls
                    />
                  </React.Fragment>
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Info Box - Show max across all endpoints */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="text-xs text-gray-400">p50 (Median)</div>
            <div className="text-lg font-bold text-green-400">
              {chartData.length > 0 &&
              percentileResponse?.data[percentileResponse.data.length - 1]
                ? Math.max(
                    ...percentileResponse.data[
                      percentileResponse.data.length - 1
                    ].endpoints.map((e) => e.p50),
                  ).toFixed(1)
                : "0"}
              ms
            </div>
            <div className="text-xs text-gray-500 mt-1">
              50% of requests faster (worst endpoint)
            </div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <div className="text-xs text-gray-400">p95</div>
            <div className="text-lg font-bold text-yellow-400">
              {chartData.length > 0 &&
              percentileResponse?.data[percentileResponse.data.length - 1]
                ? Math.max(
                    ...percentileResponse.data[
                      percentileResponse.data.length - 1
                    ].endpoints.map((e) => e.p95),
                  ).toFixed(1)
                : "0"}
              ms
            </div>
            <div className="text-xs text-gray-500 mt-1">
              95% of requests faster (worst endpoint)
            </div>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="text-xs text-gray-400">p99</div>
            <div className="text-lg font-bold text-red-400">
              {chartData.length > 0 &&
              percentileResponse?.data[percentileResponse.data.length - 1]
                ? Math.max(
                    ...percentileResponse.data[
                      percentileResponse.data.length - 1
                    ].endpoints.map((e) => e.p99),
                  ).toFixed(1)
                : "0"}
              ms
            </div>
            <div className="text-xs text-gray-500 mt-1">
              99% of requests faster (worst endpoint)
            </div>
          </div>
        </div>

        {/* Show endpoint breakdown */}
        {percentileResponse?.data && percentileResponse.data.length > 0 && (
          <div className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-purple-500/20">
            <div className="text-sm font-medium text-gray-300 mb-3">
              Latest Endpoint Breakdown
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {percentileResponse.data[
                percentileResponse.data.length - 1
              ].endpoints.map((ep) => (
                <div
                  key={ep.endpoint}
                  className="p-3 bg-gray-900/40 rounded border border-gray-700"
                >
                  <div className="text-xs font-mono text-purple-300 mb-2">
                    {ep.endpoint}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-green-400">
                      p50: {ep.p50.toFixed(1)}ms
                    </span>
                    <span className="text-yellow-400">
                      p95: {ep.p95.toFixed(1)}ms
                    </span>
                    <span className="text-red-400">
                      p99: {ep.p99.toFixed(1)}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
