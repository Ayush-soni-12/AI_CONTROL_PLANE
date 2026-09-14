"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Database,
  ShieldAlert,
  Gauge,
  Clock,
  ShieldOff,
  Brain,
  Timer,
  GitPullRequest,
  Flag,
  LucideIcon,
  Sparkles,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Feature {
  icon: LucideIcon;
  title: string;
  badge: string;
  description: string;
  details: string[];
  color: "cyan" | "amber" | "blue" | "violet" | "emerald" | "purple" | "sky" | "teal" | "rose";
  floatDelay: string;
  floatDuration: string;
}

const features: Feature[] = [
  {
    icon: Database,
    title: "Smart Caching",
    badge: "SUB-MS STATE",
    description:
      "AI-driven response caching with automatic invalidation and Redis-backed high performance storage.",
    details: [
      "Redis-backed storage",
      "Auto cache invalidation",
      "Per-endpoint policies",
    ],
    color: "cyan",
    floatDelay: "0s",
    floatDuration: "4.5s",
  },
  {
    icon: ShieldAlert,
    title: "Circuit Breaker",
    badge: "FAIL-OPEN TRIP",
    description:
      "Automatic failure detection with graceful degradation, adaptive tripping, and intelligent auto-recovery.",
    details: [
      "Failure threshold detection",
      "Graceful degradation",
      "Self-healing probes",
    ],
    color: "amber",
    floatDelay: "0.6s",
    floatDuration: "5.0s",
  },
  {
    icon: Gauge,
    title: "Rate Limiting",
    badge: "SLIDING WINDOW",
    description:
      "Intelligent per-user, per-IP and per-endpoint throttling with priority token bucket scheduling.",
    details: [
      "Per-user / IP limits",
      "Priority-based access",
      "Sliding window algorithm",
    ],
    color: "blue",
    floatDelay: "1.2s",
    floatDuration: "4.8s",
  },
  {
    icon: Clock,
    title: "Queue Deferral",
    badge: "AMQP DEFERRAL",
    description:
      "Smart asynchronous request queueing under heavy load with priority-based worker scheduling.",
    details: [
      "Request queuing",
      "Priority scheduling",
      "Backpressure handling",
    ],
    color: "violet",
    floatDelay: "0.3s",
    floatDuration: "5.2s",
  },
  {
    icon: ShieldOff,
    title: "Load Shedding",
    badge: "PRIORITY SHED",
    description:
      "Graceful overload protection that intelligently drops low-priority requests during traffic surges.",
    details: [
      "Overload protection",
      "Smart request dropping",
      "Core preservation",
    ],
    color: "emerald",
    floatDelay: "0.9s",
    floatDuration: "4.6s",
  },
  {
    icon: Brain,
    title: "AI Insights",
    badge: "GEMINI REASONING",
    description:
      "Gemini AI continuous analysis with dynamic threshold tuning, root cause localization, and anomaly alerts.",
    details: ["Gemini AI analysis", "Dynamic thresholds", "Anomaly detection"],
    color: "purple",
    floatDelay: "1.5s",
    floatDuration: "4.9s",
  },
  {
    icon: Timer,
    title: "Adaptive Timeout",
    badge: "LATENCY TAIL",
    description:
      "Dynamic request timeout that auto-adjusts based on real-time latency percentiles, preventing downstream hangs.",
    details: ["Latency-aware", "Auto-adjust", "Graceful abort"],
    color: "sky",
    floatDelay: "0.4s",
    floatDuration: "4.7s",
  },
  {
    icon: GitPullRequest,
    title: "Request Coalescing",
    badge: "ZERO THUNDERING",
    description:
      "Combines identical concurrent in-flight requests to eliminate duplicate queries and reduce backend pressure.",
    details: ["Deduplicate", "Batch responses", "Zero thundering herd"],
    color: "teal",
    floatDelay: "1.0s",
    floatDuration: "5.1s",
  },
  {
    icon: Flag,
    title: "Feature Flag Engine",
    badge: "INSTANT TOGGLE",
    description:
      "Fine-grained rollout control for microservice capabilities with percentage-based targeting and instant kill-switches.",
    details: ["Gradual rollout", "Targeted tenants", "Instant toggle"],
    color: "rose",
    floatDelay: "0.7s",
    floatDuration: "4.4s",
  },
];

const colorThemeMap = {
  cyan: {
    border: "border-cyan-500/25 group-hover:border-cyan-400/80",
    glow: "rgba(0, 240, 255, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(0,240,255,0.22)]",
    title: "group-hover:text-cyan-300",
    iconBg: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
    badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    pill: "border-slate-800 hover:border-cyan-500/40 hover:text-cyan-300",
  },
  amber: {
    border: "border-amber-500/25 group-hover:border-amber-400/80",
    glow: "rgba(245, 158, 11, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(245,158,11,0.22)]",
    title: "group-hover:text-amber-300",
    iconBg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    pill: "border-slate-800 hover:border-amber-500/40 hover:text-amber-300",
  },
  blue: {
    border: "border-blue-500/25 group-hover:border-blue-400/80",
    glow: "rgba(59, 130, 246, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(59,130,246,0.22)]",
    title: "group-hover:text-blue-300",
    iconBg: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    badge: "bg-blue-500/10 text-blue-300 border-blue-500/30",
    pill: "border-slate-800 hover:border-blue-500/40 hover:text-blue-300",
  },
  violet: {
    border: "border-violet-500/25 group-hover:border-violet-400/80",
    glow: "rgba(139, 92, 246, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(139,92,246,0.22)]",
    title: "group-hover:text-violet-300",
    iconBg: "bg-violet-500/10 border-violet-500/30 text-violet-400",
    badge: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    pill: "border-slate-800 hover:border-violet-500/40 hover:text-violet-300",
  },
  emerald: {
    border: "border-emerald-500/25 group-hover:border-emerald-400/80",
    glow: "rgba(16, 185, 129, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(16,185,129,0.22)]",
    title: "group-hover:text-emerald-300",
    iconBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    pill: "border-slate-800 hover:border-emerald-500/40 hover:text-emerald-300",
  },
  purple: {
    border: "border-purple-500/25 group-hover:border-purple-400/80",
    glow: "rgba(168, 85, 247, 0.24)",
    shadow: "shadow-[0_0_35px_rgba(168,85,247,0.24)]",
    title: "group-hover:text-purple-300",
    iconBg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    badge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    pill: "border-slate-800 hover:border-purple-500/40 hover:text-purple-300",
  },
  sky: {
    border: "border-sky-500/25 group-hover:border-sky-400/80",
    glow: "rgba(14, 165, 233, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(14,165,233,0.22)]",
    title: "group-hover:text-sky-300",
    iconBg: "bg-sky-500/10 border-sky-500/30 text-sky-400",
    badge: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    pill: "border-slate-800 hover:border-sky-500/40 hover:text-sky-300",
  },
  teal: {
    border: "border-teal-500/25 group-hover:border-teal-400/80",
    glow: "rgba(20, 184, 166, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(20,184,166,0.22)]",
    title: "group-hover:text-teal-300",
    iconBg: "bg-teal-500/10 border-teal-500/30 text-teal-400",
    badge: "bg-teal-500/10 text-teal-300 border-teal-500/30",
    pill: "border-slate-800 hover:border-teal-500/40 hover:text-teal-300",
  },
  rose: {
    border: "border-rose-500/25 group-hover:border-rose-400/80",
    glow: "rgba(244, 63, 94, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(244,63,94,0.22)]",
    title: "group-hover:text-rose-300",
    iconBg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    badge: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    pill: "border-slate-800 hover:border-rose-500/40 hover:text-rose-300",
  },
};

function InteractiveFeatureCard({ feature }: { feature: Feature }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({
    rotateX: 0,
    rotateY: 0,
    translateX: 0,
    translateY: 0,
    isHovered: false,
    mouseX: 50,
    mouseY: 50,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;

    const translateX = ((x - centerX) / centerX) * 7;
    const translateY = ((y - centerY) / centerY) * 7;

    setTilt({
      rotateX,
      rotateY,
      translateX,
      translateY,
      isHovered: true,
      mouseX: x,
      mouseY: y,
    });
  };

  const handleMouseLeave = () => {
    setTilt((prev) => ({
      ...prev,
      rotateX: 0,
      rotateY: 0,
      translateX: 0,
      translateY: 0,
      isHovered: false,
    }));
  };

  const Icon = feature.icon;
  const theme = colorThemeMap[feature.color];

  return (
    <div
      className="feature-card perspective-[1000px] w-full"
      style={{ opacity: 0 }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative rounded-2xl p-6 select-none bg-[#091122]/90 backdrop-blur-xl border ${theme.border} transition-all ${
          tilt.isHovered
            ? `${theme.shadow} z-20`
            : "border-blue-500/15 hover:border-cyan-500/40"
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translate3d(${tilt.translateX}px, ${tilt.translateY}px, 20px) scale3d(1.03, 1.03, 1.03)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
          transition: tilt.isHovered
            ? "transform 0.08s ease-out, border-color 0.2s, box-shadow 0.2s"
            : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s, box-shadow 0.4s",
          animation: !tilt.isHovered
            ? `floatKeyframe ${feature.floatDuration} ease-in-out infinite`
            : "none",
          animationDelay: feature.floatDelay,
        }}
      >
        {/* Dynamic Cursor-Tracking Holographic Radial Spotlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered ? 1 : 0,
            background: `radial-gradient(280px circle at ${tilt.mouseX}px ${tilt.mouseY}px, ${theme.glow}, transparent 75%)`,
          }}
        />

        {/* Ambient Subtle Shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Corner Cyber Crosshairs */}
        <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 border-t border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 border-t border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 border-b border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 border-b border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />

        {/* 3D Depth Layer */}
        <div
          className="relative z-10"
          style={{
            transform: tilt.isHovered ? "translateZ(30px)" : "translateZ(0px)",
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          {/* Header with Icon and Category Badge */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div
              className={`p-3 rounded-xl ${theme.iconBg} border shadow-inner group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border ${theme.badge} backdrop-blur-md`}
            >
              {feature.badge}
            </span>
          </div>

          {/* Title & Description */}
          <h3
            className={`text-lg font-bold text-white mb-2 ${theme.title} transition-colors duration-200 font-mono`}
          >
            {feature.title}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-4">
            {feature.description}
          </p>

          {/* Detail pills */}
          <div className="feature-details flex flex-wrap gap-1.5 pt-1">
            {feature.details.map((detail) => (
              <span
                key={detail}
                className={`detail-pill text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg bg-[#070d1a] text-slate-300 border ${theme.pill} transition-all duration-200`}
                style={{ opacity: 0 }}
              >
                {detail}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading animation
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

      // Cards stagger animation
      const cards = sectionRef.current?.querySelectorAll(".feature-card");
      cards?.forEach((card, index) => {
        const fromLeft = index % 2 === 0;
        gsap.fromTo(
          card,
          {
            opacity: 0,
            x: fromLeft ? -30 : 30,
            y: 20,
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
              once: true,
            },
          },
        );
      });

      // Animate detail pills inside cards
      const detailGroups =
        sectionRef.current?.querySelectorAll(".feature-details");
      detailGroups?.forEach((group) => {
        const pills = group.querySelectorAll(".detail-pill");
        gsap.fromTo(
          pills,
          { opacity: 0, scale: 0.8 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            stagger: 0.08,
            ease: "back.out(1.5)",
            scrollTrigger: {
              trigger: group,
              start: "top 90%",
              once: true,
            },
          },
        );
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mb-28 relative z-10">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-14"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-xs font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-3.5 py-1 rounded-full mb-3 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
          BUILT-IN RESILIENCE
        </span>
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
          Everything You Need to{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Govern
          </span>{" "}
          Your Microservices
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          High precision traffic mitigation pipelines managed autonomously by AI and executed at sub-millisecond speeds
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature) => (
          <InteractiveFeatureCard key={feature.title} feature={feature} />
        ))}
      </div>
    </div>
  );
}


