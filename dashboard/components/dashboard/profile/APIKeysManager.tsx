"use client";

import { useState, useEffect } from "react";
import { getApiKeys, generateApiKey, deleteApiKey } from "@/lib/auth-client";
import { ApiKeyData } from "@/lib/types";
import { 
  Key, Plus, Trash2, Calendar, Clock, 
  Copy, Check, ShieldAlert, KeyRound 
} from "lucide-react";

export function APIKeysManager() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKeyName, setCopiedKeyName] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    setIsLoading(true);
    try {
      const fetchedKeys = await getApiKeys();
      setKeys(fetchedKeys || []);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.error("Failed to fetch API keys");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      // Just auto-generating a key without a custom name for now, or you can add an input.
      const nameInput = document.getElementById("key_name") as HTMLInputElement;
      const keyName = nameInput?.value || `Key-${new Date().getTime().toString().slice(-4)}`;
      
      const newKeyResp = await generateApiKey(keyName);
      if (newKeyResp) {
        setNewKey(newKeyResp.api_key.key); // Display the actual key string one time
        await fetchKeys(); 
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      alert("Failed to generate API Key");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API Key? Any application using it will break.")) return;
    try {
      const success = await deleteApiKey(id);
      if (success) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        alert("Failed to delete key. Please try again.");
      }
    } catch {
      alert("Error revoking key.");
    }
  };

  const handleCopy = (text: string, identifier: string | null = null) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyName(identifier);
    setTimeout(() => setCopiedKeyName(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informative Header */}
      <div className="p-6 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-purple-400" />
              API Settings
            </h3>
            <p className="text-sm text-gray-400 max-w-lg">
              Generate and manage API Keys to authenticate your application SDK instances with the AI Control Plane.
            </p>
          </div>
          
          <form onSubmit={handleGenerate} className="flex gap-2 w-full sm:w-auto">
            <input 
              id="key_name"
              type="text" 
              placeholder="Key Name e.g Production" 
              className="bg-gray-950 border border-gray-800 text-sm rounded-lg px-4 py-2 w-full sm:w-48 focus:outline-hidden focus:border-purple-500/50 text-white"
            />
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium text-sm transition-all disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {isGenerating ? "Creating..." : "Create"}
            </button>
          </form>
        </div>
      </div>

      {/* Newly Generated Key Banner */}
      {newKey && (
        <div className="p-6 rounded-2xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-4">
            <div className="p-2 bg-green-500/20 text-green-400 rounded-lg shrink-0 h-fit">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-green-400 font-medium mb-1">Store your new API Key</h4>
              <p className="text-sm text-gray-300 mb-4">
                Please copy your API key and save it securely. For security reasons, 
                <span className="font-semibold text-white"> it will not be shown again.</span>
              </p>
              <div className="flex items-center gap-2 max-w-md">
                <code className="flex-1 bg-gray-950 border border-gray-800 px-4 py-2 rounded-lg text-sm text-purple-300 font-mono break-all">
                  {newKey}
                </code>
                <button
                  onClick={() => handleCopy(newKey, 'new')}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors shrink-0"
                >
                  {copiedKeyName === 'new' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List Keys */}
      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="text-center py-12 border border-gray-800 border-dashed rounded-2xl bg-gray-900/30">
            <Key className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium text-sm">No API keys generated yet.</p>
          </div>
        ) : (
          keys.map((k) => (
            <div key={k.id} className="group p-5 rounded-2xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-medium truncate">{k.name || "Default Key"}</h4>
                  {!k.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400/80">
                  <Key className="w-3 h-3" />
                  <span className="truncate">{k.key}</span>
                  <button 
                    onClick={() => handleCopy(k.key, k.id.toString())}
                    className="p-1 hover:text-white transition-colors"
                    title="Copy Key Hint"
                  >
                    {copiedKeyName === k.id.toString() 
                      ? <Check className="w-3 h-3 text-green-400" /> 
                      : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-6 text-sm">
                <div className="flex items-center gap-6 text-gray-500">
                  <div className="flex items-center gap-1.5" title="Created At">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{new Date(k.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="items-center gap-1.5 hidden sm:flex" title="Last Used">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(k.id)}
                  disabled={!k.is_active}
                  className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
                  title="Revoke API Key"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
