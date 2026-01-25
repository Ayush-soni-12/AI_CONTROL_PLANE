"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState([
    {
      id: "1",
      name: "Production API Key",
      key: "sk_live_1234567890abcdefghijklmnopqrstuvwxyz",
      createdAt: "2024-01-20",
      lastUsed: "2024-01-25",
    },
    {
      id: "2",
      name: "Development API Key",
      key: "sk_test_abcdefghijklmnopqrstuvwxyz1234567890",
      createdAt: "2024-01-15",
      lastUsed: "2024-01-24",
    },
  ]);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    // You can add a toast notification here
    alert("API key copied to clipboard!");
  };

  const deleteKey = (id: string) => {
    if (confirm("Are you sure you want to delete this API key?")) {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const generateNewKey = () => {
    const newKey = {
      id: Date.now().toString(),
      name: `New API Key ${apiKeys.length + 1}`,
      key: `sk_live_${Math.random().toString(36).substring(2)}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
    };
    setApiKeys((prev) => [...prev, newKey]);
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
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                Generate New Key
              </Button>
            </div>
          </div>

          {/* API Keys List */}
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
                        {apiKey.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Created: {apiKey.createdAt} • Last used:{" "}
                        {apiKey.lastUsed}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteKey(apiKey.id)}
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
            ))}
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
              curl -H "Authorization: Bearer YOUR_API_KEY"
              https://api.example.com/signals
            </code>
          </div>
        </div>
      </div>
    </>
  );
}
