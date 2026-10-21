"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SystemArchitectureMatrix } from "./SystemArchitectureMatrix";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ArchitectureVisual() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 90%",
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef} className="mb-24">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-10"
        style={{ opacity: 0 }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-mono text-cyan-300 font-medium">
            System Architecture
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-semibold font-sans text-white mb-3 tracking-tight text-balance">
          How NeuralControl protects your services.
        </h2>

        <p className="text-sm sm:text-base font-sans text-slate-300 max-w-2xl mx-auto leading-relaxed text-pretty">
          In-process signal interception with zero network overhead, backed by asynchronous control plane intelligence.
        </p>
      </div>

      {/* 3-Tier Architecture Matrix */}
      <SystemArchitectureMatrix />
    </div>
  );
}


