/* eslint-disable react-hooks/purity */
"use client";

import { useState, useMemo } from "react";
import {
  Shield,
  Plus,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
  LogIn,
  RefreshCw,
  Search,
  Sliders,
  X,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { CreateOverrideForm } from "@/components/dashboard/overrides/CreateOverrideForm";
import { OverrideCard } from "@/components/dashboard/overrides/OverrideCard";
import { useOverrides, useCancelOverride, useCreateOverride } from "@/hooks/useOverrides";
import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { useFlagServices } from "@/hooks/useFlags";
import type { Override } from "@/lib/types";

export default function OverridesPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: apiOverrides, isLoading, error, refetch } = useOverrides();
  const { mutate: apiCancel } = useCancelOverride();
  const { data: servicesData } = useServices();
  const { services: flagServices } = useFlagServices();

  const [showCreate, setShowCreate] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const currentOverrides = useMemo(() => apiOverrides ?? [], [apiOverrides]);

  // Deduce all available services
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    currentOverrides.forEach((o) => {
      if (o.service_name && o.service_name.trim()) set.add(o.service_name.trim());
    });
    flagServices?.forEach((s) => {
      if (s && s.trim()) set.add(s.trim());
    });
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    return Array.from(set);
  }, [currentOverrides, flagServices, servicesData]);

  // Compute active vs expired overrides
  const active = useMemo(() => currentOverrides.filter((o) => o.is_active), [currentOverrides]);
  const expired = useMemo(() => currentOverrides.filter((o) => !o.is_active), [currentOverrides]);

  // Telemetry KPIs
  const totalActive = active.length;
  const customRateLimitCount = useMemo(
    () =>
      active.filter(
        (o) => o.rate_limit_customer_rpm !== null || o.load_shedding_rpm !== null
      ).length,
    [active]
  );

  const meanTTLMinutes = useMemo(() => {
    if (active.length === 0) return 0;
    const totalRemaining = active.reduce((acc, curr) => {
      const expires = new Date(curr.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.round((expires - now) / 60000));
      return acc + remaining;
    }, 0);
    return Math.round(totalRemaining / active.length);
  }, [active]);

  // Live Revoke Handler
  const handleRevoke = (id: number) => {
    apiCancel(id);
  };

  // Filtered Overrides
  const filteredActive = useMemo(() => {
    return active.filter((o) => {
      const matchesService =
        selectedService === "all" ||
        o.service_name.toLowerCase() === selectedService.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === "" ||
        o.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || statusFilter === "active";
      return matchesService && matchesSearch && matchesStatus;
    });
  }, [active, selectedService, searchQuery, statusFilter]);

  const filteredExpired = useMemo(() => {
    return expired.filter((o) => {
      const matchesService =
        selectedService === "all" ||
        o.service_name.toLowerCase() === selectedService.toLowerCase();
      const matchesSearch =
        searchQuery.trim() === "" ||
        o.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || statusFilter === "expired";
      return matchesService && matchesSearch && matchesStatus;
    });
  }, [expired, selectedService, searchQuery, statusFilter]);

  // Show loading state while authenticating
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a13] text-slate-100">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-[#18181b] mb-4 border border-[#27272a]">
            <LogIn className="w-10 h-10 text-[#fafafa] animate-pulse" />
          </div>
          <p className="text-slate-400 font-mono text-sm">Verifying operator credentials...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, let auth router handle redirect
  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-68 min-h-screen p-4 sm:p-8 bg-[#070a13] cyber-grid text-slate-100 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          <TopCommandHeader />

          {/* Hero Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#27272a]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-white/10 text-white border border-white/15">
                  THRESHOLD CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Manual Guardrails and Overrides
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#fafafa]">
                Active Threshold Overrides &amp; Rate Limits
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                High precision live controls over traffic guardrails, rate limit multipliers, and emergency threshold adjustments
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-lg bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] hover:border-[#3f3f46] text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer"
                title="Refresh override telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#fafafa]" : ""}`} />
                <span>Sync State</span>
              </button>

              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] font-medium text-xs font-mono transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-2" />
                <span>New Override</span>
              </button>
            </div>
          </div>

          {/* Top Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Active Overrides */}
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Sliders className="w-4 h-4 text-[#fafafa]" />
                  <span>Active Overrides</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-[#22c55e] border border-[#27272a]">
                  Enforcing
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#fafafa] tabular-nums">
                {totalActive}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-mono">
                Endpoints under manual guardrails
              </div>
            </div>

            {/* Card 2: Mean TTL Remaining */}
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Clock className="w-4 h-4 text-[#22c55e]" />
                  <span>Mean TTL Remaining</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-slate-400 border border-[#27272a]">
                  Countdown
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#22c55e] tabular-nums">
                {meanTTLMinutes > 60
                  ? `${(meanTTLMinutes / 60).toFixed(1)}h`
                  : `${meanTTLMinutes}m`}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-mono">
                Average window before AI resumption
              </div>
            </div>

            {/* Card 3: Custom Rate Limits */}
            <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a] hover:border-[#3f3f46] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Zap className="w-4 h-4 text-[#fafafa]" />
                  <span>Custom Rate Limits</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-slate-400 border border-[#27272a]">
                  Multipliers
                </span>
              </div>
              <div className="text-3xl font-semibold font-mono text-[#fafafa] tabular-nums">
                {customRateLimitCount}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 font-mono">
                Active tenant quota and surge rules
              </div>
            </div>

            {/* Card 4: AI Baseline State */}
            <div
              className={`p-5 rounded-xl border transition-colors ${
                totalActive === 0
                  ? "bg-[#0d1527] border-[#27272a] hover:border-[#3f3f46]"
                  : "bg-[#0d1527] border-[#3f3f46]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  <Activity className={`w-4 h-4 ${totalActive === 0 ? "text-[#22c55e]" : "text-[#fafafa]"}`} />
                  <span>AI Baseline State</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                    totalActive === 0
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-[#18181b] text-[#fafafa] border border-[#27272a]"
                  }`}
                >
                  {totalActive === 0 ? "Autonomous" : "Hybrid Guardrail"}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-semibold font-mono text-[#fafafa] truncate">
                {totalActive === 0 ? "100% AI Governed" : `${totalActive} Overrides Set`}
              </div>
              <div className="text-xs text-slate-400 mt-1.5 truncate">
                {totalActive === 0
                  ? "Full autonomous neural adaptation"
                  : "Unset thresholds run AI baseline"}
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 rounded-xl bg-[#091020] border border-cyan-500/20">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Overrides", count: (currentOverrides?.length || 0) },
                { id: "active", label: "Active Live", count: active.length },
                { id: "expired", label: "Expired or Revoked", count: expired.length },
              ].map((tab) => {
                const activeTab = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                      activeTab
                        ? "bg-[#18181b] text-[#fafafa] border border-[#3f3f46]"
                        : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] border border-transparent"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        activeTab
                          ? "bg-[#27272a] text-[#fafafa]"
                          : "bg-[#18181b] text-[#71717a]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Service Dropdown & Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Service Select */}
              <div className="w-full sm:w-auto flex items-center gap-1.5">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full sm:w-48 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-mono text-[#fafafa] focus:outline-none focus:border-[#3f3f46] cursor-pointer"
                >
                  <option value="all">All Services ({currentOverrides.length})</option>
                  {availableServices.map((srv) => {
                    const count = currentOverrides.filter((o) => o.service_name.toLowerCase() === srv.toLowerCase()).length;
                    return (
                      <option key={srv} value={srv}>
                        {srv} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Endpoint Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoint or reason..."
                  className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-xs font-mono text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:border-[#3f3f46]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#fafafa] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Autonomous AI Threshold Controller Info Card */}
          <div className="p-5 rounded-xl bg-[#0d1527] border border-[#27272a]">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#fafafa] shrink-0">
                <Zap className="w-4 h-4 text-[#22c55e]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold font-mono text-[#fafafa] mb-1">
                  Autonomous AI Threshold Controller &amp; Manual Guardrails
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                  The NeuralControl AI engine continuously calculates and enforces operational limits across all microservices. When you set an override, the system locks only your specific parameter values while continuing autonomous decisions on all unset thresholds. Overrides automatically expire and seamlessly restore full AI governance upon TTL completion.
                </p>
              </div>
            </div>
          </div>

          {/* Active Overrides Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#22c55e]" />
                <h3 className="text-xs font-mono font-medium tracking-wider uppercase text-slate-400">
                  Active Manual Guardrails
                </h3>
                {filteredActive.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#0d1527] text-[#22c55e] text-[10px] font-mono font-bold border border-[#27272a]">
                    {filteredActive.length}
                  </span>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-[#0d1527] border border-[#27272a] h-48 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <p>
                  Failed to fetch active threshold overrides. Verify control plane service connectivity.
                </p>
              </div>
            ) : filteredActive.length === 0 ? (
              <div className="p-10 rounded-xl bg-[#0d1527] border border-[#27272a] text-center space-y-3">
              <div className="inline-flex p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 mb-4 text-cyan-400">
                <Shield className="w-7 h-7" />
              </div>
                <h4 className="text-xl font-semibold text-white tracking-tight">
                  No Active Manual Overrides
                </h4>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
                  {searchQuery || selectedService !== "all"
                    ? "No active overrides match your filter criteria."
                    : "The autonomous AI engine is governing 100% of decisions using dynamic operational baselines."}
                </p>
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-4 py-2 rounded-lg bg-[#fafafa] hover:bg-[#e4e4e7] text-[#09090b] text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-2" />
                  <span>Create Temporary Override</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {filteredActive.map((override) => (
                  <OverrideCard
                    key={override.id}
                    override={override}
                    onRevoke={handleRevoke}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Expired / Revoked Overrides Collapsible Accordion */}
          {filteredExpired.length > 0 && (
            <div className="pt-4 border-t border-[#27272a] space-y-3.5">
              <button
                onClick={() => setShowExpired((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#111113] hover:bg-[#18181b] border border-[#27272a] transition-colors text-xs font-mono text-slate-300 hover:text-[#fafafa] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#71717a]" />
                  <span className="font-semibold text-[#fafafa]">
                    Expired or Revoked Overrides History
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] text-slate-400 border border-[#27272a]">
                    {filteredExpired.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-400">
                  <span>{showExpired ? "Collapse" : "Expand"}</span>
                  {showExpired ? (
                    <ChevronUp className="w-4 h-4 text-[#fafafa]" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {showExpired && (
                <div className="grid gap-3.5 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                  {filteredExpired.map((override) => (
                    <OverrideCard
                      key={override.id}
                      override={override}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Override Modal */}
      {showCreate && (
        <CreateOverrideForm
          onClose={() => setShowCreate(false)}
          defaultService={selectedService !== "all" ? selectedService : (availableServices[0] || "")}
        />
      )}
    </>
  );
}
