"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Server,
  ArrowRight,
  BrainCircuit,
  MonitorDot,
  Box,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const nodes = [
  {
    id: "service",
    label: "Your Service",
    sublabel: "Node.js App",
    icon: Box,
    color: "from-blue-500 to-cyan-500",
    iconColor: "text-blue-400",
  },
  {
    id: "sdk",
    label: "SDK Middleware",
    sublabel: "Auto-intercept",
    icon: MonitorDot,
    color: "from-purple-500 to-pink-500",
    iconColor: "text-purple-400",
  },
  {
    id: "api",
    label: "Control Plane",
    sublabel: "FastAPI Backend",
    icon: Server,
    color: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-400",
  },
  {
    id: "ai",
    label: "AI Engine",
    sublabel: "Gemini + Redis",
    icon: BrainCircuit,
    color: "from-amber-500 to-orange-500",
    iconColor: "text-amber-400",
  },
];

export function ArchitectureVisual() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 40 },
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

      // Nodes stagger
      const nodeEls = sectionRef.current?.querySelectorAll(".arch-node");
      nodeEls?.forEach((node, index) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 40, scale: 0.9 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            delay: index * 0.15,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".arch-container",
              start: "top 80%",
              once: true,
            },
          },
        );
      });

      // Arrows
      const arrows = sectionRef.current?.querySelectorAll(".arch-arrow");
      arrows?.forEach((arrow, index) => {
        gsap.fromTo(
          arrow,
          { opacity: 0, scaleX: 0 },
          {
            opacity: 1,
            scaleX: 1,
            duration: 0.5,
            delay: 0.3 + index * 0.2,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".arch-container",
              start: "top 80%",
              once: true,
            },
          },
        );
      });

      // Data pulse animation (repeating)
      const pulses = sectionRef.current?.querySelectorAll(".data-pulse");
      pulses?.forEach((pulse) => {
        gsap.to(pulse, {
          x: 32,
          opacity: 0,
          duration: 1.5,
          repeat: -1,
          ease: "power1.in",
          delay: Math.random() * 2,
        });
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mb-28">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-14"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-sm font-semibold text-cyan-400 bg-cyan-500/10 px-4 py-1.5 rounded-full mb-4 border border-cyan-500/20">
          ARCHITECTURE
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          How It All{" "}
          <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Connects
          </span>
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          A lightweight SDK that connects your services to an AI-powered control
          plane
        </p>
      </div>

      {/* Architecture flow */}
      <div className="arch-container max-w-5xl mx-auto">
        {/* Desktop: horizontal flow */}
        <div className="hidden md:flex items-center justify-center gap-3">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.id} className="flex items-center gap-3">
                {/* Node */}
                <div
                  className="arch-node group relative bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 w-44 text-center hover:border-gray-700 transition-all duration-300"
                  style={{ opacity: 0 }}
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${node.color} opacity-0 group-hover:opacity-[0.06] transition-opacity rounded-2xl`}
                  />
                  <div className="relative z-10">
                    <div
                      className={`inline-flex p-3 rounded-xl bg-linear-to-br ${node.color}/10 mb-3 border border-gray-800`}
                    >
                      <Icon className={`w-6 h-6 ${node.iconColor}`} />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      {node.label}
                    </h4>
                    <p className="text-xs text-gray-500">{node.sublabel}</p>
                  </div>
                </div>

                {/* Arrow between nodes */}
                {index < nodes.length - 1 && (
                  <div
                    className="arch-arrow relative flex items-center"
                    style={{ opacity: 0, transformOrigin: "left center" }}
                  >
                    <div className="w-10 h-px bg-linear-to-r from-gray-600 to-gray-500" />
                    <ArrowRight className="w-4 h-4 text-gray-500 -ml-1" />
                    {/* Data pulse */}
                    <div className="data-pulse absolute left-0 top-1/2 -translate-y-1/2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 opacity-70" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: vertical flow */}
        <div className="md:hidden flex flex-col items-center gap-4">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            return (
              <div key={node.id} className="flex flex-col items-center gap-4">
                <div
                  className="arch-node group relative bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 w-56 text-center"
                  style={{ opacity: 0 }}
                >
                  <div className="relative z-10">
                    <div
                      className={`inline-flex p-3 rounded-xl bg-linear-to-br ${node.color}/10 mb-3 border border-gray-800`}
                    >
                      <Icon className={`w-6 h-6 ${node.iconColor}`} />
                    </div>
                    <h4 className="text-sm font-bold text-white mb-1">
                      {node.label}
                    </h4>
                    <p className="text-xs text-gray-500">{node.sublabel}</p>
                  </div>
                </div>
                {index < nodes.length - 1 && (
                  <div
                    className="arch-arrow flex flex-col items-center"
                    style={{ opacity: 0 }}
                  >
                    <div className="w-px h-6 bg-linear-to-b from-gray-600 to-gray-500" />
                    <ArrowRight className="w-4 h-4 text-gray-500 rotate-90 -mt-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info card below */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/50 border border-gray-800 rounded-full text-xs text-gray-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Real-time data flows through Redis with sub-millisecond latency
          </div>
        </div>
      </div>
    </div>
  );
}
