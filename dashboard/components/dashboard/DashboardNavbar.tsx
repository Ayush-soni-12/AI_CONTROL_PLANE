"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User,
  Key,
  Settings,
  ChevronDown,
  Server,
  Menu,
  X,
} from "lucide-react";
import { useCheckAuth, useLogout } from "@/hooks/useSignals";

/**
 * Dashboard Navbar Component
 * Features: User profile, logout, API key generation, settings
 */
export function DashboardNavbar() {
  const router = useRouter();
  const { data: user } = useCheckAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  const handleGenerateApiKey = () => {
    // Navigate to API key generation page
    router.push("/dashboard/api-keys");
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <Server className="w-5 h-5 text-purple-400" />
            </div>
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                AI Control Plane
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Navigation Links */}
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/services"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Services
            </Link>
            <Link
              href="/dashboard/analytics"
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Analytics
            </Link>

            {/* API Key Button */}
            <button
              onClick={handleGenerateApiKey}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 transition-all duration-300"
            >
              <Key className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">
                API Keys
              </span>
            </button>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-300"
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-sm font-medium text-white">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email || ""}</p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
                  {/* User Info */}
                  <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                    <p className="text-sm font-semibold text-white">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        router.push("/dashboard/profile");
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        handleGenerateApiKey();
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <Key className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">API Keys</span>
                    </button>

                    <button
                      onClick={() => {
                        router.push("/dashboard/settings");
                        setIsProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Settings</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-800 p-2">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/20 transition-colors rounded-lg disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-red-400 font-medium">
                        {isLoggingOut ? "Logging out..." : "Logout"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-300" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/services"
                className="px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link
                href="/dashboard/analytics"
                className="px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Analytics
              </Link>

              <div className="border-t border-gray-800 my-2"></div>

              <button
                onClick={() => {
                  router.push("/dashboard/profile");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  handleGenerateApiKey();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <Key className="w-4 h-4" />
                <span>API Keys</span>
              </button>

              <button
                onClick={() => {
                  router.push("/dashboard/settings");
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>

              <div className="border-t border-gray-800 my-2"></div>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
