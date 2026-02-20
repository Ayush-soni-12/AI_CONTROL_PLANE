"use client";

import { useRef } from "react";
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
  LucideIcon,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
  gradient: string;
  iconColor: string;
}

const features: Feature[] = [
  {
    icon: Database,
    title: "Smart Caching",
    description:
      "AI-driven response caching with automatic invalidation and Redis-backed storage.",
    details: [
      "Redis-backed storage",
      "Auto cache invalidation",
      "Per-endpoint policies",
    ],
    gradient: "from-blue-500 to-cyan-500",
    iconColor: "text-blue-400",
  },
  {
    icon: ShieldAlert,
    title: "Circuit Breaker",
    description:
      "Automatic failure detection with graceful degradation and intelligent auto-recovery.",
    details: [
      "Failure threshold detection",
      "Graceful degradation",
      "Auto-recovery",
    ],
    gradient: "from-red-500 to-orange-500",
    iconColor: "text-red-400",
  },
  {
    icon: Gauge,
    title: "Rate Limiting",
    description:
      "Intelligent per-user and per-endpoint throttling with priority-based access.",
    details: [
      "Per-user / per-IP limits",
      "Priority-based access",
      "Sliding window algorithm",
    ],
    gradient: "from-purple-500 to-pink-500",
    iconColor: "text-purple-400",
  },
  {
    icon: Clock,
    title: "Queue Deferral",
    description:
      "Smart request queueing under heavy load with priority-based scheduling.",
    details: [
      "Request queuing",
      "Priority scheduling",
      "Backpressure handling",
    ],
    gradient: "from-amber-500 to-yellow-500",
    iconColor: "text-amber-400",
  },
  {
    icon: ShieldOff,
    title: "Load Shedding",
    description:
      "Graceful overload protection that intelligently drops low-priority requests.",
    details: [
      "Overload protection",
      "Smart request dropping",
      "Service preservation",
    ],
    gradient: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-400",
  },
  {
    icon: Brain,
    title: "AI Insights",
    description:
      "Gemini-powered analysis with dynamic threshold tuning and anomaly detection.",
    details: ["Gemini AI analysis", "Dynamic thresholds", "Anomaly detection"],
    gradient: "from-violet-500 to-purple-500",
    iconColor: "text-violet-400",
  },
];

export function FeatureShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading animation
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

      // Cards stagger animation — alternating directions
      const cards = sectionRef.current?.querySelectorAll(".feature-card");
      cards?.forEach((card, index) => {
        const fromLeft = index % 2 === 0;
        gsap.fromTo(
          card,
          {
            opacity: 0,
            x: fromLeft ? -60 : 60,
            y: 30,
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            duration: 0.8,
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
    <div ref={sectionRef} className="mb-28">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-14"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-sm font-semibold text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full mb-4 border border-purple-500/20">
          BUILT-IN FEATURES
        </span>
        <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Everything You Need to{" "}
          <span className="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Control
          </span>{" "}
          Your Services
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Six powerful features working together, all managed by AI, tuned in
          real-time
        </p>
      </div>

      {/* Features grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="feature-card group relative bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-500/40 transition-all duration-300 hover:-translate-y-1"
              style={{ opacity: 0 }}
            >
              {/* Hover glow */}
              <div
                className={`absolute inset-0 bg-linear-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl`}
              />

              <div className="relative z-10">
                {/* Icon */}
                <div
                  className={`inline-flex p-3 rounded-xl bg-linear-to-br ${feature.gradient}/10 border border-gray-800 group-hover:border-gray-700 transition-colors mb-4`}
                >
                  <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Detail pills */}
                <div className="feature-details flex flex-wrap gap-2">
                  {feature.details.map((detail) => (
                    <span
                      key={detail}
                      className="detail-pill text-xs font-medium px-3 py-1 rounded-full bg-gray-800/80 text-gray-400 border border-gray-700/50"
                      style={{ opacity: 0 }}
                    >
                      {detail}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
