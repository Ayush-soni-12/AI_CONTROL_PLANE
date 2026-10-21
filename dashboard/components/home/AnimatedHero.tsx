"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Activity, Terminal, Copy, Check, ShieldCheck, Cpu } from "lucide-react";

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
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3 }
      );

      tl.fromTo(
        headingRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3 },
        "-=0.15"
      );

      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.3 },
        "-=0.15"
      );

      const buttons = buttonsRef.current?.children;
      if (buttons) {
        tl.fromTo(
          buttons,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
          "-=0.15"
        );
      }
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef} className="text-center mb-16 pt-8 sm:pt-14 relative">
      {/* Top Open Source Badge */}
      <div
        ref={badgeRef}
        className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-8"
        style={{ opacity: 0 }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[12px] font-mono text-cyan-300 font-medium">
          Autonomous Service Control • Open Source
        </span>
      </div>

      {/* Main Headline */}
      <h1
        ref={headingRef}
        className="text-4xl sm:text-6xl md:text-7xl font-semibold mb-6 tracking-tight text-white max-w-4xl mx-auto text-balance font-sans"
        style={{ opacity: 0 }}
      >
        Your backend shouldn't break under pressure.
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-300 to-cyan-300 block text-3xl sm:text-5xl md:text-6xl font-semibold mt-3">
          Let's fix that.
        </span>
      </h1>

      {/* Subtitle */}
      <p
        ref={subtitleRef}
        className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed px-4 text-pretty font-sans"
        style={{ opacity: 0 }}
      >
        NeuralControl turns live traffic signals into instant runtime protection—keeping your critical microservices fast, stable, and resilient on autopilot.
      </p>

      {/* Terminal Quick Install Snippet */}
      <div className="max-w-lg mx-auto mb-8 px-4">
        <div className="flex items-center justify-between p-2.5 sm:px-4 rounded-xl bg-[#091020] border border-cyan-500/30">
          <div className="flex items-center gap-2.5 overflow-x-auto text-left">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs sm:text-sm font-mono text-slate-200 whitespace-nowrap">
              docker run -d -p 8000:8000 <span className="text-cyan-300 font-medium">neuralcontrol/control-plane</span>
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="ml-3 p-1.5 rounded-lg border border-white/8 hover:border-cyan-500/40 bg-[#070a13] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer shrink-0"
            title="Copy command"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* CTA Buttons */}
      <div
        ref={buttonsRef}
        className="flex flex-col sm:flex-row gap-3 justify-center items-center px-4"
      >
        <Link
          href="/dashboard"
          className="px-5 py-2.5 w-full sm:w-auto rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#070a13] font-semibold text-sm transition-all flex items-center justify-center gap-2 font-sans"
          style={{ opacity: 0 }}
        >
          <Activity className="w-4 h-4" />
          <span>Launch Live Console</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <Link
          href="/dashboard/docs"
          className="px-5 py-2.5 w-full sm:w-auto rounded-xl border border-cyan-500/30 hover:border-cyan-400/60 bg-[#091020] hover:bg-[#0d162d] text-cyan-200 font-medium text-sm transition-all flex items-center justify-center gap-2 font-sans"
          style={{ opacity: 0 }}
        >
          <span>Documentation</span>
        </Link>
      </div>

      {/* Micro Metrics Highlights */}
      <div className="mt-12 flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-xs font-sans text-slate-300">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#091020] border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Real-Time Signal Ingestion</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#091020] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>&lt;0.4ms Decision Latency</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#091020] border border-violet-500/20 hover:border-violet-500/40 transition-colors">
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
          <span>Autonomous Runtime Defense</span>
        </div>
      </div>
    </div>
  );
}
