import { Service } from "@/lib/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  Trash2,
  Server,
  ArrowUpRight,
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
      badgeVariant: "emerald" as const,
      color: "text-emerald-400",
    },
    degraded: {
      icon: AlertTriangle,
      badgeVariant: "warning" as const,
      color: "text-amber-400",
    },
    down: {
      icon: AlertTriangle,
      badgeVariant: "destructive" as const,
      color: "text-red-400",
    },
  };

  const config = statusConfig[service.status] || statusConfig.healthy;
  const Icon = config.icon;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(true);
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(false);
          }}
        >
          <div
            className="bg-[#0b1222] border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/25">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 font-mono">
                Delete Service
              </h3>
            </div>
            <p className="text-slate-300 text-sm mb-2">
              Are you sure you want to unregister{" "}
              <span className="font-semibold text-white font-mono">{service.name}</span>?
            </p>
            <p className="text-slate-400 text-xs mb-6">
              This will permanently remove all cached metrics, signals, and active rules for this service.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              >
                {deleting ? "Deleting..." : "Delete Service"}
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
            className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-slate-400 hover:text-red-300 hover:border-red-500/40 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Delete service"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        <Link href={`/services/${service.name}`} className="block">
          <Card className="h-full bg-[#0d1527]/80 backdrop-blur-xl border border-blue-500/15 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 cursor-pointer overflow-hidden relative">
            <CardHeader className="relative p-5 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2.5 text-lg font-mono">
                  <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:border-cyan-400/50 transition-colors">
                    <Server className="w-4 h-4" />
                  </div>
                  <span className="group-hover:text-cyan-300 transition-colors text-white">
                    {service.name}
                  </span>
                </CardTitle>
                <Badge variant={config.badgeVariant} className="font-mono uppercase text-[10px]">
                  <Icon className="w-3 h-3" />
                  {service.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="relative p-5 pt-2">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-[11px] font-mono uppercase">Avg Latency</p>
                  </div>
                  <p
                    className={`text-xl font-bold font-mono ${
                      service.status === "down"
                        ? "text-red-400"
                        : service.status === "degraded"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {formatLatency(service.avg_latency)}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 mb-1 text-slate-400">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <p className="text-[11px] font-mono uppercase">Error Rate</p>
                  </div>
                  <p
                    className={`text-xl font-bold font-mono ${
                      service.status === "down"
                        ? "text-red-400"
                        : service.status === "degraded"
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {(service.error_rate * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
                <span className="text-slate-300 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  {service.endpoints.length} endpoint{service.endpoints.length !== 1 ? "s" : ""}
                </span>
                <span className="text-cyan-400 font-mono font-semibold">
                  {service.total_signals.toLocaleString()} signals
                </span>
              </div>

              <div className="mt-3 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span>Last signal: {formatTimestamp(service.last_signal)}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
