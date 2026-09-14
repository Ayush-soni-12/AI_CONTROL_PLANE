"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShieldCheck, Zap, Bot, Cpu } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const stats = [
  {
    value: 99.99,
    suffix: "%",
    label: "High Availability SLA",
    badge: "SLA GUARANTEED",
    icon: ShieldCheck,
    decimals: 2,
    color: "cyan",
    floatDelay: "0s",
    floatDuration: "4.2s",
  },
  {
    value: 0.8,
    prefix: "<",
    suffix: "ms",
    label: "Telemetry Latency",
    badge: "SUB-MILLISECOND",
    icon: Zap,
    decimals: 1,
    color: "emerald",
    floatDelay: "0.8s",
    floatDuration: "4.8s",
  },
  {
    value: 24,
    suffix: "/7",
    label: "Autonomous AI Loop",
    badge: "GEMINI 2.5 FLASH",
    icon: Bot,
    decimals: 0,
    color: "purple",
    floatDelay: "1.4s",
    floatDuration: "5.1s",
  },
  {
    value: 9,
    suffix: "+",
    label: "Protection Engines",
    badge: "FAIL-OPEN MESH",
    icon: Cpu,
    decimals: 0,
    color: "amber",
    floatDelay: "0.4s",
    floatDuration: "4.5s",
  },
];

function InteractiveTiltCard({
  stat,
  index,
}: {
  stat: (typeof stats)[0];
  index: number;
}) {
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

    // Interactive 3D tilt angles (max ~14 degrees)
    const rotateX = ((y - centerY) / centerY) * -14;
    const rotateY = ((x - centerX) / centerX) * 14;

    // Subtle magnetic translation towards cursor
    const translateX = ((x - centerX) / centerX) * 8;
    const translateY = ((y - centerY) / centerY) * 8;

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

  const Icon = stat.icon;

  const colorStyles = {
    cyan: {
      text: "from-cyan-300 via-teal-300 to-emerald-400",
      border: "border-cyan-500/30 group-hover:border-cyan-400/80",
      glow: "rgba(0, 240, 255, 0.22)",
      shadow: "shadow-[0_0_30px_rgba(0,240,255,0.25)]",
      badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      iconColor: "text-cyan-400",
    },
    emerald: {
      text: "from-emerald-300 via-teal-300 to-cyan-400",
      border: "border-emerald-500/30 group-hover:border-emerald-400/80",
      glow: "rgba(0, 230, 153, 0.22)",
      shadow: "shadow-[0_0_30px_rgba(0,230,153,0.25)]",
      badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    purple: {
      text: "from-purple-300 via-pink-300 to-violet-400",
      border: "border-purple-500/30 group-hover:border-purple-400/80",
      glow: "rgba(168, 85, 247, 0.25)",
      shadow: "shadow-[0_0_30px_rgba(168,85,247,0.25)]",
      badge: "bg-purple-500/10 text-purple-300 border-purple-500/30",
      iconColor: "text-purple-400",
    },
    amber: {
      text: "from-amber-300 via-orange-300 to-yellow-400",
      border: "border-amber-500/30 group-hover:border-amber-400/80",
      glow: "rgba(245, 158, 11, 0.22)",
      shadow: "shadow-[0_0_30px_rgba(245,158,11,0.25)]",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      iconColor: "text-amber-400",
    },
  }[stat.color as "cyan" | "emerald" | "purple" | "amber"];

  return (
    <div
      className="stat-card perspective-[1000px] w-full"
      style={{
        opacity: 0,
      }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative rounded-2xl p-6 sm:p-7 text-center cursor-pointer select-none bg-[#091122]/90 backdrop-blur-xl border ${colorStyles.border} transition-all ${
          tilt.isHovered
            ? `${colorStyles.shadow} z-20`
            : "border-blue-500/15 hover:border-cyan-500/40"
        }`}
        style={{
          transformStyle: "preserve-3d",
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translate3d(${tilt.translateX}px, ${tilt.translateY}px, 24px) scale3d(1.05, 1.05, 1.05)`
            : "perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px) scale3d(1, 1, 1)",
          transition: tilt.isHovered
            ? "transform 0.08s ease-out, border-color 0.2s, box-shadow 0.2s"
            : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s, box-shadow 0.4s",
          animation: !tilt.isHovered
            ? `floatKeyframe ${stat.floatDuration} ease-in-out infinite`
            : "none",
          animationDelay: stat.floatDelay,
        }}
      >
        {/* Dynamic Cursor-Tracking Holographic Radial Spotlight Glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered ? 1 : 0,
            background: `radial-gradient(280px circle at ${tilt.mouseX}px ${tilt.mouseY}px, ${colorStyles.glow}, transparent 75%)`,
          }}
        />

        {/* Ambient Subtle Cyber Shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Corner Cyber Crosshairs */}
        <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 border-t border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 border-t border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 border-b border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 border-b border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />

        {/* 3D Popping Content Layer */}
        <div
          className="relative flex flex-col items-center justify-center space-y-2"
          style={{
            transform: tilt.isHovered ? "translateZ(36px)" : "translateZ(0px)",
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          {/* Top Micro Badge & Icon */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono uppercase tracking-wider mb-1 backdrop-blur-md transition-transform group-hover:scale-105 duration-200">
            <Icon className={`w-3.5 h-3.5 ${colorStyles.iconColor}`} />
            <span className={colorStyles.badge}>{stat.badge}</span>
          </div>

          {/* Animated Numeric Counter */}
          <div
            className={`stat-value text-3xl sm:text-4xl lg:text-5xl font-black font-mono bg-gradient-to-r ${colorStyles.text} bg-clip-text text-transparent drop-shadow-sm tracking-tight`}
            data-target={stat.value}
            data-decimals={stat.decimals}
            data-prefix={stat.prefix || ""}
            data-suffix={stat.suffix || ""}
          >
            0
          </div>

          {/* Stat Label */}
          <div className="text-slate-300 group-hover:text-white text-xs sm:text-sm font-semibold font-mono uppercase tracking-wider transition-colors duration-200">
            {stat.label}
          </div>
        </div>
      </div>
    </div>
  );
}

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
          delay: index * 0.12,
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

      // Reveal the cards
      gsap.fromTo(
        ".stat-card",
        { opacity: 0, y: 35, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.75,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-28 relative z-10"
    >
      <style jsx global>{`
        @keyframes floatKeyframe {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(0.4deg);
          }
        }
      `}</style>
      {stats.map((stat, index) => (
        <InteractiveTiltCard key={stat.label} stat={stat} index={index} />
      ))}
    </div>
  );
}


