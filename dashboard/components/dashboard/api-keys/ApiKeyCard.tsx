"use client";

import { useState } from "react";
import {
  Key,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { ApiKey } from "@/lib/types";
import { useDeleteApiKey } from "@/hooks/useApiKeys";

interface ApiKeyCardProps {
  apiKey: ApiKey;
}

export function ApiKeyCard({ apiKey }: ApiKeyCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { mutate: deleteKey, isPending: isDeleting } = useDeleteApiKey();

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey.key);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = () => {
    deleteKey(apiKey.id, {
      onSuccess: () => {
        setShowConfirmDelete(false);
      },
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="relative p-5 rounded-xl bg-[#091020]/80 border border-white/[0.08] hover:border-cyan-500/30 backdrop-blur-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)] space-y-4 group">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.15)] shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold font-mono text-white">
                {apiKey.name || "Production API Key"}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono mt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                Created: {formatDate(apiKey.created_at)}
              </span>
              <span>•</span>
              <span>Last used: {formatDate(apiKey.last_used)}</span>
            </div>
          </div>
        </div>

        {/* Delete Trigger / Confirmation */}
        <div className="self-end sm:self-center">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
              title="Revoke and delete this API key"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <span className="text-xs font-mono text-rose-400 mr-1 hidden sm:inline">Revoke key?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Confirm</span>
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] text-xs font-mono transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Masked Secret Key Input Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="flex-1 px-4 py-2.5 rounded-xl bg-[#070d1a]/90 border border-white/[0.08] text-xs font-mono text-slate-200 break-all select-all flex items-center justify-between">
          <span>{isVisible ? apiKey.key : "acp_" + "•".repeat(36)}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold ml-2 shrink-0">
            Bearer Token
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="flex-1 sm:flex-none p-2.5 rounded-xl bg-[#091020] hover:bg-[#070d1a] border border-white/[0.08] hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer flex items-center justify-center"
            title={isVisible ? "Hide secret key" : "Show secret key"}
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isCopied
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(0,230,153,0.2)]"
                : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.1)] hover:scale-105 active:scale-95"
            }`}
            title="Copy secret key to clipboard"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
