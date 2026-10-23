/* eslint-disable react-hooks/set-state-in-render */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { FlagCard } from "@/components/dashboard/flags/FlagCard";
import { useFlags, useFlagServices } from "@/hooks/useFlags";
import { useServices } from "@/hooks/useSignals";
import { FlagAuditLog } from "@/components/dashboard/flags/FlagAuditLog";
import {
  Flag,
  Plus,
  X,
  RefreshCw,
  Search,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
} from "lucide-react";

const PRESET_ROLLOUTS = [0, 10, 25, 50, 100];

export default function FeatureFlagsPage() {
  const [serviceName, setServiceName] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "auto-disabled">("all");

  // Create Flag Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagService, setNewFlagService] = useState("");
  const [newFlagRollout, setNewFlagRollout] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { services: flagServices, refetch: refetchServices } = useFlagServices();
  const { data: servicesData } = useServices();

  // Compute live services from API
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    flagServices.forEach((s) => {
      if (s && s.trim()) set.add(s.trim());
    });
    return Array.from(set);
  }, [flagServices, servicesData]);

  const { flags, isLoading: apiLoading, error, updateFlag, killFlag, createFlag, refetch } =
    useFlags(serviceName);

  // Filter flags by search query and status
  const filteredFlags = useMemo(() => {
    return flags.filter((f) => {
      const matchesSearch =
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.service_name.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "active") {
        return f.status === "enabled" && f.rollout_percent > 0;
      }
      if (statusFilter === "disabled") {
        return f.status === "disabled" || f.rollout_percent === 0;
      }
      if (statusFilter === "auto-disabled") {
        return f.status === "auto-disabled";
      }

      return true;
    });
  }, [flags, searchQuery, statusFilter]);

  // Live update handler
  const handleUpdate = async (flagName: string, rolloutPercent: number, reason?: string): Promise<boolean> => {
    return await updateFlag(flagName, rolloutPercent, reason);
  };

  // Live kill handler
  const handleKill = async (flagName: string): Promise<boolean> => {
    if (killFlag) {
      return await killFlag(flagName);
    }
    return await updateFlag(flagName, 0, "Emergency operator kill switch");
  };

  // Create flag submission
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagName.trim()) return;
    setCreating(true);
    setCreateError(null);

    const targetService = newFlagService.trim() || availableServices[0] || (serviceName !== "all" ? serviceName : "");
    if (!targetService) {
      setCreateError("Please select or enter a target service.");
      setCreating(false);
      return;
    }

    const created = await createFlag(newFlagName.trim(), newFlagRollout, targetService);
    if (created) {
      setNewFlagName("");
      setNewFlagRollout(0);
      setShowCreate(false);
      refetch();
      refetchServices();
    } else {
      setCreateError("Failed to create feature flag. Ensure the name is unique.");
    }
    setCreating(false);
  };

  // Summary Metrics calculated on live flags
  const totalFlags = flags.length;
  const activeCount = flags.filter((f) => f.status === "enabled" && f.rollout_percent > 0).length;
  const fullRolloutCount = flags.filter((f) => f.rollout_percent === 100).length;
  const autoDisabledCount = flags.filter((f) => f.status === "auto-disabled").length;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Command Bar & Search Header */}
          <TopCommandHeader />

          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white/10 text-white border border-white/15">
                  FEATURE CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Live Canary Rollouts
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#fafafa]">
                Feature Flags &amp; Canary Rollouts
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Progressive traffic distribution, emergency kill switches, and autonomous AI rollback governance
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => refetch()}
                disabled={apiLoading}
                className="px-3.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] hover:border-[#3f3f46] text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer"
                title="Refresh flag state"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${apiLoading ? "animate-spin text-[#fafafa]" : ""}`} />
                <span>Sync Flags</span>
              </button>

              <button
                onClick={() => {
                  setNewFlagService(serviceName !== "all" ? serviceName : (availableServices[0] || "payment-service"));
                  setNewFlagName("");
                  setNewFlagRollout(0);
                  setCreateError(null);
                  setShowCreate(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-medium text-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-2" />
                <span>New Feature Flag</span>
              </button>
            </div>
          </div>

          {/* Top Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Scoped Flags */}
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Sliders className="w-4 h-4 text-[#fafafa]" />
                  <span>Total Scoped Flags</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
                  {serviceName === "all" ? "Fleet Wide" : serviceName}
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#fafafa] tabular-nums">
                {totalFlags}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-mono">
                Active scope: <span className="text-slate-400">{serviceName === "all" ? "All Microservices" : serviceName}</span>
              </div>
            </div>

            {/* Card 2: Active Canaries */}
            <div className="p-5 rounded-xl bg-[#0d1527] border  border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Active Canaries</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-[#22c55e] border border-[#27272a]">
                  Routing
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#22c55e] tabular-nums">
                {activeCount}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-mono">
                Routing live traffic ({totalFlags > 0 ? ((activeCount / totalFlags) * 100).toFixed(0) : 0}%)
              </div>
            </div>

            {/* Card 3: 100% Full Rollout */}
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Zap className="w-4 h-4 text-[#fafafa]" />
                  <span>100% Full Rollout</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-[#fafafa] border border-[#27272a]">
                  GA
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#fafafa] tabular-nums">
                {fullRolloutCount}
              </div>
              <div className="text-xs text-slate-400 mt-1.5">
                Production wide features
              </div>
            </div>

            {/* Card 4: AI Auto-Disabled */}
            <div
              className={`p-5 rounded-xl border transition-colors ${
                autoDisabledCount > 0
                  ? "bg-[#0d1527] border-rose-500/40"
                  : "bg-[#0d1527] border-[#27272a] hover:border-[#3f3f46]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <AlertTriangle className={`w-4 h-4 ${autoDisabledCount > 0 ? "text-rose-400" : "text-[#71717a]"}`} />
                  <span>AI Auto-Disabled</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${autoDisabledCount > 0 ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "bg-[#18181b] text-[#71717a] border border-[#27272a]"}`}>
                  {autoDisabledCount > 0 ? "Anomaly Locked" : "Nominal"}
                </span>
              </div>
              <div className={`text-3xl font-semibold font-mono tabular-nums ${autoDisabledCount > 0 ? "text-rose-400" : "text-[#fafafa]"}`}>
                {autoDisabledCount}
              </div>
              <div className="text-xs text-slate-400 mt-1.5">
                {autoDisabledCount > 0 ? "Automated anomaly rollbacks" : "Zero active anomaly locks"}
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 rounded-xl bg-[#091020] border border-cyan-500/20">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Flags", count: totalFlags },
                { id: "active", label: "Active Canaries", count: activeCount },
                { id: "disabled", label: "Disabled (0%)" },
                {
                  id: "auto-disabled",
                  label: "AI Auto-Disabled",
                  count: autoDisabledCount,
                  danger: autoDisabledCount > 0,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    statusFilter === tab.id
                      ? tab.danger
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-[#18181b] text-[#fafafa] border border-[#3f3f46]"
                      : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] border border-transparent"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        tab.danger
                          ? "bg-rose-500 text-white"
                          : "bg-[#27272a] text-[#fafafa]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Right: Service Selector & Search Box */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Service Dropdown */}
              <div className="w-full sm:w-auto flex items-center gap-1.5">
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#3f3f46] cursor-pointer"
                >
                  <option value="all">All Services ({flags.length})</option>
                  {availableServices.map((svc) => {
                    const count = flags.filter((f) => f.service_name.toLowerCase() === svc.toLowerCase()).length;
                    return (
                      <option key={svc} value={svc}>
                        {svc} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter flags by name..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-mono text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#3f3f46]"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Flags List / Grid */}
          {filteredFlags.length === 0 ? (
            <div className="rounded-xl bg-[#0d1527] border border-[#27272a] p-12 text-center">
              <div className="inline-flex p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 mb-4 text-cyan-400">
                <Flag className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white tracking-tight">
                No feature flags match your filters
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "No flags match the current search query and status filters."
                  : serviceName === "all"
                  ? "No feature flags are currently registered across your services. Create your first flag to start canary rollouts."
                  : `There are no feature flags registered under "${serviceName}". Create your first flag to start canary rollouts.`}
              </p>
              <button
                onClick={() => {
                  setNewFlagService(serviceName !== "all" ? serviceName : (availableServices[0] || ""));
                  setNewFlagName("");
                  setNewFlagRollout(0);
                  setCreateError(null);
                  setShowCreate(true);
                }}
                className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-medium text-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-2" />
                <span>Create New Flag</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {filteredFlags.map((flag) => (
                <FlagCard
                  key={flag.id ? `flag-id-${flag.id}` : `flag-key-${flag.service_name}-${flag.name}`}
                  flag={flag}
                  onUpdate={handleUpdate}
                  onKill={handleKill}
                  latestTraceId={flag.status === "auto-disabled" ? "tr-anomaly-rollback" : null}
                />
              ))}
            </div>
          )}

          {/* Global Service Audit Trail */}
          <div className="pt-6 border-t border-[#27272a]">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-1.5 rounded-md bg-[#0d1527] border border-[#27272a] text-[#a1a1aa]">
                <Layers className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#fafafa]">
                  Service Audit Stream
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Chronological trace of all operator changes and autonomous AI rollbacks for {serviceName === "all" ? "all services" : serviceName}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#0d1527] border border-[#27272a] p-5 sm:p-6">
              <FlagAuditLog
                serviceName={serviceName}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Flag Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#0d1527] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden text-[#fafafa] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#27272a]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[#0d1527] border border-[#27272a] text-[#fafafa]">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#fafafa]">
                    Create New Feature Flag
                  </h3>
                  <p className="text-[11px] font-mono text-[#a1a1aa]">
                    Target Service: {newFlagService}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="w-7 h-7 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] flex items-center justify-center text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-[#fafafa] mb-1.5 font-medium">
                  Flag Name <span className="text-[#22c55e]">*</span>
                </label>
                <input
                  value={newFlagName}
                  onChange={(e) => setNewFlagName(e.target.value)}
                  placeholder="e.g. smart-caching-v2"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-sm font-mono text-[#fafafa] focus:outline-none focus:border-[#3f3f46] placeholder-[#71717a]"
                />
                <span className="text-[11px] font-mono text-[#71717a] mt-1 block">
                  Lowercase alphanumeric with hyphens
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#fafafa] mb-1.5 font-medium">
                  Target Service <span className="text-[#22c55e]">*</span>
                </label>
                {availableServices.length > 0 ? (
                  <select
                    value={newFlagService}
                    onChange={(e) => setNewFlagService(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-sm font-mono text-[#fafafa] focus:outline-none focus:border-[#3f3f46] cursor-pointer"
                    required
                  >
                    <option value="" disabled>Select microservice</option>
                    {availableServices.map((srv) => (
                      <option key={srv} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={newFlagService}
                    onChange={(e) => setNewFlagService(e.target.value)}
                    placeholder="e.g. payment-service"
                    className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-sm font-mono text-[#fafafa] focus:outline-none focus:border-[#3f3f46] placeholder-[#71717a]"
                    required
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-[#fafafa] font-medium">
                    Initial Canary Rollout:
                  </label>
                  <span className="text-sm font-mono font-semibold text-[#22c55e] tabular-nums">
                    {newFlagRollout}%
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={newFlagRollout}
                  onChange={(e) => setNewFlagRollout(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#18181b] rounded-lg appearance-none cursor-pointer accent-[#22c55e]"
                />

                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 mt-2.5">
                  {PRESET_ROLLOUTS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setNewFlagRollout(pct)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-colors border cursor-pointer ${
                        newFlagRollout === pct
                          ? "bg-[#fafafa] text-[#09090b] border-[#fafafa]"
                          : "bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa] hover:border-[#3f3f46]"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] text-xs font-mono transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFlagName.trim() || creating}
                  className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creating ? "Creating Flag..." : "Create Feature Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
