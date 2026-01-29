"use client";

import { useSuspenseCheckAuth } from "@/hooks/useSignals";
import { User, Mail, Calendar, Shield, BadgeCheck } from "lucide-react";
import { format } from "date-fns";

export function DynamicProfileContent() {
  const { data: user } = useSuspenseCheckAuth();

  if (!user) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden p-8 rounded-3xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 via-transparent to-pink-500/10" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <div className="relative w-32 h-32 rounded-full bg-linear-to-br from-purple-500 to-pink-500 p-1">
              <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center text-5xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <h2 className="text-3xl font-bold text-white">{user.name}</h2>
              <BadgeCheck className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-lg text-gray-400 font-medium flex items-center justify-center md:justify-start gap-2">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 pt-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Pro Plan
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Details */}
        <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Account Details
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-950/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-900 text-gray-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">User ID</p>
                  <p className="text-white font-mono">{user.id}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-950/50 border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-900 text-gray-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">
                    Member Since
                  </p>
                  <p className="text-white">
                    {user.created_at
                      ? format(new Date(user.created_at), "MMMM db, yyyy")
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security / Stats Placeholder */}
        <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm hover:border-pink-500/30 transition-all duration-300">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-pink-400" />
            Security & Status
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-linear-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/10">
              <p className="text-sm text-gray-400 mb-1">Account Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 font-medium">
                  Fully Verified
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              Your account is secured with standard encryption. Enable
              Two-Factor Authentication for enhanced security.
            </p>
            <button className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors border border-gray-700 text-sm">
              Manage Security Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
