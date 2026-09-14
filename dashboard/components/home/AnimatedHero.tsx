"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Activity, Terminal, Sparkles, Copy, Check, ShieldCheck, Zap } from "lucide-react";

gsap.registerPlugin(useGSAP);

export function AnimatedHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const installCmd = "docker run -d -p 8000:8000 neuralcontrol/control-plane";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7 },
      );

      const words = headingRef.current?.querySelectorAll(".hero-word");
      if (words) {
        tl.fromTo(
          words,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 },
          "-=0.4",
        );
      }

      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.5",
      );

      const buttons = buttonsRef.current?.children;
      if (buttons) {
        tl.fromTo(
          buttons,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 },
          "-=0.3",
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="text-center mb-20 pt-8 sm:pt-12 relative">
      {/* Top Open Source Badge */}
      <div
        ref={badgeRef}
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#0d1c33]/80 border border-cyan-500/30 mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)]"
        style={{ opacity: 0 }}
      >
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-xs font-mono font-medium text-cyan-300">
          Open Source AI Control Plane • Apache 2.0
        </span>
      </div>

      {/* Main Headline */}
      <h1
        ref={headingRef}
        className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight tracking-tight text-white max-w-5xl mx-auto"
      >
        <span className="hero-word inline-block bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
          Autonomous
        </span>{" "}
        <span className="hero-word inline-block text-white">Runtime</span>{" "}
        <span className="hero-word inline-block bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Control
        </span>
        <br className="hidden sm:inline" />
        <span className="hero-word inline-block text-white text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-300 mt-2">
          for Microservices & AI Agents
        </span>
      </h1>

      {/* Subtitle */}
      <p
        ref={subtitleRef}
        className="text-sm sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed px-4"
        style={{ opacity: 0 }}
      >
        Dynamic traffic governance with <span className="text-cyan-300 font-medium">adaptive timeouts</span>,{" "}
        <span className="text-emerald-300 font-medium">fail-open circuit breakers</span>,{" "}
        <span className="text-purple-300 font-medium">LLM anomaly auto-mitigation</span>, and{" "}
        <span className="text-blue-300 font-medium">x402 confidential agent payments</span>.
      </p>

      {/* Terminal Quick Install Snippet */}
      <div className="max-w-xl mx-auto mb-10 px-4">
        <div className="flex items-center justify-between p-3 sm:px-4 rounded-xl bg-slate-950/90 border border-blue-500/25 shadow-2xl backdrop-blur-xl group">
          <div className="flex items-center gap-3 overflow-x-auto text-left">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-mono text-cyan-200 whitespace-nowrap">
              {installCmd}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400/50 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer shrink-0"
            title="Copy command"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CTA Buttons */}
      <div
        ref={buttonsRef}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center px-4"
      >
        <Link
          href="/dashboard"
          className="group relative px-8 py-3.5 w-full sm:w-auto rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-base shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2.5"
          style={{ opacity: 0 }}
        >
          <Activity className="w-5 h-5" />
          <span>Launch Live Console</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/dashboard/docs"
          className="px-8 py-3.5 w-full sm:w-auto rounded-xl border border-slate-700/80 hover:border-cyan-500/40 bg-slate-900/60 hover:bg-slate-850 text-slate-300 hover:text-white font-semibold text-base transition-all backdrop-blur-md flex items-center justify-center gap-2"
          style={{ opacity: 0 }}
        >
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>Documentation</span>
        </Link>
      </div>

      {/* Micro Metrics Highlights */}
      <div className="mt-12 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-xs font-mono text-slate-400">
        <div className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#091122]/70 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-[#0c1833] hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(0,230,153,0.15)] transition-all duration-300 cursor-pointer">
          <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-115 group-hover:rotate-6 transition-transform duration-300" />
          <span className="text-slate-300 group-hover:text-emerald-300 transition-colors">Fail-Open In-Memory Resilience</span>
        </div>
        <div className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#091122]/70 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-[#0c1833] hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(0,240,255,0.15)] transition-all duration-300 cursor-pointer">
          <Zap className="w-4 h-4 text-cyan-400 group-hover:scale-115 group-hover:-rotate-6 transition-transform duration-300" />
          <span className="text-slate-300 group-hover:text-cyan-300 transition-colors">&lt;1ms Decision Latency</span>
        </div>
        <div className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#091122]/70 border border-slate-800/80 hover:border-purple-500/40 hover:bg-[#0c1833] hover:-translate-y-1 hover:shadow-[0_0_18px_rgba(168,85,247,0.15)] transition-all duration-300 cursor-pointer">
          <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-115 group-hover:rotate-12 transition-transform duration-300" />
          <span className="text-slate-300 group-hover:text-purple-300 transition-colors">Gemini LLM Anomaly Reasoning</span>
        </div>
      </div>
    </div>
  );
}
