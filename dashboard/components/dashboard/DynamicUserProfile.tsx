"use client";

import { useSuspenseCheckAuth } from "@/hooks/useSignals";

/**
 * Dynamic User Profile Component - Wrapped in Suspense
 * Fetches and displays user name and email
 */
export function DynamicUserProfile() {
  const { data: user } = useSuspenseCheckAuth();

  if (!user) return null;

  return (
    <div className="px-6 pb-6">
      <div className="relative group">
        <div className="absolute inset-0 bg-linear-to-r from-purple-600/20 to-pink-600/20 rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
        <div className="relative p-4 rounded-2xl bg-gray-900/80 backdrop-blur-sm border border-gray-800 group-hover:border-purple-500/30 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-full blur-sm"></div>
              <div className="relative w-12 h-12 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-gray-900">
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
