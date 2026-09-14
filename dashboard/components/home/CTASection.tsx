"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight, Rocket, Terminal } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, scale: 0.94, y: 30 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );

      // Glow pulse
      gsap.to(".cta-glow", {
        opacity: 0.25,
        scale: 1.15,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: sectionRef },
  );

  return (
    <div
      ref={sectionRef}
      className="relative rounded-3xl overflow-hidden border border-blue-500/20 bg-[#0d1527]/90 backdrop-blur-2xl shadow-2xl shadow-black/60"
      style={{ opacity: 0 }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,240,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 p-8 sm:p-14 text-center">
        <div className="inline-flex p-3.5 rounded-2xl bg-[#070a13] mb-6 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
          <Rocket className="w-8 h-8 text-cyan-400" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
          Ready to Take{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Autonomous Control
          </span>
          ?
        </h2>

        <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-2xl mx-auto leading-relaxed">
          Deploy NeuralControl and empower your microservices with Gemini-driven resilience, sub-millisecond anomaly detection, and self-healing mitigation loops.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full px-4 sm:px-0 mt-4">
          <Link
            href="/dashboard"
            className="group relative inline-flex justify-center items-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#070a13] font-bold text-sm sm:text-base transition-all duration-300 hover:scale-[1.03] shadow-[0_0_25px_rgba(0,240,255,0.35)] cursor-pointer"
          >
            <span>Launch Mission Control</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
          </Link>

          <Link
            href="https://github.com"
            className="inline-flex justify-center items-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-700 hover:border-cyan-500/50 bg-[#070a13] hover:bg-slate-900 text-slate-300 hover:text-white transition-all duration-300 text-sm font-medium font-mono cursor-pointer"
          >
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>docker compose up</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

