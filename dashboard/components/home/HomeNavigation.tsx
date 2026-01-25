"use client";

import Link from "next/link";
import { ArrowRight, Cpu, LogIn, UserPlus, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCheckAuth, useLogout } from "@/hooks/useSignals";

/**
 * Client component for navigation with auth buttons
 * Shows Login/Signup when not authenticated, Logout when authenticated
 * Uses TanStack Query for automatic loading states
 */
export function HomeNavigation() {
  const router = useRouter();
  const { data: user, isLoading } = useCheckAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  return (
    <nav className="px-8 py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20">
            <Cpu className="w-6 h-6 text-purple-400" />
          </div>
          <span className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            NeuralControl
          </span>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          {isLoading ? (
            // Skeleton Loading State
            <>
              <div className="h-10 w-20 bg-gray-800/50 rounded-lg animate-pulse" />
              <div className="h-10 w-24 bg-gray-800/50 rounded-lg animate-pulse" />
              <div className="h-10 w-28 bg-gray-800/50 rounded-lg animate-pulse" />
            </>
          ) : user ? (
            // Authenticated: Show Logout + Dashboard
            <>
              <span className="text-sm text-gray-400 hidden sm:block">
                Welcome, <span className="text-purple-400">{user.name}</span>
              </span>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="group px-5 py-2.5 rounded-lg border border-gray-700 hover:border-red-500/50 hover:bg-red-900/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-gray-300 hover:text-red-400 font-medium transition-colors">
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </span>
              </button>

              <Link
                href="/dashboard"
                className="group relative px-5 py-2.5 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <span className="flex items-center gap-2 text-white font-medium">
                  Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-lg bg-linear-to-r from-purple-400 to-pink-400 blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
              </Link>
            </>
          ) : (
            // Not Authenticated: Show Login + Signup + Dashboard
            <>
              <Link
                href="/auth/login"
                className="group px-5 py-2.5 rounded-lg border border-gray-700 hover:border-purple-500/50 hover:bg-gray-900/50 transition-all duration-300"
              >
                <span className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors">
                  <LogIn className="w-4 h-4" />
                  Login
                </span>
              </Link>

              <Link
                href="/auth/signup"
                className="group relative px-5 py-2.5 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 active:scale-95"
              >
                <span className="flex items-center gap-2 text-white font-medium">
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </span>
                <div className="absolute inset-0 rounded-lg bg-linear-to-r from-purple-400 to-pink-400 blur-lg opacity-0 group-hover:opacity-30 transition-opacity" />
              </Link>

              <Link
                href="/dashboard"
                className="group relative px-5 py-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 transition-all duration-300"
              >
                <span className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors">
                  Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
