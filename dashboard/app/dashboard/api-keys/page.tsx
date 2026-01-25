"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Key, Copy, Trash2, Plus, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiKeys, generateApiKey, deleteApiKey } from "@/lib/auth-client";
import type { ApiKeyData } from "@/lib/types";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch API keys on mount
  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const keys = await getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleKeyVisibility = (id: number) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    alert("API key copied to clipboard!");
  };

  const handleDeleteKey = async (id: number) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      const success = await deleteApiKey(id);
      if (success) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        alert("API key deleted successfully!");
      } else {
        alert("Failed to delete API key. Please try again.");
      }
    }
  };

  const generateNewKey = async () => {
    setIsGenerating(true);
    try {
      const result = await generateApiKey();
      console.log(result);

      if (result && result.api_key) {
        setApiKeys((prev) => [...prev, result.api_key]);
        alert(result.message || "API key generated successfully!");
      } else {
        alert("Failed to generate API key. Please try again.");
      }
    } catch (error) {
      console.error("Error generating API key:", error);
      alert("An error occurred while generating the API key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen p-8 bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  API Keys
                </h1>
                <p className="text-gray-400 mt-2">
                  Manage your API keys for accessing the Control Plane
                </p>
              </div>
              <Button
                onClick={generateNewKey}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate New Key
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* API Keys List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading API keys...</p>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="text-center py-16 bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl">
                <div className="inline-block p-6 rounded-2xl bg-purple-500/10 mb-6">
                  <Key className="w-16 h-16 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-200">
                  No API Keys Yet
                </h3>
                <p className="text-gray-400 mb-6 text-lg">
                  Generate your first API key to start using the Control Plane
                  API
                </p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
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
                      {showKeys[apiKey.id]
                        ? apiKey.key
                        : "•".repeat(apiKey.key.length)}
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
              ))
            )}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              How to use API Keys
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Include your API key in the request headers:
            </p>
            <code className="block bg-gray-950/50 border border-gray-800 rounded-lg px-4 py-3 text-sm font-mono text-gray-300">
              curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot;
              https://api.example.com/signals
            </code>
          </div>
        </div>
      </div>
    </>
  );
}
