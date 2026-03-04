"use client";

import { useSuspenseCheckAuth } from "@/hooks/useSignals";
import {
  User as UserIcon,
  Mail,
  Shield,
  BadgeCheck,
  Key,
  LogOut,
  Loader2,
  Save,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { APIKeysManager } from "./profile/APIKeysManager";
import { updateProfile, updatePassword } from "@/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";

export function DynamicProfileContent() {
  const { data: user } = useSuspenseCheckAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"general" | "keys">("general");

  // State for form updates
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [isSaving, setIsSaving] = useState(false);

  // State for password change mock
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  if (!user) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedUser = await updateProfile({ name });
      queryClient.setQueryData(["auth", "user", "suspense"], updatedUser);
      queryClient.setQueryData(["auth", "user"], updatedUser);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err: Error | unknown) {
      alert((err as Error).message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPassword(true);
    try {
      await updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      alert("Password updated securely.");
    } catch (err: Error | unknown) {
      alert((err as Error).message || "Failed to update password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Profile Header Card */}
      <div className="relative overflow-hidden p-8 rounded-3xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 via-transparent to-pink-500/10" />
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <div className="relative w-32 h-32 rounded-full bg-linear-to-br from-purple-500 to-pink-500 p-1 shadow-2xl">
              <div className="w-full h-full rounded-full bg-gray-950 flex items-center justify-center text-5xl font-bold text-white tracking-widest">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="text-center md:text-left space-y-3 sm:space-y-2 flex-1 relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-2 sm:gap-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white break-all tracking-tight drop-shadow-xl">
                {name || user.name}
              </h2>
              <BadgeCheck className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500 shrink-0 drop-shadow-lg" />
            </div>
            <p className="text-base sm:text-lg text-gray-400 font-medium flex items-center justify-center md:justify-start gap-2 break-all">
              <Mail className="w-4 h-4 shrink-0" />
              {user.email}
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-3">
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm shadow-purple-500/10">
                Pro Plan
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 shadow-sm shadow-green-500/10">
                Active Member
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-800 pb-px font-medium">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 px-2 border-b-2 text-sm transition-all ${
            activeTab === "general"
              ? "border-purple-500 text-purple-400 shadow-[0_1px_10px_rgba(168,85,247,0.2)]"
              : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700"
          }`}
        >
          General Setting
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`pb-3 px-2 border-b-2 text-sm transition-all ${
            activeTab === "keys"
              ? "border-purple-500 text-purple-400 shadow-[0_1px_10px_rgba(168,85,247,0.2)]"
              : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700"
          }`}
        >
          API Keys
        </button>
      </div>

      {/* Content */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Account Details Form */}
          <div className="p-6 md:p-8 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-xl relative group">
            <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />

            <div className="flex justify-between items-center mb-6 relative">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-purple-400" />
                Personal Info
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5 relative">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-950/50 border border-purple-500/30 text-white rounded-lg px-4 py-2.5 outline-none focus:border-purple-500 transition-colors"
                    />
                  ) : (
                    <div className="w-full bg-gray-950/30 border border-gray-800/80 text-gray-200 rounded-lg px-4 py-2.5">
                      {name || user.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Email Address (Read-only)
                  </label>
                  <div className="w-full bg-gray-950/30 border border-gray-800/50 text-gray-500 rounded-lg px-4 py-2.5 cursor-not-allowed">
                    {user.email}
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                      User ID
                    </label>
                    <div className="w-full bg-gray-950/30 border border-gray-800/50 text-gray-400 rounded-lg px-4 py-2.5 font-mono text-sm">
                      {user.id}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5 block">
                      Joined
                    </label>
                    <div className="w-full bg-gray-950/30 border border-gray-800/50 text-gray-400 rounded-lg px-4 py-2.5 text-sm">
                      {user.created_at
                        ? format(new Date(user.created_at), "MMM yyyy")
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name || "");
                    }}
                    className="px-4 py-2 rounded-lg font-medium text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-lg font-medium text-sm text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security & Danger Zone */}
          <div className="p-6 md:p-8 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm shadow-xl flex flex-col relative group">
            <div className="absolute inset-0 bg-linear-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-pink-400" />
                Security Setup
              </h3>

              <div className="p-4 rounded-xl bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 mb-6">
                <p className="text-sm text-purple-200/60 mb-1 font-medium tracking-wide uppercase text-[10px]">
                  Account Integrity
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse" />
                  <span className="text-green-400 font-bold tracking-wide">
                    Fully Protected
                  </span>
                </div>
              </div>

              {!isChangingPassword ? (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="w-full py-3 flex justify-center items-center gap-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-white font-medium transition-colors border border-gray-700 shadow-sm shadow-black/50"
                >
                  <Key className="w-4 h-4 text-gray-400" /> Update Password
                </button>
              ) : (
                <form
                  onSubmit={handleUpdatePassword}
                  className="space-y-4 animate-in fade-in slide-in-from-top-2"
                >
                  <div>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current Password"
                      className="w-full bg-gray-950/50 border border-gray-700 focus:border-pink-500/50 text-white rounded-lg px-4 py-2.5 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password"
                      className="w-full bg-gray-950/50 border border-gray-700 focus:border-pink-500/50 text-white rounded-lg px-4 py-2.5 outline-none transition-colors"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        isSavingPassword || !newPassword || !currentPassword
                      }
                      className="px-4 py-1.5 rounded-lg text-sm bg-pink-600 hover:bg-pink-500 text-white font-medium flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {isSavingPassword ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Set Password"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-gray-800/60 relative">
              <h4 className="text-sm font-bold text-red-500/80 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <LogOut className="w-4 h-4" /> Danger Zone
              </h4>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to log out from this session?",
                    )
                  ) {
                    window.location.href = "/auth/login";
                  }
                }}
                className="w-full py-3 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold transition-colors border border-red-500/20 shadow-inner"
              >
                End Current Session
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "keys" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-300">
          <APIKeysManager />
        </div>
      )}
    </div>
  );
}
