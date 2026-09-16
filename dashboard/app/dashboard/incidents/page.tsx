"use client";

import { useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { useIncidents, Incident } from "@/hooks/useIncidents";
import { IncidentCard } from "@/components/dashboard/incidents/IncidentCard";
import { IncidentDetail } from "@/components/dashboard/incidents/IncidentDetail";
import { IncidentActiveBanner } from "@/components/dashboard/incidents/IncidentActiveBanner";
import { QuickOverrideModal } from "@/components/dashboard/incidents/QuickOverrideModal";
import {
  Siren,
  Search,
  Filter,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Layers,
  Activity,
  CheckCircle2,
} from "lucide-react";

export default function IncidentTimelinePage() {
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [quickOverrideIncident, setQuickOverrideIncident] = useState<Incident | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const { data: incidents, isLoading, refetch, isFetching } = useIncidents(
    serviceFilter === "all" ? undefined : serviceFilter,
    statusFilter === "all" ? undefined : statusFilter
  );

  // Extract distinct service names for filter dropdown
  const serviceOptions = useMemo(() => {
    if (!incidents) return [];
    const services = new Set<string>();
    incidents.forEach((inc) => {
      if (inc.service_name) services.add(inc.service_name);
    });
    return Array.from(services);
  }, [incidents]);

  // Active incidents for the top alert banner
  const activeIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((inc) => inc.status === "open");
  }, [incidents]);

  // Client-side filtered list (search query + local filtering)
  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter((inc) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = inc.title.toLowerCase().includes(query);
        const matchesService = inc.service_name.toLowerCase().includes(query);
        const matchesEndpoint = inc.endpoint.toLowerCase().includes(query);
        const matchesCause = inc.root_cause_summary?.toLowerCase().includes(query) || false;
        if (!matchesTitle && !matchesService && !matchesEndpoint && !matchesCause) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, searchQuery]);

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen bg-[#030712] text-slate-100 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Detail View Mode */}
          {selectedIncidentId ? (
            <div className="pt-8 sm:pt-4 max-w-5xl mx-auto">
              <IncidentDetail
                incidentId={selectedIncidentId}
                onBack={() => setSelectedIncidentId(null)}
                onQuickOverride={(inc) => setQuickOverrideIncident(inc)}
              />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 mt-12 2xl:mt-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                    <ShieldAlert className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
                        Incident Command Center
                      </h1>
                      <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        LIVE TELEMETRY
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                      Autonomous incident detection, real-time AI root cause triage, and rapid mitigation workflows.
                    </p>
                  </div>
                </div>

                {/* Refresh Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
                    Sync Signals
                  </button>
                </div>
              </div>

              {/* Active Outage Banner */}
              <IncidentActiveBanner
                activeIncidents={activeIncidents}
                onSelectIncident={(id) => setSelectedIncidentId(id)}
                onQuickOverride={(inc) => setQuickOverrideIncident(inc)}
              />

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-[#091020]/60 border border-white/[0.08] backdrop-blur-xl">
                {/* Status Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "All Incidents" },
                    {
                      id: "open",
                      label: "Active Outages",
                      count: activeIncidents.length,
                      danger: activeIncidents.length > 0,
                    },
                    { id: "resolved", label: "Resolved" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
                        statusFilter === tab.id
                          ? tab.danger
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      {tab.label}
                      {tab.count !== undefined && tab.count > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Search & Service Filter */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  {/* Service dropdown */}
                  <div className="w-full sm:w-auto">
                    <select
                      value={serviceFilter}
                      onChange={(e) => setServiceFilter(e.target.value)}
                      className="w-full sm:w-44 px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="all">All Services</option>
                      {serviceOptions.map((svc) => (
                        <option key={svc} value={svc}>
                          {svc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search URI, service or root cause..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Incidents Queue */}
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-28 rounded-2xl bg-[#091020]/40 border border-white/[0.05] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="text-center py-20 rounded-2xl bg-[#091020]/40 border border-white/[0.06] backdrop-blur-xl">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                    <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold font-mono text-slate-200 mb-1">
                    No Incidents Match Query
                  </h3>
                  <p className="text-xs font-mono text-slate-400 max-w-md mx-auto">
                    {statusFilter === "open"
                      ? "All services operating normally with zero active breaches."
                      : "Try refining your search terms or service filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIncidents.map((incident) => (
                    <IncidentCard
                      key={incident.id}
                      incident={incident}
                      onClick={() => setSelectedIncidentId(incident.id)}
                      onQuickOverride={(inc) => setQuickOverrideIncident(inc)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Override Modal Drawer */}
      {quickOverrideIncident && (
        <QuickOverrideModal
          incident={quickOverrideIncident}
          onClose={() => setQuickOverrideIncident(null)}
        />
      )}
    </>
  );
}
