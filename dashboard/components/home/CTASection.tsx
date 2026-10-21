"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight, Shield, Terminal } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <div
      ref={sectionRef}
      className="relative rounded-2xl border border-cyan-500/30 bg-[#090d16]/95 p-8 sm:p-14 text-center max-w-[1152px] mx-auto my-14 shadow-2xl backdrop-blur-md"
      style={{ opacity: 0 }}
    >
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Icon & Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-5 shadow-sm">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">RUNTIME PROTECTION</span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-5xl font-sans font-semibold text-white mb-3 tracking-tight text-balance">
          Ready to protect your backend services?
        </h2>

        {/* Subtitle */}
        <p className="text-sm sm:text-base font-sans text-slate-300 mb-8 max-w-xl mx-auto leading-relaxed text-balance">
          Spin up NeuralControl locally in seconds with Docker Compose, or integrate our zero-overhead in-process middleware into your production microservices.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-3 w-full px-4 sm:px-0">
          <Link
            href="/dashboard"
            className="inline-flex justify-center items-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <span>Launch Mission Control</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center items-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-white font-mono text-xs sm:text-sm transition-all cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>docker compose up</span>
          </a>
        </div>
      </div>
    </div>
  );
}
