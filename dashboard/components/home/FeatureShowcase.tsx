"use client";

import React, { useRef } from "react";
import Link from "next/link";
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
  ArrowRight,
  LucideIcon,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface FeatureTheme {
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  hoverBorder: string;
}

interface Feature {
  icon: LucideIcon;
  title: string;
  badge: string;
  description: string;
  keywords: string[];
  theme: FeatureTheme;
}

const features: Feature[] = [
  {
    icon: Database,
    title: "Smart Caching",
    badge: "SUB-MS CACHE",
    description: "Returns hot read responses from in-memory cache & Redis with zero network hops on cache hit.",
    keywords: ["Redis-backed", "Auto invalidation", "Per-route TTL", "<0.4ms hit"],
    theme: {
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      iconBorder: "border-emerald-500/30",
      badgeColor: "text-emerald-300",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/30",
      hoverBorder: "hover:border-emerald-500/40",
    },
  },
  {
    icon: ShieldAlert,
    title: "Circuit Breaker",
    badge: "FAIL-OPEN TRIP",
    description: "Trips fail-open state when error thresholds exceed tolerance, preventing cascading downstream collapse.",
    keywords: ["Error thresholds", "Graceful fallback", "Self-healing probes", "Fail-open"],
    theme: {
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/30",
      badgeColor: "text-amber-300",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/40",
    },
  },
  {
    icon: Gauge,
    title: "Rate Limiting",
    badge: "TOKEN BUCKET",
    description: "Atomic sliding window counters enforce per-caller quotas across IP, tenant, and autonomous agent tiers.",
    keywords: ["Token bucket", "Per-caller quotas", "x-agent-id tiers", "Zero locks"],
    theme: {
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
      iconBorder: "border-amber-500/30",
      badgeColor: "text-amber-300",
      badgeBg: "bg-amber-500/10",
      badgeBorder: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/40",
    },
  },
  {
    icon: Clock,
    title: "Queue Deferral",
    badge: "AMQP BUFFERING",
    description: "Smooths sudden traffic bursts by diverting asynchronous workloads to RabbitMQ priority queues.",
    keywords: ["RabbitMQ routing", "Burst smoothing", "Backpressure", "Async AMQP"],
    theme: {
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
      iconBorder: "border-blue-500/30",
      badgeColor: "text-blue-300",
      badgeBg: "bg-blue-500/10",
      badgeBorder: "border-blue-500/30",
      hoverBorder: "hover:border-blue-500/40",
    },
  },
  {
    icon: ShieldOff,
    title: "Load Shedding",
    badge: "PRIORITY SHED",
    description: "Sheds lower-priority background tasks under heavy CPU/RAM pressure to preserve critical user SLAs.",
    keywords: ["SLA preservation", "CPU/RAM triggers", "Drop policies", "Triage headers"],
    theme: {
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10",
      iconBorder: "border-rose-500/30",
      badgeColor: "text-rose-300",
      badgeBg: "bg-rose-500/10",
      badgeBorder: "border-rose-500/30",
      hoverBorder: "hover:border-rose-500/40",
    },
  },
  {
    icon: Brain,
    title: "AI Insights",
    badge: "GEMINI REASONING",
    description: "Gemini 2.5 background workers evaluate cluster signals, flag anomaly drift, and suggest tuned thresholds.",
    keywords: ["Gemini reasoning", "Latency drift alerts", "Dynamic thresholds", "Anomaly score"],
    theme: {
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
      iconBorder: "border-violet-500/30",
      badgeColor: "text-violet-300",
      badgeBg: "bg-violet-500/10",
      badgeBorder: "border-violet-500/30",
      hoverBorder: "hover:border-violet-500/40",
    },
  },
  {
    icon: Timer,
    title: "Adaptive Timeout",
    badge: "DYNAMIC P99",
    description: "Calculates dynamic p99 deadline budgets with jitter calibration to abort hung requests immediately.",
    keywords: ["Rolling p99", "Anti-hang guard", "Dynamic deadlines", "Instant abort"],
    theme: {
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
      iconBorder: "border-cyan-500/30",
      badgeColor: "text-cyan-300",
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-500/30",
      hoverBorder: "hover:border-cyan-500/40",
    },
  },
  {
    icon: GitPullRequest,
    title: "Request Coalescing",
    badge: "SINGLE-FLIGHT",
    description: "Collapses concurrent duplicate requests into a single-flight execution to kill thundering herds.",
    keywords: ["Single-flight exec", "Deduplication", "Zero thundering herd", "Shared response"],
    theme: {
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10",
      iconBorder: "border-cyan-500/30",
      badgeColor: "text-cyan-300",
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-500/30",
      hoverBorder: "hover:border-cyan-500/40",
    },
  },
  {
    icon: Flag,
    title: "Feature Flag Engine",
    badge: "RUNTIME TOGGLES",
    description: "Dynamically flips kill-switches, rolls out canary traffic, and targets tenants without service redeployment.",
    keywords: ["Instant kill-switch", "Canary rollouts", "Tenant targeting", "Zero redeploy"],
    theme: {
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
      iconBorder: "border-violet-500/30",
      badgeColor: "text-violet-300",
      badgeBg: "bg-violet-500/10",
      badgeBorder: "border-violet-500/30",
      hoverBorder: "hover:border-violet-500/40",
    },
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <div
      className={`feature-card rounded-xl bg-[#090d16]/90 border border-white/10 ${feature.theme.hoverBorder} p-5 transition-all duration-200 flex flex-col justify-between shadow-md backdrop-blur-md group`}
    >
      <div>
        {/* Header with Icon and Category Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div
            className={`p-2 rounded-lg ${feature.theme.iconBg} ${feature.theme.iconBorder} border`}
          >
            <Icon className={`w-4 h-4 ${feature.theme.iconColor}`} />
          </div>
          <span
            className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded ${feature.theme.badgeBg} ${feature.theme.badgeBorder} border ${feature.theme.badgeColor}`}
          >
            {feature.badge}
          </span>
        </div>

        {/* Feature Title */}
        <h3 className="text-base font-sans font-semibold text-white mb-1.5 tracking-tight">
          {feature.title}
        </h3>

        {/* 1-Line Concrete Technical Description */}
        <p className="text-xs font-sans text-slate-300 leading-relaxed mb-4">
          {feature.description}
        </p>
      </div>

      {/* Keywords / Technical Tags */}
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/10">
        {feature.keywords.map((kw) => (
          <span
            key={kw}
            className="text-[10px] font-mono text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-normal"
          >
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Subtle entrance for heading
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

      // Subtle entrance for cards
      const cards = sectionRef.current?.querySelectorAll(".feature-card");
      if (cards && cards.length > 0) {
        gsap.fromTo(
          cards,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.04,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 85%",
              once: true,
            },
          },
        );
      }
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="py-24 relative z-10 max-w-[1152px] mx-auto px-4 sm:px-6">
      {/* Section heading */}
      <div ref={headingRef} className="text-center mb-12" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-medium">
            Decision Policies
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-semibold font-sans text-white tracking-tight mb-3 text-balance">
          Autonomous decisions for your runtime traffic.
        </h2>
        <p className="text-sm sm:text-base font-sans text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
          NeuralControl evaluates live telemetry signals to return instant, sub-millisecond execution decisions that your services act on directly.
        </p>
      </div>

      {/* 9 Compact Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </div>

      {/* Documentation link */}
      <div className="mt-8 text-center">
        <Link
          href="/dashboard/docs"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>See documentation for middleware integration &amp; policy rules</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
