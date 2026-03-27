"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FlagCard } from "@/components/dashboard/flags/FlagCard";
import { useFlags } from "@/hooks/useFlags";
import { FlagAuditLog } from "@/components/dashboard/flags/FlagAuditLog";
import { Flag, Plus, X, RefreshCw } from "lucide-react";

export default function FeatureFlagsPage() {
  const [serviceName, setServiceName] = useState(" ");
  const [draftService, setDraftService] = useState(" ");
  const [showCreate, setShowCreate] = useState(false);
  const [newFlagName, setNewFlagName] = useState("");
  const [newFlagRollout, setNewFlagRollout] = useState(0);
  const [creating, setCreating] = useState(false);

  const { flags, isLoading, error, updateFlag, createFlag, refetch } =
    useFlags(serviceName);

  const handleCreate = async () => {
    if (!newFlagName.trim()) return;
    setCreating(true);
    await createFlag(newFlagName.trim(), newFlagRollout);
    setNewFlagName("");
    setNewFlagRollout(0);
    setShowCreate(false);
    setCreating(false);
  };

  return (
    <>
      <DashboardSidebar />
      <div className="2xl:ml-64 min-h-screen p-4 sm:p-8 bg-linear-to-br from-background via-purple-950/5 to-background text-white">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 mt-12 2xl:mt-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              <div className="p-3 sm:p-4 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 shrink-0">
                <Flag className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl sm:text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Feature Flags
                </h1>
                <p className="text-sm sm:text-base text-gray-400 mt-1">
                  Roll out features gradually. NeuralControl AI will automatically
                  disable flags that cause performance degradation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refetch}
                  className="p-2 rounded-xl border border-gray-700/50 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 text-sm font-semibold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  New Flag
                </button>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-linear-to-r from-purple-500/50 via-pink-500/50 to-transparent mb-6" />

          {/* Service filter */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-gray-400">Service:</span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setServiceName(draftService);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={draftService}
                onChange={(e) => setDraftService(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-gray-900/60 border border-gray-700/50 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50"
                placeholder="service-name"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-sm rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-all"
              >
                Load
              </button>
            </form>
          </div>

          {/* Create modal */}
          {showCreate && (
            <div className="mb-6 p-5 rounded-2xl bg-gray-900/60 border border-purple-500/30 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white">Create New Flag</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Flag Name</label>
                  <input
                    value={newFlagName}
                    onChange={(e) => setNewFlagName(e.target.value)}
                    placeholder="ai-recommendations"
                    className="w-full px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700/50 text-sm text-gray-200 focus:outline-none focus:border-purple-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Initial Rollout: <span className="text-purple-400 font-bold">{newFlagRollout}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={newFlagRollout}
                    onChange={(e) => setNewFlagRollout(parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newFlagName.trim() || creating}
                  className="px-4 py-2 text-sm rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                >
                  {creating ? "Creating…" : "Create Flag"}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-500/20 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : flags.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl rounded-2xl p-12 text-center">
              <Flag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <div className="text-lg font-bold text-gray-200 mb-1">No feature flags yet</div>
              <div className="text-sm text-gray-500">
                Create your first flag to start rolling out features safely.
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {flags.map((flag) => (
                <FlagCard
                  key={flag.id}
                  flag={flag}
                  onUpdate={updateFlag}
                />
              ))}
            </div>
          )}

          {/* Global Audit Log */}
          {!isLoading && (
            <div className="mt-16 mb-20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-gray-800 border border-gray-700">
                  <RefreshCw className="w-5 h-5 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Service Audit Trail</h2>
              </div>
              <div className="bg-gray-900/40 border border-gray-800/50 backdrop-blur-xl rounded-2xl p-6">
                <FlagAuditLog serviceName={serviceName} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
