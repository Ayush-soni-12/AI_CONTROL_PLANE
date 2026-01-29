"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  User,
  Key,
  Settings,
  Server,
  LayoutDashboard,
  BarChart3,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
// import dynamic from "next/dynamic";
import { useLogout } from "@/hooks/useSignals";
import { DynamicUserProfile } from "@/components/dashboard/DynamicUserProfile";
import { Skeleton } from "@/components/ui/skeleton";

// const DynamicUserProfile = dynamic(
//   () =>
//     import("@/components/dashboard/DynamicUserProfile").then(
//       (mod) => mod.DynamicUserProfile,
//     ),
//   {
//     ssr: false,
//     loading: () => (
//       <div className="px-6 pb-6">
//         <div className="relative group">
//           <div className="absolute inset-0 bg-linear-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-sm"></div>
//           <div className="relative p-4 rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-800">
//             <div className="flex items-center gap-3">
//               <Skeleton className="w-12 h-12 rounded-full" />
//               <div className="flex-1 space-y-2">
//                 <Skeleton className="h-4 w-24" />
//                 <Skeleton className="h-3 w-32" />
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     ),
//   },
// );

/**
 * Dashboard Sidebar Component
// ... existing code ...
 * Beautiful left-side navigation with modern design
 */
export function DashboardSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Server, label: "Services", href: "/dashboard/services" },
    { icon: BarChart3, label: "Analytics", href: "/dashboard/analytics" },
    { icon: Key, label: "API Keys", href: "/dashboard/api-keys" },
    { icon: User, label: "Profile", href: "/dashboard/profile" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-6 left-6 z-50 p-3 rounded-xl bg-gray-900/90 backdrop-blur-xl border border-gray-800 hover:bg-gray-800 transition-all duration-300 shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <Menu className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-72 bg-linear-to-b from-gray-950 via-gray-900 to-gray-950 border-r border-gray-800/50 z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section - Static */}
          <div className="p-6 pb-4">
            <Link href="/dashboard" className="block">
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl blur-md opacity-50"></div>
                  <div className="relative p-2.5 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                    <Server className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    AI Control Plane
                  </h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span className="text-xs text-gray-500 font-medium">
                      Neural Dashboard
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* User Profile Card - Dynamic with Suspense */}
          <Suspense
            fallback={
              <div className="px-6 pb-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-linear-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-sm"></div>
                  <div className="relative p-4 rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-800">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <DynamicUserProfile />
          </Suspense>

          {/* Navigation Menu */}
          <nav className="flex-1 px-4 overflow-y-auto">
            <div className="space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      group relative flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300
                      ${
                        active
                          ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 text-white shadow-lg shadow-purple-500/10"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }
                    `}
                  >
                    {active && (
                      <div className="absolute inset-0 bg-linear-to-r from-purple-600/10 to-pink-600/10 rounded-xl blur-sm"></div>
                    )}
                    <div
                      className={`
                      relative p-2 rounded-lg transition-all duration-300
                      ${
                        active
                          ? "bg-linear-to-br from-purple-500/20 to-pink-500/20"
                          : "bg-gray-800/50 group-hover:bg-gray-800"
                      }
                    `}
                    >
                      <Icon
                        className={`w-4 h-4 ${active ? "text-purple-400" : "text-gray-400 group-hover:text-gray-300"}`}
                      />
                    </div>
                    <span
                      className={`relative font-medium text-sm ${active ? "text-white" : ""}`}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <div className="relative ml-auto">
                        <div className="absolute inset-0 bg-purple-500 rounded-full blur-sm"></div>
                        <div className="relative w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-800/50">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-linear-to-r from-red-900/20 to-red-800/20 border border-red-500/20 hover:border-red-500/40 hover:from-red-900/30 hover:to-red-800/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-r from-red-600/0 via-red-600/5 to-red-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              <div className="relative p-2 rounded-lg bg-red-900/30">
                <LogOut className="w-4 h-4 text-red-400" />
              </div>
              <span className="relative font-medium text-sm text-red-400">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-in fade-in duration-300"
        />
      )}
    </>
  );
}
