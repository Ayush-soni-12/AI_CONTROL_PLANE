"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const stats = [
  { value: 99.9, suffix: "%", label: "Uptime SLA", decimals: 1 },
  {
    value: 10,
    prefix: "<",
    suffix: "ms",
    label: "Decision Latency",
    decimals: 0,
  },
  { value: 24, suffix: "/7", label: "AI Monitoring", decimals: 0 },
  { value: 6, suffix: "+", label: "Control Features", decimals: 0 },
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
          duration: 2,
          delay: index * 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: counter,
            start: "top 85%",
            once: true,
          },
          onUpdate: () => {
            counter.textContent = prefix + obj.val.toFixed(decimals) + suffix;
          },
        });
      });

      // Animate the cards
      gsap.fromTo(
        ".stat-card",
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
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
      className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-28"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="stat-card group relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 text-center hover:border-purple-500/30 transition-all duration-300"
          style={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-linear-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <div
              className="stat-value text-4xl sm:text-5xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2"
              data-target={stat.value}
              data-decimals={stat.decimals}
              data-prefix={stat.prefix || ""}
              data-suffix={stat.suffix || ""}
            >
              0
            </div>
            <div className="text-gray-400 text-sm font-medium">
              {stat.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
