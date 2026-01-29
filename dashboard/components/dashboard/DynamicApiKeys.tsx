"use client";

import { useState } from "react";
import { Key, Copy, Trash2, Eye, EyeOff } from "lucide-react";
import { useApiKeys, useDeleteApiKey } from "@/hooks/useApiKeys";

export function DynamicApiKeys() {
  const { data: apiKeys } = useApiKeys();
  const { mutate: deleteKey } = useDeleteApiKey();
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});

  const toggleKeyVisibility = (id: number) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    alert("API key copied to clipboard!");
  };

  const handleDeleteKey = async (id: number) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      deleteKey(id, {
        onSuccess: () => {
          alert("API key deleted successfully!");
        },
        onError: () => {
          alert("Failed to delete API key. Please try again.");
        },
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl">
        <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
          <Key className="w-16 h-16 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-gray-200">
          No API Keys Yet
        </h3>
        <p className="text-gray-400 mb-6 text-lg">
          Generate your first API key to start using the Control Plane API
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((apiKey) => (
        <div
          key={apiKey.id}
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-purple-500/30 transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Key className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {apiKey.name || "Unnamed Key"}
                </h3>
                <p className="text-sm text-gray-400">
                  Created: {formatDate(apiKey.created_at)} • Last used:{" "}
                  {formatDate(apiKey.last_used)}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleDeleteKey(apiKey.id)}
              className="p-2 rounded-lg hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 font-mono text-sm">
              {showKeys[apiKey.id] ? apiKey.key : "•".repeat(apiKey.key.length)}
            </div>
            <button
              onClick={() => toggleKeyVisibility(apiKey.id)}
              className="p-3 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-colors"
            >
              {showKeys[apiKey.id] ? (
                <EyeOff className="w-4 h-4 text-gray-400" />
              ) : (
                <Eye className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => copyToClipboard(apiKey.key)}
              className="p-3 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-colors"
            >
              <Copy className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
