"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Package, Activity, BrainCircuit, ShieldCheck, LucideIcon } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface StepTheme {
  color: string;
  bg: string;
  border: string;
  hoverBorder: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotBg: string;
}

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  tags: string[];
  theme: StepTheme;
}

const steps: Step[] = [
  {
    icon: Package,
    step: "01",
    title: "Connect the In-Process Middleware",
    description:
      "Add the lightweight middleware to your FastAPI, Express, or Node service. It intercepts live request signals locally with sub-millisecond execution and zero extra network hops.",
    tags: ["TypeScript & Python SDK", "<0.4ms overhead", "Zero network hops"],
    theme: {
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/25",
      hoverBorder: "hover:border-cyan-500/40",
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-500/30",
      badgeText: "text-cyan-300",
      dotBg: "bg-cyan-400",
    },
  },
  {
    icon: Activity,
    step: "02",
    title: "Stream In-Memory Telemetry",
    description:
      "Tracks rolling P95/P99 latency, error rates, and request concurrency directly inside process memory, asynchronously syncing cluster state with Redis in the background.",
    tags: ["Sliding-window metrics", "In-memory state", "Async Redis sync"],
    theme: {
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/25",
      hoverBorder: "hover:border-emerald-500/40",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      badgeText: "text-emerald-300",
      dotBg: "bg-emerald-400",
    },
  },
  {
    icon: BrainCircuit,
    step: "03",
    title: "AI Anomaly Reasoning & Tuning",
    description:
      "Gemini AI analyzes background telemetry streams via RabbitMQ to detect silent latency drifts, locate failure points, and dynamically suggest optimal decision thresholds.",
    tags: ["RabbitMQ queues", "Gemini 2.5 AI", "Zero runtime blocking"],
    theme: {
      color: "text-violet-400",
      bg: "bg-violet-500/10",
      border: "border-violet-500/25",
      hoverBorder: "hover:border-violet-500/40",
      badgeBg: "bg-violet-500/10",
      badgeBorder: "border-violet-500/30",
      badgeText: "text-violet-300",
      dotBg: "bg-violet-400",
    },
  },
  {
    icon: ShieldCheck,
    step: "04",
    title: "Instant Decision Enforcement",
    description:
      "Your application receives instant verdicts—fail-open circuit tripping, dynamic timeouts, or rate limits—executing decisions at wire speed to maintain total system uptime.",
    tags: ["Fail-open guarantees", "Local enforcement", "Autonomous recovery"],
    theme: {
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
      hoverBorder: "hover:border-amber-500/40",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/30",
      badgeText: "text-amber-300",
      dotBg: "bg-amber-400",
    },
  },
];

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon;

  return (
    <div
      className={`rounded-xl bg-[#090d16]/90 border ${step.theme.border} ${step.theme.hoverBorder} p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between shadow-md backdrop-blur-md group`}
    >
      <div>
        {/* Header with Icon and Phase Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className={`p-2 rounded-lg ${step.theme.bg} border ${step.theme.badgeBorder}`}>
            <Icon className={`w-4 h-4 ${step.theme.color}`} />
          </div>
          <span
            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${step.theme.badgeBg} border ${step.theme.badgeBorder} ${step.theme.badgeText}`}
          >
            PHASE {step.step}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-base sm:text-lg font-sans font-semibold text-white mb-2 tracking-tight">
          {step.title}
        </h3>
        <p className="text-xs sm:text-sm font-sans text-slate-300 leading-relaxed mb-4">
          {step.description}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
        {step.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-mono text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading entrance
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );

      // Timeline cards entrance
      const stepCards = sectionRef.current?.querySelectorAll(".step-card");
      stepCards?.forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              once: true,
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-24 relative z-10 max-w-[1152px] mx-auto px-4 sm:px-6">
      {/* Section heading */}
      <div ref={headingRef} className="text-center mb-16" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-medium">
            Runtime Lifecycle
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-semibold font-sans text-white tracking-tight mb-3 text-balance">
          From live traffic signals to instant runtime decisions.
        </h2>
        <p className="text-sm sm:text-base font-sans text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
          A zero-overhead in-process decision loop backed by decoupled control plane intelligence, designed to keep your APIs stable under peak loads.
        </p>
      </div>

      {/* Vertical Timeline */}
      <div className="relative max-w-3xl mx-auto">
        {/* Central Vertical Timeline Line */}
        <div className="absolute left-4 md:left-1/2 top-4 bottom-4 -translate-x-1/2 w-px bg-white/10" />

        {/* Steps */}
        <div className="space-y-10 sm:space-y-12">
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={step.step}
                className={`step-card relative flex items-start gap-6 sm:gap-10 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                }`}
                style={{ opacity: 0 }}
              >
                {/* Domain Timeline Node Ball */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 top-5 z-10 flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-full bg-[#070a12] border ${step.theme.badgeBorder} flex items-center justify-center shadow-sm`}>
                    <span className={`w-2 h-2 rounded-full ${step.theme.dotBg}`} />
                  </div>
                </div>

                {/* Card Container */}
                <div
                  className={`flex-1 pl-10 md:pl-0 ${
                    isEven ? "md:pr-10" : "md:pl-10"
                  }`}
                >
                  <StepCard step={step} />
                </div>

                {/* Empty side spacer for desktop 2-column balance */}
                <div className="hidden md:block flex-1" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
