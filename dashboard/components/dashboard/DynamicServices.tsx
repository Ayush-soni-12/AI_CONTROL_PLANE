"use client";

import { useServices } from "@/hooks/useSignals";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Activity } from "lucide-react";
import { Service } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface DynamicServicesProps {
  apiUrl?: string;
}

/**
 * Dynamic Services Component - Now using SSE
 * Streams real-time services data from server
 */
export function DynamicServices({
  apiUrl = "/api/sse/services",
}: DynamicServicesProps) {
  const { data, status, error } = useServices(apiUrl);

  // Show loading skeleton while connecting
  if (status === "connecting" || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton className="h-64 rounded-xl" key={i} />
        ))}
      </div>
    );
  }

  // Show error state
  if (status === "error" || error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
        Error loading services: {error || "Connection error"}
      </div>
    );
  }

  const services = data.services;

  if (services.length === 0) {
    return (
      <div className="text-center py-16 bg-linear-to-br from-card to-purple-950/10 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
        <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
          <Activity className="w-16 h-16 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-200">
          No services detected
        </h3>
        <p className="text-gray-400 mb-6 text-lg">
          Start sending signals from your services
        </p>
        <div className="inline-block">
          <code className="text-sm bg-gray-900/80 px-6 py-3 rounded-lg border border-purple-500/30 text-purple-300">
            curl -X POST http://localhost:8000/api/signals
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service: Service) => (
        <ServiceCard key={service.name} service={service} />
      ))}
    </div>
  );
}
