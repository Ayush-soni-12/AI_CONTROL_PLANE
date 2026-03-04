import { Service } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { formatLatency, formatTimestamp } from "@/lib/function";
import { Badge } from "../ui/badge";
import { useState } from "react";

const CONTROL_PLANE_URL =
  process.env.NEXT_PUBLIC_CONTROL_PLANE_URL || "http://localhost:8000";

interface ServiceCardProps {
  service: Service;
  onDelete?: (serviceName: string) => void;
}

export function ServiceCard({ service, onDelete }: ServiceCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
    // Optimistically remove BEFORE the fetch so the SSE can't bring it back
    // while the API call is in flight
    onDelete?.(service.name);
    try {
      const res = await fetch(
        `${CONTROL_PLANE_URL}/api/services/${encodeURIComponent(service.name)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Failed to delete service");
    } catch {
      alert("Failed to delete service. Please try again.");
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(false);
          }}
        >
          <div
            className="bg-gray-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-100">
                Delete Service
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{service.name}</span>?
            </p>
            <p className="text-gray-500 text-xs mb-6">
              This will permanently remove all signals, analytics, AI insights,
              incidents, and overrides for this service.{" "}
              <span className="text-red-400 font-medium">
                This cannot be undone.
              </span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Service
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative group">
        {/* Delete button — top-right of card, only visible on hover */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowConfirm(true);
            }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-red-500/0 hover:bg-red-500/20 border border-red-500/0 hover:border-red-500/40 text-gray-600 hover:text-red-400 transition-all duration-200 opacity-0 group-hover:opacity-100"
            title="Delete service"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <Link href={`/services/${service.name}`} className="block">
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
                    <p className="text-xs font-medium text-gray-400">
                      Avg Latency
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${service.status === "down" ? "text-red-400" : service.status === "degraded" ? "text-yellow-400" : "text-green-400"}`}
                  >
                    {formatLatency(service.avg_latency)}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <p className="text-xs font-medium text-gray-400">
                      Error Rate
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${service.status === "down" ? "text-red-400" : service.status === "degraded" ? "text-yellow-400" : "text-green-400"}`}
                  >
                    {(service.error_rate * 100).toFixed(1)}%
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
                  {service.total_signals} signals
                </span>
              </div>

              <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                Last signal: {formatTimestamp(service.last_signal)}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
