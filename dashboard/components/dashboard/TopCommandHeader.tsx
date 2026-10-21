/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Layers,
  Shield,
  Activity,
  LogOut,
  User,
  Key,
  Bot,
  Timer,
  BookOpen,
  ArrowRight,
  Command,
} from "lucide-react";
import { useCheckAuth, useLogout, useServices } from "@/hooks/useSignals";

interface TopCommandHeaderProps {
  title?: string;
  subtitle?: string;
}

export function TopCommandHeader({ title, subtitle }: TopCommandHeaderProps) {
  const router = useRouter();
  const { data: user } = useCheckAuth();
  const { mutate: logout } = useLogout();
  const { status: sseStatus, data: servicesData } = useServices();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const paletteRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsPaletteOpen(false);
        setIsProfileMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigationCommands = [
    { label: "Dashboard Overview", category: "Core", href: "/dashboard", icon: Layers },
    { label: "Real-time Analytics", category: "Core", href: "/dashboard/analytics", icon: Activity },
    { label: "AI Insights & Decisions", category: "Core", href: "/dashboard/ai-insights", icon: Sparkles },
    { label: "Incidents & Circuit Breakers", category: "Core", href: "/dashboard/incidents", icon: AlertTriangle },
    { label: "Feature Flags", category: "Governance", href: "/dashboard/flags", icon: Shield },
    { label: "Manual Overrides", category: "Governance", href: "/dashboard/overrides", icon: Shield },
    { label: "Adaptive Timeout Engine", category: "System", href: "/dashboard/adaptive-timeout", icon: Timer },
    { label: "API Keys & SDK Setup", category: "System", href: "/dashboard/api-keys", icon: Key },
    { label: "Documentation", category: "System", href: "/dashboard/docs", icon: BookOpen },
    { label: "User Profile", category: "System", href: "/dashboard/profile", icon: User },
  ];

  // Also include services from live data in search
  const serviceCommands =
    servicesData?.services?.map((svc) => ({
      label: `Service: ${svc.name}`,
      category: "Services",
      href: `/services/${encodeURIComponent(svc.name)}`,
      icon: Activity,
    })) || [];

  const allCommands = [...navigationCommands, ...serviceCommands];

  const filteredCommands = searchQuery.trim()
    ? allCommands.filter((cmd) =>
        cmd.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allCommands;

  const handleSelectCommand = (href: string) => {
    setIsPaletteOpen(false);
    setSearchQuery("");
    router.push(href);
  };

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "NC";

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 w-full mb-6 pt-2 pb-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/80">
          {/* Left: Search Bar Button */}
          <div className="flex-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="flex-1 max-w-lg flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-950 border border-white/10 text-neutral-400 hover:text-white hover:border-white/25 hover:bg-[#121212] transition-all duration-200 group text-left cursor-pointer shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <Search className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                <span className="text-xs sm:text-sm text-neutral-400 group-hover:text-neutral-200 truncate">
                  Search services, agents, metrics, flags...
                </span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-900 border border-white/10 text-[11px] font-mono text-neutral-400 group-hover:text-white transition-colors">
                <Command className="w-3 h-3" /> K
              </kbd>
            </button>
          </div>

          {/* Right: Status Pill, Notifications & User Avatar */}
          <div className="flex items-center justify-end gap-3">
            {/* Live System Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950 border border-white/10 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                {sseStatus === "connected" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    sseStatus === "connected"
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                      : sseStatus === "connecting"
                      ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                      : "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  }`}
                />
              </span>
              <span className="text-xs font-medium tracking-tight text-neutral-200">
                {sseStatus === "connected"
                  ? "All Systems Online"
                  : sseStatus === "connecting"
                  ? "Connecting..."
                  : "Offline"}
              </span>
            </div>

            {/* Notifications Button */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="relative p-2 rounded-xl bg-purple-950 border border-white/10 hover:border-white/25 text-neutral-400 hover:text-white hover:bg-[#121212] transition-all cursor-pointer shadow-sm"
                title="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-black" />
              </button>

              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-purple-950 border border-white/15 shadow-2xl shadow-black backdrop-blur-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Live Telemetry Alerts
                    </span>
                    <span className="text-[11px] text-white font-mono font-medium">Live</span>
                  </div>
                  <div className="mt-3 space-y-2.5 max-h-64 overflow-y-auto">
                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-emerald-500/25 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-white">Control Plane Operational</p>
                        <p className="text-[11px] text-neutral-400">SSE real-time stream active</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/15 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-white">AI Adaptive Engine</p>
                        <p className="text-[11px] text-neutral-400">Anomaly pre-filtering active</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-purple-950 border border-white/10 hover:border-white/25 hover:bg-[#121212] transition-all cursor-pointer group shadow-sm"
              >
                <div className="w-7 h-7 rounded-lg bg-white text-black font-bold text-xs flex items-center justify-center shadow-sm">
                  {userInitials}
                </div>
                <span className="hidden sm:inline text-xs font-medium text-neutral-200 group-hover:text-white transition-colors">
                  {user?.name || "Neural Operator"}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-purple-950 border border-white/15 shadow-2xl shadow-black backdrop-blur-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {user?.name || "Operator"}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {user?.email || "operator@neuralcontrol.io"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      router.push("/dashboard/profile");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    Account Settings
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      router.push("/dashboard/api-keys");
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-left"
                  >
                    <Key className="w-3.5 h-3.5 text-neutral-400" />
                    API Credentials
                  </button>
                  <div className="my-1 border-t border-white/10" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Command Palette Modal */}
      {isPaletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setIsPaletteOpen(false)}
        >
          <div
            ref={paletteRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-purple-950 border border-white/15 shadow-2xl shadow-black overflow-hidden"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-black/60">
              <Search className="w-5 h-5 text-white" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type a command or search services..."
                className="flex-1 bg-transparent border-none text-white placeholder:text-neutral-500 focus:outline-none text-sm"
              />
              <span className="text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded bg-neutral-900 border border-white/10">
                ESC to close
              </span>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-500">
                  No matching commands or services found.
                </div>
              ) : (
                filteredCommands.map((cmd) => {
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.label + cmd.href}
                      type="button"
                      onClick={() => handleSelectCommand(cmd.href)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/10 border border-transparent transition-all group cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-white/15 text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-white transition-colors">
                            {cmd.label}
                          </p>
                          <p className="text-[11px] text-neutral-500">{cmd.category}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
