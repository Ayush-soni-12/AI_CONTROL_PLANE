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
  Filter,
  Sparkles,
  Sliders,
  CheckCircle2,
  Server,
  Layers,
  X,
} from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { CreateOverrideForm } from "@/components/dashboard/overrides/CreateOverrideForm";
import { OverrideCard } from "@/components/dashboard/overrides/OverrideCard";
import { useOverrides } from "@/hooks/useOverrides";
import { useCheckAuth, useServices } from "@/hooks/useSignals";
import { useFlagServices } from "@/hooks/useFlags";

export default function OverridesPage() {
  const { data: user, isLoading: isAuthLoading } = useCheckAuth();
  const { data: overrides, isLoading, error, refetch } = useOverrides();
  const { data: servicesData } = useServices();
  const { services: flagServices } = useFlagServices();

  const [showCreate, setShowCreate] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [selectedService, setSelectedService] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Deduce all available services
  const availableServices = useMemo(() => {
    const set = new Set<string>();
    overrides?.forEach((o) => {
      if (o.service_name && o.service_name.trim()) set.add(o.service_name.trim());
    });
    flagServices?.forEach((s) => {
      if (s && s.trim()) set.add(s.trim());
    });
    servicesData?.services?.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    return Array.from(set);
  }, [overrides, flagServices, servicesData]);

  // Compute live active vs expired overrides
  const active = useMemo(() => overrides?.filter((o) => o.is_active) ?? [], [overrides]);
  const expired = useMemo(() => overrides?.filter((o) => !o.is_active) ?? [], [overrides]);

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
          <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 mb-4 border border-cyan-500/20">
            <LogIn className="w-10 h-10 text-cyan-400 animate-pulse" />
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/15">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  THRESHOLD CONTROLLER
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Manual Guardrails and Overrides
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Active Threshold Overrides & Rate Limits</span>
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                High precision live controls over traffic guardrails, rate limit multipliers, and emergency threshold adjustments
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="px-3.5 py-2 rounded-xl bg-[#091020]/80 hover:bg-[#091020] text-slate-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-semibold transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,0,0,0.2)]"
                title="Refresh override telemetry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
                <span>Sync State</span>
              </button>

              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4 text-black stroke-[3]" />
                New Override
              </button>
            </div>
          </div>

          {/* Top Telemetry KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Active Overrides */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-cyan-500/20 shadow-[0_4px_20px_rgba(0,240,255,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Active Overrides</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Enforcing
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">
                {totalActive}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Endpoints under manual guardrails
              </div>
            </div>

            {/* Card 2: Mean TTL Remaining */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-emerald-500/20 shadow-[0_4px_20px_rgba(0,230,153,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mean TTL Remaining</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Countdown
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {meanTTLMinutes > 60
                  ? `${(meanTTLMinutes / 60).toFixed(1)}h`
                  : `${meanTTLMinutes}m`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Average window before AI resumption
              </div>
            </div>

            {/* Card 3: Custom Rate Limits */}
            <div className="p-4 rounded-xl bg-[#091020]/80 border border-purple-500/20 shadow-[0_4px_20px_rgba(168,85,247,0.05)]">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Custom Rate Limits</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Multipliers
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-purple-300">
                {customRateLimitCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Active tenant quota and surge rules
              </div>
            </div>

            {/* Card 4: AI Autonomous Baseline Status */}
            <div
              className={`p-4 rounded-xl border shadow-[0_4px_20px_rgba(0,240,255,0.05)] transition-all ${
                totalActive === 0
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : "bg-[#091020]/80 border-cyan-500/20"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                  <Activity className={`w-3.5 h-3.5 ${totalActive === 0 ? "text-emerald-400" : "text-cyan-400"}`} />
                  <span>AI Baseline State</span>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    totalActive === 0
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  {totalActive === 0 ? "Autonomous" : "Hybrid Guardrail"}
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white truncate">
                {totalActive === 0 ? "100% AI Governed" : `${totalActive} Overrides Set`}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">
                {totalActive === 0
                  ? "Full autonomous neural adaptation"
                  : "Unset thresholds run AI baseline"}
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#091020]/60 border border-white/[0.08] backdrop-blur-xl">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All Overrides", count: (overrides?.length || 0) },
                { id: "active", label: "Active Live", count: active.length },
                { id: "expired", label: "Expired or Revoked", count: expired.length },
              ].map((tab) => {
                const activeTab = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 border ${
                      activeTab
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                        : "text-slate-400 border-transparent hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        activeTab
                          ? "bg-cyan-500/30 text-white font-bold"
                          : "bg-white/[0.06] text-slate-400"
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
              <div className="relative w-full sm:w-44">
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full bg-[#091020] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="all">All Services</option>
                  {availableServices.map((srv) => (
                    <option key={srv} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              {/* Endpoint Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search endpoint or reason..."
                  className="w-full bg-[#091020] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:shadow-[0_0_10px_rgba(0,240,255,0.15)] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* How It Works Cyber Info Banner */}
          {active.length === 0 && !isLoading && (
            <div className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 backdrop-blur-xl">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-mono text-cyan-300 mb-1">
                    Autonomous AI Threshold Controller & Manual Guardrails
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    The NeuralControl AI engine continuously calculates and enforces operational limits across all microservices. When you set an override, the system locks only your specific parameter values while continuing autonomous decisions on all unset thresholds. Overrides automatically expire and seamlessly restore full AI governance upon TTL completion.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Overrides Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider">
                  Active Manual Guardrails
                </h3>
                {filteredActive.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
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
                    className="rounded-2xl bg-[#091020]/60 border border-white/[0.08] h-48 animate-pulse"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <p className="text-xs font-mono">
                  Failed to fetch active threshold overrides. Verify control plane service connectivity.
                </p>
              </div>
            ) : filteredActive.length === 0 ? (
              <div className="p-10 rounded-2xl bg-[#091020]/40 border border-white/[0.06] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold font-mono text-slate-300">
                  No Active Manual Overrides
                </h4>
                <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
                  {searchQuery || selectedService !== "all"
                    ? "No active overrides match your filter criteria."
                    : "The autonomous AI engine is governing 100% of decisions using dynamic operational baselines."}
                </p>
                {!searchQuery && selectedService === "all" && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all inline-flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Temporary Override</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {filteredActive.map((override) => (
                  <OverrideCard key={override.id} override={override} />
                ))}
              </div>
            )}
          </div>

          {/* Expired / Revoked Overrides Collapsible Accordion */}
          {filteredExpired.length > 0 && (
            <div className="pt-4 border-t border-white/[0.08] space-y-3.5">
              <button
                onClick={() => setShowExpired((prev) => !prev)}
                className="w-full flex items-center justify-between p-3.5 rounded-xl bg-[#091020]/60 hover:bg-[#091020] border border-white/[0.08] transition-all text-xs font-mono text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold">
                    Expired or Revoked Overrides History
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                    {filteredExpired.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500">
                  <span>{showExpired ? "Collapse" : "Expand"}</span>
                  {showExpired ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {showExpired && (
                <div className="grid gap-3.5 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                  {filteredExpired.map((override) => (
                    <OverrideCard key={override.id} override={override} />
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
          defaultService={selectedService !== "all" ? selectedService : "demo-service"}
        />
      )}
    </>
  );
}
