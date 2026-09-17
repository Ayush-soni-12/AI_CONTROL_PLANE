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
  Sparkles,
  Server,
  Filter,
} from "lucide-react";

const PRESET_ROLLOUTS = [0, 10, 25, 50, 100];

export default function FeatureFlagsPage() {
  const [serviceName, setServiceName] = useState("demo-service");
  const [draftService, setDraftService] = useState("demo-service");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "auto-disabled">("all");

  // Create Flag Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagService, setNewFlagService] = useState("demo-service");
  const [newFlagRollout, setNewFlagRollout] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { flags, isLoading, error, updateFlag, killFlag, createFlag, refetch } =
    useFlags(serviceName);

  const { services: flagServices, refetch: refetchServices } = useFlagServices();
  const { data: servicesData } = useServices();

  // Dynamically compute real services that exist in the system
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    flagServices.forEach((s) => {
      if (s && s.trim()) set.add(s.trim());
    });
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    if (serviceName && serviceName.trim()) set.add(serviceName.trim());
    if (set.size === 0) set.add("demo-service");
    return Array.from(set);
  }, [flagServices, servicesData, serviceName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlagName.trim()) return;
    setCreating(true);
    setCreateError(null);

    const target = newFlagService.trim() || serviceName;
    const created = await createFlag(
      newFlagName.trim(),
      newFlagRollout,
      target
    );

    if (created) {
      setNewFlagName("");
      setNewFlagRollout(0);
      setShowCreate(false);
      refetchServices();
      if (target && target !== serviceName) {
        setServiceName(target);
        setDraftService(target);
      }
    } else {
      setCreateError("Failed to create feature flag. Ensure the name is unique.");
    }
    setCreating(false);
  };

  const handleSelectService = (srv: string) => {
    setServiceName(srv);
    setDraftService(srv);
  };

  // Deduplicated & Filtered Flags
  const uniqueFlags = useMemo(() => {
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();
    const unique: typeof flags = [];

    for (const f of flags) {
      if (!f) continue;
      const idStr = f.id ? String(f.id) : null;
      const keyStr = `${f.service_name?.trim().toLowerCase() || ""}:${f.name?.trim().toLowerCase() || ""}`;

      if (idStr && seenIds.has(idStr)) continue;
      if (keyStr && seenKeys.has(keyStr)) continue;

      if (idStr) seenIds.add(idStr);
      if (keyStr) seenKeys.add(keyStr);
      unique.push(f);
    }
    return unique;
  }, [flags]);

  const filteredFlags = useMemo(() => {
    return uniqueFlags.filter((f) => {
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
  }, [uniqueFlags, searchQuery, statusFilter]);

  // Summary Metrics
  const totalFlags = uniqueFlags.length;
  const activeCount = uniqueFlags.filter((f) => f.status === "enabled" && f.rollout_percent > 0).length;
  const fullRolloutCount = uniqueFlags.filter((f) => f.rollout_percent === 100).length;
  const autoDisabledCount = uniqueFlags.filter((f) => f.status === "auto-disabled").length;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Command Bar & Search Header */}
          <TopCommandHeader />

          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-blue-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  FEATURE CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Live Canary Rollouts
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Feature Flags & Canary Rollouts</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Progressive traffic distribution, emergency kill switches, and autonomous AI rollback governance
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh flag state"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Sync Flags</span>
              </button>

              <button
                onClick={() => {
                  setNewFlagService(serviceName);
                  setShowCreate(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                New Feature Flag
              </button>
            </div>
          </div>

          {/* Top Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Total Scoped Flags</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  {serviceName}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {totalFlags}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active for service: <span className="text-cyan-300 font-mono">{serviceName}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#091020]/80 border border-emerald-500/20 shadow-[0_4px_20px_rgba(0,230,153,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Active Canaries</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Routing
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {activeCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Routing live traffic ({totalFlags > 0 ? ((activeCount / totalFlags) * 100).toFixed(0) : 0}%)
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#091020]/80 border border-teal-500/20 shadow-[0_4px_20px_rgba(20,184,166,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>100% Full Rollout</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-teal-500/10 text-teal-300 border border-teal-500/30">
                  GA
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-teal-300">
                {fullRolloutCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Production wide features
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border shadow-[0_4px_20px_rgba(244,63,94,0.05)] transition-all ${
                autoDisabledCount > 0
                  ? "bg-rose-950/25 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                  : "bg-[#091020]/80 border-rose-500/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <AlertTriangle className={`w-3.5 h-3.5 ${autoDisabledCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-400"}`} />
                  <span>AI Auto-Disabled</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${autoDisabledCount > 0 ? "bg-rose-500/15 text-rose-300 border border-rose-500/30" : "bg-white/[0.04] text-slate-400 border border-white/[0.08]"}`}>
                  {autoDisabledCount > 0 ? "Anomaly Locked" : "Nominal"}
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-bold font-mono ${autoDisabledCount > 0 ? "text-rose-400" : "text-slate-100"}`}>
                {autoDisabledCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {autoDisabledCount > 0 ? "Automated anomaly rollbacks" : "Zero active anomaly locks"}
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 rounded-2xl bg-[#091020]/60 border border-white/[0.08] backdrop-blur-xl">
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
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        tab.danger
                          ? "bg-rose-500 text-white animate-pulse"
                          : "bg-cyan-500/20 text-cyan-300"
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
                  onChange={(e) => {
                    setServiceName(e.target.value);
                    setDraftService(e.target.value);
                  }}
                  className="w-full sm:w-44 px-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500/50"
                >
                  {availableServices.map((svc) => (
                    <option key={svc} value={svc}>
                      {svc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input with standard cyber glass style */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter flags by name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/50 border border-white/[0.1] text-xs font-mono text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
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
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-cyan-300">
                Synchronizing feature flags for {serviceName}...
              </span>
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="rounded-2xl bg-[#091020]/60 border border-white/[0.08] backdrop-blur-xl p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">
                No feature flags found
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "No flags match the current search query and status filters."
                  : `There are no feature flags registered under "${serviceName}". Create your first flag to start canary rollouts.`}
              </p>
              <button
                onClick={() => {
                  setNewFlagService(serviceName);
                  setShowCreate(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                Create New Flag
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredFlags.map((flag) => (
                <FlagCard
                  key={flag.id ? `flag-id-${flag.id}` : `flag-key-${flag.service_name}-${flag.name}`}
                  flag={flag}
                  onUpdate={updateFlag}
                  onKill={killFlag}
                />
              ))}
            </div>
          )}

          {/* Global Service Audit Trail */}
          {!isLoading && (
            <div className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Service Audit Stream
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chronological trace of all operator changes and autonomous AI rollbacks for {serviceName}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#091020]/70 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <FlagAuditLog serviceName={serviceName} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Flag Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="relative w-full max-w-lg bg-[#091020]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                  <Flag className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-100">
                    Create New Feature Flag
                  </h3>
                  <p className="text-[11px] font-mono text-cyan-400">
                    Target Service: {newFlagService || serviceName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreate(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
                  Flag Name <span className="text-cyan-400">*</span>
                </label>
                <input
                  value={newFlagName}
                  onChange={(e) => setNewFlagName(e.target.value)}
                  placeholder="e.g. smart-caching-v2"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500/60 placeholder:text-slate-600"
                />
                <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                  Lowercase alphanumeric with hyphens
                </span>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5 font-semibold">
                  Target Service
                </label>
                <input
                  value={newFlagService}
                  onChange={(e) => setNewFlagService(e.target.value)}
                  placeholder="service-name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/[0.1] text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500/60 mb-2"
                />
                {availableServices.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500">Existing:</span>
                    {availableServices.map((srv) => (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => setNewFlagService(srv)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all border ${
                          newFlagService === srv
                            ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
                            : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200"
                        }`}
                      >
                        {srv}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-slate-300 font-semibold">
                    Initial Canary Rollout:
                  </label>
                  <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">
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
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                {/* Presets */}
                <div className="flex items-center justify-between gap-1.5 mt-2.5">
                  {PRESET_ROLLOUTS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setNewFlagRollout(pct)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
                        newFlagRollout === pct
                          ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]"
                          : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFlagName.trim() || creating}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all shadow-[0_0_20px_rgba(0,240,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
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

