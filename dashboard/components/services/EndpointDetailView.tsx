"use client";

import { useEndpointDetail } from "@/hooks/useSignals";
import { formatLatency } from "@/lib/function";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  AlertTriangle,
  Lightbulb,
  ArrowLeft,
  Shield,
  Database,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { LatencyChart } from "../cards/LatencyChart";
import { ErrorRateChart } from "../cards/ErrorRateChart";

interface EndpointDetailViewProps {
  serviceName: string;
  endpointPath: string;
  onBack: () => void;
}

export function EndpointDetailView({
  serviceName,
  endpointPath,
  onBack,
}: EndpointDetailViewProps) {
  const {
    data: detail,
    status,
    error,
  } = useEndpointDetail(serviceName, endpointPath);

  if (status === "connecting" || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-20 px-4 bg-card/50 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
        <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
        <p className="text-sm sm:text-base text-gray-400 animate-pulse text-center">
          Analyzing endpoint performance...
        </p>
      </div>
    );
  }

  if (status === "error" || error) {
    return (
      <div className="text-center py-10 sm:py-16 px-4 bg-card/50 rounded-2xl border border-red-500/20 backdrop-blur-sm">
        <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg sm:text-xl font-bold text-gray-200">
          Failed to load details
        </h3>
        <p className="text-gray-400 mb-6">{error || "Connection error"}</p>
        <button
          onClick={onBack}
          className="px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors"
        >
          Back to Endpoints
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors group shrink-0 mt-1 sm:mt-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-mono font-bold text-purple-300 break-all">
              {detail.endpoint}
            </h2>
            <p className="text-gray-400">
              Endpoint analysis for{" "}
              <span className="text-purple-400 font-semibold">
                {serviceName}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Badge
            variant={detail.cache_enabled ? "success" : "secondary"}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
          >
            <Database className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
            Cache {detail.cache_enabled ? "Active" : "Inactive"}
          </Badge>
          <Badge
            variant={detail.circuit_breaker ? "error" : "success"}
            className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
          >
            <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1.5" />
            Circuit Breaker {detail.circuit_breaker ? "Open" : "Closed"}
          </Badge>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-gray-400">
                Avg Latency
              </span>
            </div>
            <p
              className={`text-4xl font-bold ${detail.avg_latency > (detail.thresholds?.cache_latency_ms ?? 500) ? "text-yellow-400" : "text-green-400"}`}
            >
              {formatLatency(detail.avg_latency)}
            </p>
            <div className="mt-2 h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${detail.avg_latency > (detail.thresholds?.cache_latency_ms ?? 500) ? "bg-red-500" : detail.avg_latency > (detail.thresholds?.cache_latency_ms ?? 500) * 0.8 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{
                  width: `${Math.min(100, (detail.avg_latency / 1000) * 100)}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-gray-400">
                Error Rate
              </span>
            </div>
            <p
              className={`text-4xl font-bold ${detail.error_rate >= (detail.thresholds?.circuit_breaker_error_rate ?? 0.3) ? "text-red-400" : "text-green-400"}`}
            >
              {(detail.error_rate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Based on {detail.total_signals} total signals
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-gray-400">
                Request Volume
              </span>
            </div>
            <p className="text-4xl font-bold text-blue-400">
              {detail.total_signals}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Historical data points tracked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latency Graph */}
      <div className="mb-10">
        <LatencyChart signals={detail.history} />
      </div>

      {/* error rate graph */}

      <div className="mb-10">
        <ErrorRateChart signals={detail.history} />
      </div>

      {/* AI Reasoning and Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insight */}
        <Card className="border-purple-500/20 bg-linear-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-300">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              AI Analysis & Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-xl bg-black/30 border border-purple-500/20 text-purple-100 leading-relaxed italic">
              &quot;{detail.reasoning}&quot;
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-400/70">
              <Info className="w-3.5 h-3.5" />
              Our AI model continuously evaluates latency and error patterns to
              make real-time decisions.
            </div>
          </CardContent>
        </Card>

        {/* Actionable Suggestions */}
        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-gray-200">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Performance Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detail.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 group hover:border-purple-500/30 transition-colors"
                >
                  <div className="mt-1 shrink-0">
                    {suggestion.startsWith("Critical") ? (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    ) : suggestion.startsWith("Optimization") ? (
                      <Zap className="w-4 h-4 text-blue-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-gray-300 group-hover:text-purple-200 transition-colors">
                    {suggestion}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
