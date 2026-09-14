"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AgentTopologyMesh } from "@/components/dashboard/AgentTopologyMesh";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function ArchitectureVisual() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading reveal
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mb-28">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-10"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-xs font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-3.5 py-1 rounded-full mb-3 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
          ARCHITECTURE TOPOLOGY
        </span>
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
          Agent Network &amp;{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Service Mesh
          </span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Interactive real-time graph of intelligent routing, LLM agents, dynamic circuit breakers, and protected downstream microservices
        </p>
      </div>

      {/* Interactive Topology Mesh */}
      <div className="max-w-6xl mx-auto">
        <AgentTopologyMesh />
      </div>
    </div>
  );
}

