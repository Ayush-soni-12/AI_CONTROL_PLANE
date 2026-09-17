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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex">
      <DashboardSidebar />

      <div className="flex-1 min-w-0 2xl:ml-64 flex flex-col">
        <TopCommandHeader />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                <Flag className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                    Feature Flags & Canary Rollouts
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    LIVE CANARY
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Progressive traffic distribution, emergency kill switches, and autonomous AI rollback governance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={refetch}
                className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh flag state"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>

              <button
                onClick={() => {
                  setNewFlagService(serviceName);
                  setShowCreate(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                New Feature Flag
              </button>
            </div>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider">Total Scoped Flags</span>
                <Sliders className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-100">
                {totalFlags}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                for service: <span className="text-cyan-300">{serviceName}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider">Active Canaries</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400">
                {activeCount}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                Routing traffic ({totalFlags > 0 ? ((activeCount / totalFlags) * 100).toFixed(0) : 0}%)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider">100% Full Rollout</span>
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-teal-300">
                {fullRolloutCount}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                Production wide features
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${
                autoDisabledCount > 0
                  ? "bg-rose-950/25 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                  : "bg-[#091020]/80 border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider">AI Auto-Disabled</span>
                <AlertTriangle className={`w-4 h-4 ${autoDisabledCount > 0 ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
              </div>
              <div className={`text-2xl sm:text-3xl font-mono font-bold ${autoDisabledCount > 0 ? "text-rose-400" : "text-slate-100"}`}>
                {autoDisabledCount}
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1">
                {autoDisabledCount > 0 ? "Automated anomaly rollbacks" : "Zero active anomaly locks"}
              </div>
            </div>
          </div>

          {/* Service Selector & Filters Bar */}
          <div className="p-4 rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl space-y-4">
            {/* Top row: Service Selection */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  Target Service:
                </span>

                {availableServices.map((srv) => (
                  <button
                    key={srv}
                    onClick={() => handleSelectService(srv)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all border ${
                      serviceName === srv
                        ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.2)] font-bold"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:border-white/[0.12]"
                    }`}
                  >
                    {srv}
                  </button>
                ))}
              </div>

              {/* Custom Service Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draftService.trim()) {
                    setServiceName(draftService.trim());
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={draftService}
                  onChange={(e) => setDraftService(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 w-44"
                  placeholder="custom-service-name"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-mono font-semibold rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition-all"
                >
                  Load
                </button>
              </form>
            </div>

            <div className="h-px w-full bg-white/[0.06]" />

            {/* Bottom row: Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter flags by name..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-500"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                <span className="text-[11px] font-mono text-slate-500 mr-1 hidden sm:inline flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Filter:
                </span>
                {(
                  [
                    { id: "all", label: "All Flags" },
                    { id: "active", label: "Active (>0%)" },
                    { id: "disabled", label: "Disabled (0%)" },
                    { id: "auto-disabled", label: "AI Auto-Disabled" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono transition-all border shrink-0 ${
                      statusFilter === tab.id
                        ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)] font-bold"
                        : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-slate-200 hover:border-white/[0.12]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
              <h3 className="text-base font-bold font-mono text-slate-200 mb-1">
                No feature flags found
              </h3>
              <p className="text-xs font-mono text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                {searchQuery || statusFilter !== "all"
                  ? "No flags match the current search query and status filters."
                  : `There are no feature flags registered under "${serviceName}". Create your first flag to start canary rollouts.`}
              </p>
              <button
                onClick={() => {
                  setNewFlagService(serviceName);
                  setShowCreate(true);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.25)] inline-flex items-center gap-2"
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
                  <h2 className="text-base font-bold font-mono text-slate-100">
                    Service Audit Stream
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    Chronological trace of all operator changes and autonomous AI rollbacks for {serviceName}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#091020]/70 border border-white/[0.08] backdrop-blur-xl p-5 sm:p-6 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <FlagAuditLog serviceName={serviceName} />
              </div>
            </div>
          )}
        </main>
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
    </div>
  );
}

