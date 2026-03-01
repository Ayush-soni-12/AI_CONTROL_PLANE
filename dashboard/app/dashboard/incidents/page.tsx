"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useIncidents } from "@/hooks/useIncidents";
import { Siren } from "lucide-react";
import { IncidentCard } from "@/components/dashboard/incidents/IncidentCard";
import { IncidentDetail } from "@/components/dashboard/incidents/IncidentDetail";

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function IncidentTimeline() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState("all");
  const [serviceFilter] = useState("all");

  const { data: incidents, isLoading } = useIncidents(serviceFilter, filter);

  if (selectedId) {
    return (
      <>
        <DashboardSidebar />
        <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background text-white">
          <div className="max-w-4xl mx-auto pt-6">
            <IncidentDetail
              incidentId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 mt-12 2xl:mt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative">
              <div className="p-4 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shrink-0">
                <Siren className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
              </div>
              <div className="flex-1 w-full">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "4px",
                  }}
                >
                  <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Incident Timeline
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-gray-400 mt-1">
                  Full history of what happened, when, and why — built
                  automatically from system activity.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent mb-6" />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="flex bg-gray-900/40 p-1 rounded-xl border border-gray-800/50 backdrop-blur-sm">
              {[
                ["all", "All"],
                ["open", "🔴 Active"],
                ["resolved", "✅ Resolved"],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    filter === val
                      ? "bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-md"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State or Data */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : !incidents || incidents.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl rounded-2xl p-12 text-center">
              <div className="text-xl font-bold text-gray-200 mb-2">
                No incidents found
              </div>
              <div className="text-sm text-gray-400">
                {filter === "open"
                  ? "Everything is running normally."
                  : "No incidents match these filters."}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onClick={() => setSelectedId(incident.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
