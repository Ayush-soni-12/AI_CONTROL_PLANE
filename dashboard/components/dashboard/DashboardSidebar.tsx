"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  User,
  Key,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  Sparkles,
  Brain,
  BookOpen,
  Shield,
  AlertTriangle,
  CreditCard,
  Timer,
  Flag,
  Bot,
  Cpu,
  Radio,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useLogout, useServices } from "@/hooks/useSignals";
import { Skeleton } from "@/components/ui/skeleton";

const DynamicUserProfile = dynamic(
  () =>
    import("@/components/dashboard/DynamicUserProfile").then(
      (mod) => mod.DynamicUserProfile,
    ),
  { ssr: false },
);

/**
 * Dashboard Sidebar Component
 * Modern Obsidian Cyber Navigation with categorized routes and live system telemetry status
 */
export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { status: sseStatus } = useServices();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  const isCloudMode = process.env.NEXT_PUBLIC_IS_CLOUD_MODE === "true";

  const menuSections = [
    {
      title: "Core Monitoring",
      items: [
        { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
        { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
        { icon: Brain, label: "AI Insights", href: "/dashboard/ai-insights" },
        { icon: AlertTriangle, label: "Incidents", href: "/dashboard/incidents" },
      ],
    },
    {
      title: "Governance",
      items: [
        { icon: Flag, label: "Feature Flags", href: "/dashboard/flags" },
        { icon: Shield, label: "Overrides", href: "/dashboard/overrides" },
        { icon: Timer, label: "Adaptive Timeout", href: "/dashboard/adaptive-timeout" },
      ],
    },
    {
      title: "Autonomous Agents",
      items: [
        { icon: Bot, label: "Agentic Payments", href: "/dashboard/agentic-payments" },
        { icon: Cpu, label: "Agent Registry", href: "/dashboard/registry" },
        ...(isCloudMode
          ? [{ icon: CreditCard, label: "Cloud Billing", href: "/dashboard/billing" }]
          : []),
      ],
    },
    {
      title: "Configuration",
      items: [
        { icon: Key, label: "API Keys", href: "/dashboard/api-keys" },
        { icon: BookOpen, label: "Docs", href: "/dashboard/docs" },
        { icon: User, label: "Profile", href: "/dashboard/profile" },
      ],
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="2xl:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 text-slate-300 hover:text-white hover:border-cyan-500/40 shadow-xl"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-68 bg-[#070c18]/95 backdrop-blur-2xl border-r border-blue-500/10 z-40
          transform transition-transform duration-300 ease-in-out flex flex-col justify-between
          2xl:translate-x-0 shadow-2xl shadow-black/60
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Logo Header */}
          <div className="p-5 pb-3 border-b border-slate-800/40">
            <Link href="/dashboard" className="block group">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/30 rounded-xl blur-sm group-hover:blur-md transition-all" />
                  <div className="relative p-2 rounded-xl bg-gradient-to-br from-[#0e1e38] to-[#0a1426] border border-cyan-500/30 group-hover:border-cyan-400/60 transition-colors">
                    <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
                      NeuralControl
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                      AI Control Plane
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links (Grouped with section headings) */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200
                        ${
                          active
                            ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.1)] font-semibold"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`
                            p-1 rounded-lg transition-colors
                            ${
                              active
                                ? "text-cyan-400 bg-cyan-500/15"
                                : "text-slate-400 group-hover:text-slate-300"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{item.label}</span>
                      </div>
                      {active && (
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom System Status & Logout */}
          <div className="p-3 border-t border-slate-800/40 space-y-2.5 bg-[#050914]/80">
            {/* System Status Mini Widget */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-blue-500/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  System Status
                </span>
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md">
                  <span>API</span>
                  <span className="text-emerald-400 font-mono text-[10px]">
                    {sseStatus === "connected" ? "Online" : "Connecting"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md">
                  <span>Redis</span>
                  <span className="text-cyan-400 font-mono text-[10px]">Active</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md">
                  <span>DB</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Synced</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 bg-slate-950/60 px-2 py-1 rounded-md">
                  <span>AI</span>
                  <span className="text-purple-400 font-mono text-[10px]">Ready</span>
                </div>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="2xl:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30 animate-in fade-in duration-200"
        />
      )}
    </>
  );
}
