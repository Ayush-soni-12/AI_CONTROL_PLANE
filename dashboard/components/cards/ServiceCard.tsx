import { Service } from "@/lib/types";
import { Activity, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { formatLatency, formatTimestamp } from "@/lib/function";
import { Badge } from "../ui/badge";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const statusConfig = {
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

  const config = statusConfig[service.status];
  const Icon = config.icon;

  return (
    <Link href={`/services/${service.name}`} className="block group">
      <Card className="h-full hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 cursor-pointer overflow-hidden relative">
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <span className="group-hover:text-purple-400 transition-colors">
                {service.name}
              </span>
            </CardTitle>
            <Badge
              variant={
                service.status === "healthy"
                  ? "success"
                  : service.status === "degraded"
                    ? "warning"
                    : "error"
              }
              className="flex items-center gap-1"
            >
              <Icon className="w-3 h-3" />
              {service.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-purple-400" />
                <p className="text-xs font-medium text-gray-400">Avg Latency</p>
              </div>
              <p
                className={`text-2xl font-bold ${service.avgLatency > 500 ? "text-yellow-400" : "text-green-400"}`}
              >
                {formatLatency(service.avgLatency)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <p className="text-xs font-medium text-gray-400">Error Rate</p>
              </div>
              <p
                className={`text-2xl font-bold ${service.errorRate > 0.1 ? "text-red-400" : "text-green-400"}`}
              >
                {(service.errorRate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
            <span className="text-gray-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {service.endpoints.length} endpoint
              {service.endpoints.length !== 1 ? "s" : ""}
            </span>
            <span className="text-gray-400 font-medium">
              {service.totalSignals} signals
            </span>
          </div>

          <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Last signal: {formatTimestamp(service.lastSignal)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
