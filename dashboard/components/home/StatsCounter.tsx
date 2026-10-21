"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, Zap, Bot, Cpu } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const stats = [
  {
    value: 0.4,
    prefix: "<",
    suffix: "ms",
    label: "Decision Latency",
    subtext: "Sub-millisecond P99 telemetry",
    icon: Zap,
    decimals: 1,
    colorClass: "text-cyan-400",
    iconBoxClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    cardBorder: "border-cyan-500/20 hover:border-cyan-500/40",
  },
  {
    value: 99.99,
    suffix: "%",
    label: "High Availability SLA",
    subtext: "Guaranteed uptime threshold",
    icon: ShieldCheck,
    decimals: 2,
    colorClass: "text-emerald-400",
    iconBoxClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cardBorder: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    value: 24,
    suffix: "/7",
    label: "Autonomous Defense",
    subtext: "Continuous feedback loop",
    icon: Bot,
    decimals: 0,
    colorClass: "text-violet-300",
    iconBoxClass: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    cardBorder: "border-violet-500/20 hover:border-violet-500/40",
  },
  {
    value: 100,
    suffix: "%",
    label: "Fail-Open Resilience",
    subtext: "Zero runtime blocking overhead",
    icon: Cpu,
    decimals: 0,
    colorClass: "text-amber-300",
    iconBoxClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    cardBorder: "border-amber-500/20 hover:border-amber-500/40",
  },
];

export function StatsCounter() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const counters = sectionRef.current?.querySelectorAll(".stat-value");

      counters?.forEach((counter, index) => {
        const target = parseFloat(counter.getAttribute("data-target") || "0");
        const decimals = parseInt(counter.getAttribute("data-decimals") || "0");
        const prefix = counter.getAttribute("data-prefix") || "";
        const suffix = counter.getAttribute("data-suffix") || "";

        const obj = { val: 0 };

        gsap.to(obj, {
          val: target,
          duration: 1.2,
          delay: index * 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: counter,
            start: "top 90%",
            once: true,
          },
          onUpdate: () => {
            counter.textContent = prefix + obj.val.toFixed(decimals) + suffix;
          },
        });
      });

      // Subtle entrance reveal (at most 8px, 300ms)
      gsap.fromTo(
        ".stat-card",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 90%",
            once: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <div
      ref={sectionRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20 max-w-[1152px] mx-auto relative z-10"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className={`stat-card p-5 rounded-xl bg-[#091020] border ${stat.cardBorder} transition-colors flex flex-col justify-between`}
            style={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-sans font-medium text-slate-400 uppercase tracking-wider">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-lg border ${stat.iconBoxClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div
              className={`stat-value text-3xl sm:text-4xl font-semibold font-mono tracking-tight tabular-nums ${stat.colorClass}`}
              data-target={stat.value}
              data-decimals={stat.decimals}
              data-prefix={stat.prefix || ""}
              data-suffix={stat.suffix || ""}
            >
              0
            </div>

            <div className="text-xs text-slate-400 mt-2 font-sans">
              {stat.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}


