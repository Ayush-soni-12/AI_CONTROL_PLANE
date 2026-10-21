"use client";

import Link from "next/link";
import { ArrowRight, Radio, LogOut } from "lucide-react";
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
      <div className="max-w-[1152px] mx-auto flex items-center justify-between p-3 sm:px-5 rounded-xl bg-[#091020]/90 backdrop-blur-md border border-blue-500/20 hover:border-cyan-500/40 transition-colors">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-semibold text-white tracking-tight font-sans">
              NeuralControl
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              v2.4
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <div className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-sans font-medium text-slate-300">
          <a href="#features" className="hover:text-cyan-300 transition-colors">Features</a>
          <a href="#architecture" className="hover:text-cyan-300 transition-colors">Architecture</a>
          <a href="#how-it-works" className="hover:text-cyan-300 transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-cyan-300 transition-colors">Pricing</a>
          <Link href="/dashboard/docs" className="hover:text-cyan-300 transition-colors">Documentation</Link>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isLoading ? (
            <div className="h-8 w-24 bg-[#070a13] border border-white/5 rounded-lg animate-pulse" />
          ) : user ? (
            <>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3.5 py-1.5 rounded-lg border border-white/8 hover:border-cyan-500/30 bg-[#070a13] text-slate-300 hover:text-white text-xs font-sans font-medium transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  {isLoggingOut ? "..." : "Sign Out"}
                </span>
              </button>

              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#070a13] font-semibold text-xs font-sans transition-colors"
              >
                <span>Mission Control</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-3.5 py-1.5 rounded-lg border border-white/8 hover:border-cyan-500/30 bg-[#070a13] text-slate-300 hover:text-white text-xs font-sans font-medium transition-colors"
              >
                Sign In
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#070a13] font-semibold text-xs font-sans transition-colors"
              >
                <span>Launch Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu trigger button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-1.5 rounded-lg bg-[#070a13] border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 bg-[#091020] border border-cyan-500/30 p-4 rounded-xl space-y-3 z-50">
          <Link
            href="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center justify-center gap-1.5 w-full px-4 py-2 rounded-lg bg-cyan-500 text-[#070a13] font-semibold text-sm transition-colors"
          >
            Launch Console
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="pt-2 border-t border-white/8 space-y-2 text-center text-sm font-sans text-slate-300">
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:text-cyan-300">Features</a>
            <a href="#architecture" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:text-cyan-300">Architecture</a>
            <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="block py-1 hover:text-cyan-300">Pricing</a>
          </div>
        </div>
      )}
    </nav>
  );
}
