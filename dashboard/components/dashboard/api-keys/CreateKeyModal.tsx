"use client";

import { useState } from "react";
import {
  X,
  Key,
  Plus,
  Sparkles,
  Copy,
  Check,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useGenerateApiKey } from "@/hooks/useApiKeys";

interface CreateKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateKeyModal({ isOpen, onClose }: CreateKeyModalProps) {
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: generateKey, isPending: isGenerating } = useGenerateApiKey();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = keyName.trim() || "Production API Key";

    generateKey(name, {
      onSuccess: (data) => {
        if (data && data.api_key && data.api_key.key) {
          setGeneratedKey(data.api_key.key);
        } else {
          setError("Failed to generate API key. Please check control plane connectivity.");
        }
      },
      onError: (err: any) => {
        setError(err.message || "An unexpected error occurred while generating key.");
      },
    });
  };

  const handleCopy = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClose = () => {
    setKeyName("");
    setGeneratedKey(null);
    setIsCopied(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-[#091020] border border-cyan-500/30 shadow-[0_0_40px_rgba(0,240,255,0.15)] space-y-5 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute inset-0 bg-linear-to-r from-cyan-500/10 via-purple-500/5 to-transparent rounded-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  CREDENTIAL GENERATION
                </span>
                <span className="text-xs text-slate-400 font-mono">Control Plane Access</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-white mt-0.5">
                {generatedKey ? "API Key Generated" : "Generate New API Key"}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        {!generatedKey ? (
          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">
                Key Name / Description
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g. Production Webhook Ingest"
                disabled={isGenerating}
                className="w-full px-4 py-2.5 rounded-xl bg-[#070d1a] border border-white/[0.12] hover:border-cyan-500/30 focus:border-cyan-400 focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] text-xs font-mono text-white placeholder-slate-500 transition-all focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 font-mono">
                Give your key a descriptive name to identify its client application.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-mono font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-black stroke-[3]" />
                    <span>Create Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="relative space-y-4 animate-in fade-in duration-200">
            {/* Warning Callout */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Copy your API key now</span>
                <span className="text-slate-300 text-[11px] leading-relaxed">
                  For security, the full key secret is only revealed once. Make sure to copy and store it securely in your environment variables.
                </span>
              </div>
            </div>

            {/* Key Value Display */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300">
                Generated Secret Key
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 rounded-xl bg-[#070d1a] border border-cyan-500/40 text-xs font-mono text-cyan-300 break-all select-all font-bold">
                  {generatedKey}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-4 py-3 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isCopied
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(0,230,153,0.3)]"
                      : "bg-cyan-500 hover:bg-cyan-400 text-black border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:scale-105 active:scale-95"
                  }`}
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-black" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Done Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-mono font-semibold transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
