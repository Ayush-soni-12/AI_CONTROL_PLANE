"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Server, Activity, Users, ArrowRight, Shield, Terminal, Check, Zap } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PLANS = [
  {
    key: "free",
    name: "Open Source Free",
    price: 0,
    period: "month",
    popular: false,
    badge: "SELF-HOSTED",
    theme: {
      badgeColor: "text-cyan-300",
      badgeBg: "bg-cyan-500/10",
      badgeBorder: "border-cyan-500/30",
    },
    features: [
      { icon: Server, text: "Unlimited self-hosted services" },
      { icon: Activity, text: "Unlimited local signals & cache" },
      { icon: Shield, text: "Autonomous circuit breakers & rate limits" },
      { icon: Terminal, text: "Full CLI, SDK & Docker compose suite" },
      { icon: Users, text: "Community Discord & GitHub support" },
    ],
    cta: "Deploy Self-Hosted",
    ctaHref: "https://github.com/Ayush-soni-12/AI_CONTROL_PLANE",
  },
  {
    key: "pro",
    name: "Managed Pro",
    price: 29,
    period: "month",
    popular: true,
    badge: "MOST POPULAR",
    theme: {
      badgeColor: "text-emerald-300",
      badgeBg: "bg-emerald-500/10",
      badgeBorder: "border-emerald-500/40",
    },
    features: [
      { icon: Server, text: "15 fully managed cloud services" },
      { icon: Activity, text: "1,000,000 signals / month" },
      { icon: Shield, text: "Gemini AI Anomaly Reasoning Engine" },
      { icon: Zap, text: "Global Redis edge telemetry sync" },
      { icon: Users, text: "5 team seats & priority email support" },
    ],
    cta: "Start Pro Trial",
    ctaHref: "/auth/signup?plan=pro",
  },
  {
    key: "enterprise",
    name: "Enterprise Mesh",
    price: 99,
    period: "month",
    popular: false,
    badge: "HIGH AVAILABILITY",
    theme: {
      badgeColor: "text-violet-300",
      badgeBg: "bg-violet-500/10",
      badgeBorder: "border-violet-500/30",
    },
    features: [
      { icon: Server, text: "Unlimited services & agent clusters" },
      { icon: Activity, text: "High throughput custom signal pipeline" },
      { icon: Shield, text: "Dedicated AI fine-tuned anomaly models" },
      { icon: Zap, text: "99.99% uptime SLA & custom Webhook triggers" },
      { icon: Users, text: "Unlimited seats & 24/7 dedicated engineer" },
    ],
    cta: "Contact Enterprise",
    ctaHref: "/auth/signup?plan=enterprise",
  },
];

function PricingCard({ plan }: { plan: (typeof PLANS)[0] }) {
  return (
    <div className="w-full flex">
      <div
        className={`pricing-card relative rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 w-full shadow-lg backdrop-blur-md ${
          plan.popular
            ? "bg-[#0a1120]/95 border-2 border-cyan-500/50 lg:-translate-y-2 lg:scale-[1.03] z-10 shadow-cyan-500/10"
            : "bg-[#090d16]/90 border border-white/10 hover:border-white/20"
        }`}
      >
        {/* Popular badge */}
        {plan.popular && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#0a1120] border border-cyan-500/60 text-cyan-300 shadow-md">
              {plan.badge}
            </div>
          </div>
        )}

        <div className="flex flex-col justify-between h-full">
          <div>
            {/* Plan Name + Badge (for non-popular) */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-sans font-semibold text-white tracking-tight">
                {plan.name}
              </h3>
              {!plan.popular && (
                <span
                  className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded ${plan.theme.badgeBg} border ${plan.theme.badgeBorder} ${plan.theme.badgeColor}`}
                >
                  {plan.badge}
                </span>
              )}
            </div>

            {/* Price display */}
            <div className="flex items-baseline gap-1.5 mb-6">
              <span className="text-4xl sm:text-5xl font-semibold font-mono text-white tabular-nums tracking-tight">
                ${plan.price}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {plan.period}</span>
            </div>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {plan.features.map(({ text }) => (
                <li
                  key={text}
                  className="flex items-start gap-2.5 text-xs sm:text-sm font-sans text-slate-300"
                >
                  <div className="p-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Call to action button */}
          <Link
            href={plan.ctaHref}
            className={`w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
              plan.popular
                ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                : "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <span>{plan.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
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
      // Heading entrance
      gsap.fromTo(
        ".pricing-heading",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".pricing-heading",
            start: "top 85%",
            once: true,
          },
        },
      );

      // Card stagger entrance
      gsap.fromTo(
        ".pricing-card",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".pricing-cards-grid",
            start: "top 80%",
            once: true,
          },
        },
      );

      // Self-host note entrance
      gsap.fromTo(
        ".pricing-selfhost",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
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
    <section ref={sectionRef} className="py-24 relative z-10 max-w-[1152px] mx-auto px-4 sm:px-6">
      {/* Section header */}
      <div className="pricing-heading text-center mb-16" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium">PRICING &amp; DEPLOYMENT</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-semibold font-sans text-white tracking-tight mb-3 text-balance">
          Predictable pricing for every stage.
        </h2>
        <p className="text-sm sm:text-base font-sans text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
          Self-host NeuralControl for free forever, or choose Managed Cloud for automated backups, global telemetry, and zero maintenance.
        </p>
      </div>

      {/* Pricing cards grid */}
      <div className="pricing-cards-grid grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLANS.map((plan) => (
          <PricingCard key={plan.key} plan={plan} />
        ))}
      </div>

      {/* Self-host note */}
      <div
        className="pricing-selfhost mt-12 text-center p-5 rounded-xl border border-white/10 bg-[#090d16]/90 max-w-2xl mx-auto shadow-md"
        style={{ opacity: 0 }}
      >
        <p className="text-slate-300 text-xs sm:text-sm font-sans leading-relaxed">
          <span className="text-white font-semibold font-mono">Want to self-host?</span>{" "}
          NeuralControl is completely open source. Run{" "}
          <code className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-xs font-mono border border-cyan-500/30">
            docker compose up
          </code>{" "}
          and your control plane and dashboard spin up in seconds.{" "}
          <a
            href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors underline decoration-cyan-500/40 ml-1 inline-flex items-center gap-1 font-mono"
          >
            View on GitHub →
          </a>
        </p>
      </div>
    </section>
  );
}
