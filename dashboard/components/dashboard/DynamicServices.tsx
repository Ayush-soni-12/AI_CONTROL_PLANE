"use client";

import { useServices } from "@/hooks/useSignals";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Activity, Terminal, Sparkles } from "lucide-react";
import { Service } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface DynamicServicesProps {
  apiUrl?: string;
}

/**
 * Dynamic Services Component
 * Streams real-time services data from SSE and renders obsidian service cards
 */
export function DynamicServices({
  apiUrl = "/api/sse/services",
}: DynamicServicesProps) {
  const { data, status, error } = useServices(apiUrl);

  // Track optimistically-deleted services so they disappear immediately
  const [deletedServices, setDeletedServices] = useState<Set<string>>(
    new Set(),
  );

  function handleServiceDeleted(serviceName: string) {
    setDeletedServices((prev) => new Set([...prev, serviceName]));
  }

  // Show loading skeleton while connecting
  if (status === "connecting" && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-[#0d1527]/60 border border-blue-500/10 p-5 space-y-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32 bg-slate-800" />
              <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Skeleton className="h-16 rounded-xl bg-slate-800" />
              <Skeleton className="h-16 rounded-xl bg-slate-800" />
            </div>
            <Skeleton className="h-8 rounded-xl bg-slate-800 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs">
        Stream status: {error || "Connecting to control plane services stream..."}
      </div>
    );
  }

  const services = (data?.services || []).filter(
    (s: Service) => !deletedServices.has(s.name),
  );

  if (services.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 px-6 bg-[#0d1527]/80 rounded-2xl border border-blue-500/20 backdrop-blur-xl shadow-2xl shadow-black/40">
        <div className="inline-flex p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 mb-4 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          <Activity className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-white font-mono">
          No Registered Microservices
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto">
          Start sending telemetry signals from your Node.js or Python backend using the NeuralControl SDK or cURL.
        </p>
        <div className="inline-block max-w-full overflow-x-auto">
          <div className="flex items-center gap-2 bg-[#070a13] px-4 py-3 rounded-xl border border-slate-800 text-cyan-300 font-mono text-xs">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <code className="whitespace-nowrap">
              curl -X POST http://localhost:8000/api/signals -H &apos;Content-Type: application/json&apos;
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service: Service) => (
        <ServiceCard
          key={service.name}
          service={service}
          onDelete={handleServiceDeleted}
        />
      ))}
    </div>
  );
}

