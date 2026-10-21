"use client";

import { useServices } from "@/hooks/useSignals";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Activity, Terminal, Copy, Check } from "lucide-react";
import { Service } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface DynamicServicesProps {
  apiUrl?: string;
}

export function DynamicServices({
  apiUrl = "/api/sse/services",
}: DynamicServicesProps) {
  const { data, status, error } = useServices(apiUrl);
  const [copied, setCopied] = useState(false);

  // Track optimistically-deleted services so they disappear immediately
  const [deletedServices, setDeletedServices] = useState<Set<string>>(
    new Set(),
  );

  function handleServiceDeleted(serviceName: string) {
    setDeletedServices((prev) => new Set([...prev, serviceName]));
  }

  const sampleCurl = `curl -X POST http://localhost:8000/api/signals -H 'Content-Type: application/json'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show loading skeleton while connecting
  if (status === "connecting" && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-xl bg-[#0d1527] border border-slate-800 p-5 space-y-4 animate-pulse"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32 bg-slate-800" />
              <Skeleton className="h-5 w-16 rounded-full bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <Skeleton className="h-16 rounded-lg bg-slate-800" />
              <Skeleton className="h-16 rounded-lg bg-slate-800" />
            </div>
            <Skeleton className="h-8 rounded-lg bg-slate-800 mt-4" />
          </div>
        ))}
      </div>
    );
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs">
        Stream status: {error || "Connecting to control plane services stream..."}
      </div>
    );
  }

  const services = (data?.services || []).filter(
    (s: Service) => !deletedServices.has(s.name),
  );

  if (services.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 px-6 bg-[#0d1527] rounded-xl border border-blue-500/15">
        <div className="inline-flex p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 mb-4 text-cyan-400">
          <Activity className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-white tracking-tight">
          No Registered Microservices
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
          Start sending telemetry signals from your Node.js or Python backend using the NeuralControl SDK or cURL.
        </p>
        <div className="inline-flex items-center gap-2 max-w-full overflow-x-auto bg-[#070a13] px-4 py-2.5 rounded-lg border border-slate-800 text-cyan-300 font-mono text-xs">
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <code className="whitespace-nowrap text-slate-200">
            {sampleCurl}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-2 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Copy command"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
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
