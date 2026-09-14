"use client";

import React, { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Zap, Server, Activity, Users, ArrowRight, Shield, Terminal, Check } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PLANS = [
  {
    key: "free",
    name: "Open Source Free",
    price: 0,
    period: "month",
    gradient: "from-slate-200 to-slate-400",
    border: "border-blue-500/20 group-hover:border-slate-500/80",
    glow: "rgba(148, 163, 184, 0.15)",
    shadow: "shadow-[0_0_35px_rgba(148,163,184,0.15)]",
    badgeBg: "bg-slate-800 text-slate-300 border-slate-700",
    features: [
      { icon: Server, text: "Unlimited self-hosted services" },
      { icon: Activity, text: "Unlimited local signals & cache" },
      { icon: Shield, text: "Autonomous circuit breakers & rate limits" },
      { icon: Terminal, text: "Full CLI, SDK & Docker compose suite" },
      { icon: Users, text: "Community Discord support" },
    ],
    cta: "Deploy Self-Hosted",
    ctaHref: "https://github.com",
    ctaClass: "bg-[#09101f] hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500",
    popular: false,
    floatDelay: "0s",
    floatDuration: "4.6s",
  },
  {
    key: "pro",
    name: "Managed Pro",
    price: 29,
    period: "month",
    gradient: "from-cyan-400 to-emerald-400",
    border: "border-cyan-500/50 group-hover:border-cyan-400/90",
    glow: "rgba(0, 240, 255, 0.25)",
    shadow: "shadow-[0_0_40px_rgba(0,240,255,0.28)]",
    badgeBg: "bg-cyan-500/15 border border-cyan-500/40 text-cyan-300",
    features: [
      { icon: Server, text: "15 fully managed cloud services" },
      { icon: Activity, text: "1,000,000 signals / month" },
      { icon: Shield, text: "Gemini 2.5 Flash Anomaly Engine" },
      { icon: Zap, text: "Global Redis edge telemetry mesh" },
      { icon: Users, text: "5 team seats & priority email support" },
    ],
    cta: "Start Pro Trial",
    ctaHref: "/auth/signup?plan=pro",
    ctaClass:
      "bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-[#070a13] font-bold shadow-[0_0_25px_rgba(0,240,255,0.35)]",
    popular: true,
    floatDelay: "0.8s",
    floatDuration: "5.0s",
  },
  {
    key: "enterprise",
    name: "Enterprise Mesh",
    price: 99,
    period: "month",
    gradient: "from-amber-300 to-orange-400",
    border: "border-amber-500/30 group-hover:border-amber-400/80",
    glow: "rgba(245, 158, 11, 0.2)",
    shadow: "shadow-[0_0_35px_rgba(245,158,11,0.2)]",
    badgeBg: "bg-amber-500/10 border border-amber-500/30 text-amber-300",
    features: [
      { icon: Server, text: "Unlimited services & agent clusters" },
      { icon: Activity, text: "High throughput custom signal pipeline" },
      { icon: Shield, text: "Dedicated AI fine-tuned anomaly models" },
      { icon: Zap, text: "99.99% uptime SLA & custom Webhook triggers" },
      { icon: Users, text: "Unlimited seats & 24/7 dedicated engineer" },
    ],
    cta: "Contact Enterprise",
    ctaHref: "/auth/signup?plan=enterprise",
    ctaClass:
      "bg-[#0d1527] hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-500/5",
    popular: false,
    floatDelay: "0.4s",
    floatDuration: "4.8s",
  },
];

function InteractivePricingCard({ plan }: { plan: (typeof PLANS)[0] }) {
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

    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
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

  return (
    <div className="pricing-card perspective-[1000px] w-full h-full flex" style={{ opacity: 0 }}>
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`group relative rounded-2xl border ${plan.border} p-6 sm:p-7 flex flex-col justify-between transition-all w-full select-none
          ${
            plan.popular
              ? "bg-[#0d1527]/95 lg:scale-[1.03] z-10"
              : "bg-[#0d1527]/75 backdrop-blur-xl"
          } ${tilt.isHovered ? `${plan.shadow} z-20` : ""}`}
        style={{
          transformStyle: "preserve-3d",
          transform: tilt.isHovered
            ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translate3d(${tilt.translateX}px, ${tilt.translateY}px, 20px) scale3d(${plan.popular ? 1.05 : 1.03}, ${plan.popular ? 1.05 : 1.03}, 1.03)`
            : `perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0px, 0px, 0px) scale3d(${plan.popular ? 1.03 : 1}, ${plan.popular ? 1.03 : 1}, 1)`,
          transition: tilt.isHovered
            ? "transform 0.08s ease-out, border-color 0.2s, box-shadow 0.2s"
            : "transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), border-color 0.4s, box-shadow 0.4s",
          animation: !tilt.isHovered
            ? `floatKeyframe ${plan.floatDuration} ease-in-out infinite`
            : "none",
          animationDelay: plan.floatDelay,
        }}
      >
        {/* Dynamic Cursor-Tracking Holographic Radial Spotlight */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: tilt.isHovered ? 1 : 0,
            background: `radial-gradient(300px circle at ${tilt.mouseX}px ${tilt.mouseY}px, ${plan.glow}, transparent 75%)`,
          }}
        />

        {/* Ambient Subtle Shimmer */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Corner Cyber Crosshairs */}
        <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 border-t border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 border-t border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 left-2.5 w-1.5 h-1.5 border-b border-l border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />
        <span className="absolute bottom-2.5 right-2.5 w-1.5 h-1.5 border-b border-r border-slate-600 group-hover:border-cyan-400 transition-colors pointer-events-none" />

        {/* Popular badge */}
        {plan.popular && (
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
            <div
              className={`px-3.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${plan.badgeBg} shadow-[0_0_12px_rgba(0,240,255,0.3)]`}
            >
              Most Popular
            </div>
          </div>
        )}

        {/* 3D Depth Layer */}
        <div
          className="relative z-10 flex flex-col justify-between h-full"
          style={{
            transform: tilt.isHovered ? "translateZ(28px)" : "translateZ(0px)",
            transformStyle: "preserve-3d",
            transition: "transform 0.25s ease-out",
          }}
        >
          <div>
            {/* Name + Price */}
            <div className="mb-6">
              <h3
                className={`text-xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent mb-2 font-mono`}
              >
                {plan.name}
              </h3>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl sm:text-5xl font-black font-mono text-white">
                  ${plan.price}
                </span>
                <span className="text-slate-400 text-sm font-mono">/ {plan.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {plan.features.map(({ text }) => (
                <li
                  key={text}
                  className="flex items-start gap-3 text-xs sm:text-sm text-slate-300"
                >
                  <div className="p-1 rounded-md bg-[#070a13] border border-slate-800 text-cyan-400 shrink-0 mt-0.5 group-hover:border-cyan-500/40 transition-colors">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <Link
            href={plan.ctaHref}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm transition-all duration-300 hover:scale-[1.02] cursor-pointer ${plan.ctaClass}`}
          >
            <span>{plan.cta}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Heading reveal
      gsap.fromTo(
        ".pricing-heading",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-heading",
            start: "top 85%",
            once: true,
          },
        },
      );

      // Card stagger
      gsap.fromTo(
        ".pricing-card",
        { opacity: 0, y: 40, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-cards-grid",
            start: "top 80%",
            once: true,
          },
        },
      );

      // Self-host note reveal
      gsap.fromTo(
        ".pricing-selfhost",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".pricing-selfhost",
            start: "top 90%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="mt-28 mb-12 relative z-10">
      {/* Section header */}
      <div className="pricing-heading text-center mb-16" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium mb-4 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
          <Shield className="w-3.5 h-3.5" />
          100% Open Source &amp; Free to Self-Host
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold mb-3 tracking-tight">
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            Transparent Pricing
          </span>
          <br />
          <span className="text-white">For Every Scale</span>
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Clone the repository and self-host NeuralControl for{" "}
          <span className="text-cyan-300 font-semibold font-mono">free forever</span>. Choose Managed Cloud when you want automated global backups and zero maintenance.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="pricing-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => (
          <InteractivePricingCard key={plan.key} plan={plan} />
        ))}
      </div>

      {/* Self-host note */}
      <div
        className="pricing-selfhost mt-12 text-center p-6 rounded-2xl border border-blue-500/20 bg-[#0d1527]/70 backdrop-blur-xl max-w-2xl mx-auto"
        style={{ opacity: 0 }}
      >
        <p className="text-slate-400 text-xs sm:text-sm">
          <span className="text-cyan-300 font-semibold font-mono">Want to self-host?</span>{" "}
          NeuralControl is completely open source under Apache 2.0. Run{" "}
          <code className="px-2 py-0.5 rounded bg-[#070a13] text-cyan-400 text-xs font-mono border border-slate-800">
            docker compose up
          </code>{" "}
          and your control plane and dashboard spin up in seconds.{" "}
          <a
            href="https://github.com"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors underline decoration-cyan-500/40 ml-1 inline-flex items-center gap-1"
          >
            View on GitHub →
          </a>
        </p>
      </div>
    </div>
  );
}

