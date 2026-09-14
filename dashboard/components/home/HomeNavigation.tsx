"use client";

import Link from "next/link";
import { ArrowRight, Radio, LogIn, UserPlus, LogOut, Github, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCheckAuth, useLogout } from "@/hooks/useSignals";

/**
 * Client component for landing page navigation
 * Features: Obsidian glass styling, live auth state, GitHub link
 */
export function HomeNavigation() {
  const router = useRouter();
  const { data: user, isLoading } = useCheckAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push("/");
      },
    });
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="px-4 sm:px-8 py-4 sm:py-6 relative z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between p-3.5 sm:px-6 rounded-2xl bg-[#0b1222]/80 backdrop-blur-2xl border border-blue-500/15 shadow-2xl shadow-black/50">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 group-hover:border-cyan-400/60 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.2)]">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              NeuralControl
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Open Source
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-6 text-sm text-slate-300 font-medium">
          <a href="#features" className="hover:text-cyan-300 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-cyan-300 transition-colors">Architecture</a>
          <a href="#how-it-works" className="hover:text-cyan-300 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-cyan-300 transition-colors">Pricing</a>
          <Link href="/dashboard/docs" className="hover:text-cyan-300 transition-colors">Documentation</Link>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-24 bg-slate-800/60 rounded-xl animate-pulse" />
          ) : user ? (
            <>
              <span className="text-xs text-slate-400 font-mono">
                Operator: <span className="text-cyan-300 font-semibold">{user.name}</span>
              </span>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3.5 py-2 rounded-xl border border-slate-700 hover:border-red-500/40 hover:bg-red-500/10 text-slate-300 hover:text-red-300 text-xs font-medium transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  {isLoggingOut ? "..." : "Sign Out"}
                </span>
              </button>

              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                Mission Control
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-xl border border-slate-700/80 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-medium transition-all"
              >
                Sign In
              </Link>

              <Link
                href="/dashboard"
                className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all"
              >
                Launch Console
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 bg-[#091122]/95 backdrop-blur-2xl border border-blue-500/20 p-4 rounded-2xl shadow-2xl space-y-3 z-50">
          <Link
            href="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm"
          >
            Launch Console
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="pt-2 border-t border-slate-800 space-y-2 text-center text-sm text-slate-300">
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Features</a>
            <a href="#architecture" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Architecture</a>
            <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="block py-1">Pricing</a>
          </div>
        </div>
      )}
    </nav>
  );
}
