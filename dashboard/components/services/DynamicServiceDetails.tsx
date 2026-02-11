"use client";

import { useServices } from "@/hooks/useSignals";
import { formatLatency, formatTimestamp } from "@/lib/function";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Server,
  TrendingUp,
  Shield,
  Database,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Endpoint, Service } from "@/lib/types";
import { useState } from "react";
import { EndpointDetailView } from "./EndpointDetailView";

interface DynamicServiceDetailsProps {
  serviceName: string;
}

type ServiceStatus = "healthy" | "degraded" | "down";

interface StatusConfigItem {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

type StatusConfig = Record<ServiceStatus, StatusConfigItem>;

export function DynamicServiceDetails({
  serviceName,
}: DynamicServiceDetailsProps) {
  const router = useRouter();
  const { data, status, error } = useServices();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);

  // Show loading state while connecting
  if (status === "connecting" || !data) {
    return (
      <div className="text-center py-16 bg-linear-to-br from-card to-purple-950/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
        <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
          <Server className="w-16 h-16 text-purple-400 animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-200">
          Loading service details...
        </h3>
      </div>
    );
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="text-center py-16 bg-red-500/10 rounded-2xl border border-red-500/30">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-3 text-gray-200">
          Error loading service
        </h3>
        <p className="text-gray-400 mb-6 text-lg">
          {error || "Connection error"}
        </p>
      </div>
    );
  }

  const service = data.services.find((s: Service) => s.name === serviceName);

  if (!service) {
    return (
      <div className="text-center py-16 bg-linear-to-br from-card to-purple-950/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
        <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
          <Server className="w-16 h-16 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-200">
          Service not found
        </h3>
        <p className="text-gray-400 mb-6 text-lg">
          The service &quot;{serviceName}&quot; does not exist
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  const statusConfig: StatusConfig = {
    healthy: {
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    degraded: {
      icon: AlertTriangle,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
    },
    down: {
      icon: AlertTriangle,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
  };

  const config = statusConfig[service.status as ServiceStatus];
  const StatusIcon = config.icon;

  if (selectedEndpoint) {
    return (
      <EndpointDetailView
        serviceName={serviceName}
        endpointPath={selectedEndpoint}
        onBack={() => setSelectedEndpoint(null)}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Server className="w-10 h-10 text-purple-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              {service.name}
            </h1>
            <p className="text-gray-400 mt-1">
              Service Overview & Endpoint Details
            </p>
          </div>
        </div>
        <Badge
          variant={
            service.status === "healthy"
              ? "success"
              : service.status === "degraded"
                ? "warning"
                : "error"
          }
          className="flex items-center gap-2 px-4 py-2 text-lg"
        >
          <StatusIcon className="w-5 h-5" />
          {service.status}
        </Badge>
      </div>

      {/* Service Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              Total Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">
              {service.total_signals}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-400" />
              Avg Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${service.avg_latency > 500 ? "text-yellow-400" : "text-green-400"}`}
            >
              {formatLatency(service.avg_latency)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${service.error_rate > 0.1 ? "text-red-400" : "text-green-400"}`}
            >
              {(service.error_rate * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Endpoints
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {service.endpoints.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Endpoints List */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-3xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Endpoints
          </h2>
          <div className="h-px flex-1 bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent" />
        </div>

        <div className="space-y-4">
          {service.endpoints.map((endpoint: Endpoint) => {
            return (
              <Card
                key={endpoint.path}
                onClick={() => setSelectedEndpoint(endpoint.path)}
                className="border-purple-500/20 bg-card/50 backdrop-blur-sm hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-mono text-purple-300 mb-2 group-hover:text-purple-400 transition-colors">
                        {endpoint.path}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                          {endpoint.signal_count} signals
                        </div>
                        {endpoint.tenant_id && (
                          <Badge variant="outline" className="text-xs">
                            Tenant: {endpoint.tenant_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Average Latency */}
                    <div className="p-4 rounded-lg bg-linear-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-green-400" />
                        <p className="text-xs font-medium text-gray-400">
                          Avg Latency
                        </p>
                      </div>
                      <p
                        className={`text-2xl font-bold ${endpoint.avg_latency > 500 ? "text-yellow-400" : "text-green-400"}`}
                      >
                        {formatLatency(endpoint.avg_latency)}
                      </p>
                    </div>

                    {/* Error Rate */}
                    <div className="p-4 rounded-lg bg-linear-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-400" />
                        <p className="text-xs font-medium text-gray-400">
                          Error Rate
                        </p>
                      </div>
                      <p
                        className={`text-2xl font-bold ${endpoint.error_rate > 0.1 ? "text-red-400" : "text-green-400"}`}
                      >
                        {(endpoint.error_rate * 100).toFixed(1)}%
                      </p>
                    </div>

                    {/* Cache Status */}
                    <div className="p-4 rounded-lg bg-linear-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        <p className="text-xs font-medium text-gray-400">
                          Cache
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            endpoint.cache_enabled ? "success" : "secondary"
                          }
                          className="text-sm"
                        >
                          {endpoint.cache_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>

                    {/* Circuit Breaker Status */}
                    <div className="p-4 rounded-lg bg-linear-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <p className="text-xs font-medium text-gray-400">
                          Circuit Breaker
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            endpoint.circuit_breaker ? "error" : "success"
                          }
                          className="text-sm"
                        >
                          {endpoint.circuit_breaker ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    {/* Rate Limiting Status - NEW */}
                    {endpoint.rate_limit_enabled !== undefined && (
                      <div className="p-4 rounded-lg bg-linear-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-4 h-4 text-orange-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-xs font-medium text-gray-400">
                            Rate Limit
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              endpoint.rate_limit_enabled
                                ? "warning"
                                : "success"
                            }
                            className="text-sm"
                          >
                            {endpoint.rate_limit_enabled
                              ? "Enabled"
                              : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* AI Reasoning Section */}
                  <div className="mt-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-purple-500/10 mt-0.5">
                        <svg
                          className="w-4 h-4 text-purple-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-purple-400 mb-1">
                          AI Decision Reasoning
                        </p>
                        <p className="text-sm text-gray-300">
                          {endpoint.reasoning}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Last Signal Timestamp */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Last signal received: {formatTimestamp(service.last_signal)}
      </div>
    </>
  );
}
