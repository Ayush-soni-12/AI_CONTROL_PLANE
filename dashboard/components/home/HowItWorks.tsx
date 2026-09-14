"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Package, Radar, BrainCircuit, Settings2, LucideIcon } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  color: string;
  iconColor: string;
  border: string;
  glow: string;
  shadow: string;
  floatDelay: string;
  floatDuration: string;
}

const steps: Step[] = [
  {
    icon: Package,
    step: "01",
    title: "Embed the Zero-Config SDK",
    description:
      "Install our lightweight TypeScript/Node.js or Python SDK into your microservices. Auto-intercepts signals with sub-millisecond overhead.",
    color: "from-cyan-400 to-blue-500",
    iconColor: "text-cyan-400",
    border: "border-cyan-500/30 group-hover:border-cyan-400/80",
    glow: "rgba(0, 240, 255, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(0,240,255,0.22)]",
    floatDelay: "0s",
    floatDuration: "4.8s",
  },
  {
    icon: Radar,
    step: "02",
    title: "Real-Time Topology Discovery",
    description:
      "Endpoints, dependencies, and agent interactions are automatically discovered. The control plane constructs an active live mesh map instantly.",
    color: "from-teal-400 to-emerald-400",
    iconColor: "text-teal-400",
    border: "border-teal-500/30 group-hover:border-teal-400/80",
    glow: "rgba(20, 184, 166, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(20,184,166,0.22)]",
    floatDelay: "0.8s",
    floatDuration: "5.1s",
  },
  {
    icon: BrainCircuit,
    step: "03",
    title: "AI Continuous Anomaly Engine",
    description:
      "Gemini AI continuously ingests latency percentiles, error rates, and traffic signals, dynamically calibrating trip thresholds and detecting anomalies.",
    color: "from-emerald-400 to-cyan-400",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/30 group-hover:border-emerald-400/80",
    glow: "rgba(16, 185, 129, 0.22)",
    shadow: "shadow-[0_0_35px_rgba(16,185,129,0.22)]",
    floatDelay: "0.4s",
    floatDuration: "4.6s",
  },
  {
    icon: Settings2,
    step: "04",
    title: "Autonomous Decision Execution",
    description:
      "Smart caching, circuit tripping, priority rate limits, and load shedding are applied autonomously at wire speed without human intervention.",
    color: "from-amber-400 to-cyan-400",
    iconColor: "text-amber-400",
    border: "border-amber-500/30 group-hover:border-amber-400/80",
    glow: "rgba(245, 158, 11, 0.2)",
    shadow: "shadow-[0_0_35px_rgba(245,158,11,0.2)]",
    floatDelay: "1.2s",
    floatDuration: "5.0s",
  },
];

function InteractiveStepCard({
  step,
  isEven,
}: {
  step: Step;
  isEven: boolean;
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

    const rotateX = ((y - centerY) / centerY) * -11;
    const rotateY = ((x - centerX) / centerX) * 11;
    const translateX = ((x - centerX) / centerX) * 6;
    const translateY = ((y - centerY) / centerY) * 6;

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

  const Icon = step.icon;

  return (
    <div className="perspective-[1000px] w-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative rounded-2xl p-6 select-none bg-[#091122]/90 backdrop-blur-xl border ${step.border} transition-all ${
          tilt.isHovered
            ? `${step.shadow} z-20`
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
            ? `floatKeyframe ${step.floatDuration} ease-in-out infinite`
            : "none",
          animationDelay: step.floatDelay,
        }}
      >
        {/* Dynamic Cursor-Tracking Holographic Radial Spotlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered ? 1 : 0,
            background: `radial-gradient(280px circle at ${tilt.mouseX}px ${tilt.mouseY}px, ${step.glow}, transparent 75%)`,
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
            transform: tilt.isHovered ? "translateZ(28px)" : "translateZ(0px)",
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          <div
            className={`flex items-center gap-3 mb-3 ${
              isEven ? "md:flex-row-reverse" : ""
            }`}
          >
            <div className="inline-flex p-2.5 rounded-xl bg-[#070a13] border border-slate-800 shadow-inner group-hover:scale-110 transition-transform duration-300">
              <Icon className={`w-5 h-5 ${step.iconColor}`} />
            </div>
            <span
              className={`text-xs font-mono font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}
            >
              PHASE {step.step}
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors duration-200">
            {step.title}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useGSAP(
    () => {
      // Heading
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

      // Timeline line draw
      if (lineRef.current) {
        const lineLength = lineRef.current.getTotalLength();
        gsap.set(lineRef.current, {
          strokeDasharray: lineLength,
          strokeDashoffset: lineLength,
        });

        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          duration: 2,
          ease: "none",
          scrollTrigger: {
            trigger: ".timeline-container",
            start: "top 75%",
            end: "bottom 50%",
            scrub: 1,
          },
        });
      }

      // Step cards
      const stepCards = sectionRef.current?.querySelectorAll(".step-card");
      stepCards?.forEach((card, index) => {
        gsap.fromTo(
          card,
          { opacity: 0, x: index % 2 === 0 ? -40 : 40, y: 20 },
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

        // Step dot pulse
        const dot = card.querySelector(".step-dot");
        if (dot) {
          gsap.fromTo(
            dot,
            { scale: 0, opacity: 0 },
            {
              scale: 1,
              opacity: 1,
              duration: 0.6,
              ease: "back.out(2)",
              scrollTrigger: {
                trigger: card,
                start: "top 80%",
                once: true,
              },
            },
          );
        }
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mb-28 relative z-10">
      {/* Section heading */}
      <div
        ref={headingRef}
        className="text-center mb-16"
        style={{ opacity: 0 }}
      >
        <span className="inline-block text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full mb-3 border border-emerald-500/30 shadow-[0_0_12px_rgba(0,230,153,0.15)]">
          AUTONOMOUS LIFECYCLE
        </span>
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
          From Integration to{" "}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Self-Healing Control
          </span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
          Four automated steps that protect your services from cascade failures, latency spikes, and unexpected traffic floods
        </p>
      </div>

      {/* Timeline */}
      <div className="timeline-container relative max-w-3xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 md:-translate-x-px w-px hidden sm:block">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 1 100"
            style={{ height: "100%" }}
          >
            <line
              ref={lineRef}
              x1="0.5"
              y1="0"
              x2="0.5"
              y2="100"
              stroke="url(#lineGradient)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="#00f0ff"
                  stopOpacity="0.9"
                />
                <stop
                  offset="50%"
                  stopColor="#00e699"
                  stopOpacity="0.9"
                />
                <stop
                  offset="100%"
                  stopColor="#3b82f6"
                  stopOpacity="0.9"
                />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Steps */}
        <div className="space-y-12 sm:space-y-16">
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={step.step}
                className={`step-card relative flex items-start gap-6 sm:gap-8 ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                }`}
                style={{ opacity: 0 }}
              >
                {/* Dot on timeline */}
                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 hidden sm:flex">
                  <div
                    className="step-dot relative flex items-center justify-center"
                    style={{ opacity: 0 }}
                  >
                    <span
                      className={`absolute w-8 h-8 rounded-full bg-gradient-to-br ${step.color} opacity-20 animate-ping`}
                    />
                    <span
                      className={`relative w-4 h-4 rounded-full bg-gradient-to-br ${step.color} shadow-[0_0_10px_rgba(0,240,255,0.6)]`}
                    />
                  </div>
                </div>

                {/* Card */}
                <div
                  className={`flex-1 sm:pl-16 md:pl-0 ${
                    isEven ? "md:pr-12 md:text-right" : "md:pl-12"
                  } ${isEven ? "md:ml-0" : "md:mr-0"}`}
                >
                  <InteractiveStepCard step={step} isEven={isEven} />
                </div>

                {/* Spacer for the other side */}
                <div className="hidden md:block flex-1" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


