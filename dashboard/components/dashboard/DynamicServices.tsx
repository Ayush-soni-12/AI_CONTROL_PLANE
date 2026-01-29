"use client";

import { useServices } from "@/hooks/useSignals";
import { ServiceCard } from "@/components/cards/ServiceCard";
import { Activity } from "lucide-react";
import { Service } from "@/lib/types";

/**
 * Dynamic Services Component - Wrapped in Suspense
 * Fetches and displays real-time services list
 */
export function DynamicServices() {
  const { data: servicesData } = useServices();

  const services = servicesData.services;

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
