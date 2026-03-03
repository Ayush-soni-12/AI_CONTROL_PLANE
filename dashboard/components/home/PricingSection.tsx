"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Zap, Server, Activity, Users, ArrowRight, Shield } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const PLANS = [
  {
    key: "free",
    name: "Free",
    price: 0,
    period: "month",
    gradient: "from-gray-400 to-gray-300",
    borderGlow: "border-gray-700",
    badgeBg: "bg-gray-800",
    features: [
      { icon: Server, text: "Up to 2 monitored services" },
      { icon: Activity, text: "50,000 signals / month" },
      { icon: Users, text: "1 seat" },
      { icon: Shield, text: "AI anomaly detection (basic)" },
      { icon: Zap, text: "Rate limiting & circuit breakers" },
    ],
    cta: "Get Started Free",
    ctaHref: "/auth/signup",
    ctaClass: "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700",
    popular: false,
  },
  {
    key: "pro",
    name: "Pro",
    price: 29,
    period: "month",
    gradient: "from-purple-400 to-pink-400",
    borderGlow: "border-purple-500/40",
    badgeBg: "bg-linear-to-r from-purple-500/20 to-pink-500/20",
    features: [
      { icon: Server, text: "10 monitored services" },
      { icon: Activity, text: "500,000 signals / month" },
      { icon: Users, text: "5 seats" },
      { icon: Shield, text: "AI anomaly detection" },
      { icon: Zap, text: "Advanced rate limiting & overrides" },
    ],
    cta: "Start Pro",
    ctaHref: "/auth/signup?plan=pro",
    ctaClass:
      "bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25",
    popular: true,
  },
  {
    key: "business",
    name: "Business",
    price: 99,
    period: "month",
    gradient: "from-yellow-400 to-orange-400",
    borderGlow: "border-yellow-500/30",
    badgeBg: "bg-linear-to-r from-yellow-500/10 to-orange-500/10",
    features: [
      { icon: Server, text: "Unlimited services" },
      { icon: Activity, text: "Unlimited signals" },
      { icon: Users, text: "20 seats" },
      { icon: Shield, text: "AI anomaly detection" },
      { icon: Zap, text: "Priority support & SLA" },
    ],
    cta: "Start Business",
    ctaHref: "/auth/signup?plan=business",
    ctaClass:
      "bg-linear-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white shadow-lg shadow-yellow-500/20",
    popular: false,
  },
];

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
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          stagger: 0.15,
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
    <div ref={sectionRef} className="mt-28 mb-12">
      {/* Section header */}
      <div className="pricing-heading text-center mb-16" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-5">
          <Shield className="w-4 h-4" />
          Open-source &amp; free to self-host — always
        </div>
        <h2 className="text-4xl sm:text-5xl font-black mb-5">
          <span className="bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Simple pricing
          </span>
          <br />
          <span className="text-white">for every team</span>
        </h2>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Clone the repo and self-host Neural Control for{" "}
          <span className="text-white font-semibold">free forever</span>. Pay
          only when you want us to manage the infrastructure for you.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="pricing-cards-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`pricing-card relative rounded-2xl border ${plan.borderGlow} p-6 flex flex-col gap-6 transition-all duration-300
              ${
                plan.popular
                  ? "bg-gray-900/80 shadow-2xl shadow-purple-500/10 lg:scale-[1.03]"
                  : "bg-gray-900/40"
              }`}
            style={{ opacity: 0 }}
          >
            {/* Popular badge */}
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <div
                  className={`px-4 py-1 rounded-full text-xs font-bold text-white ${plan.badgeBg} border border-purple-500/40`}
                >
                  Most Popular
                </div>
              </div>
            )}

            {/* Name + Price */}
            <div>
              <h3
                className={`text-2xl font-black bg-linear-to-r ${plan.gradient} bg-clip-text text-transparent mb-3`}
              >
                {plan.name}
              </h3>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-black text-white">
                  ${plan.price}
                </span>
                <span className="text-gray-400 mb-2">/ {plan.period}</span>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 flex-1">
              {plan.features.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 text-sm text-gray-300"
                >
                  <Icon className="w-4 h-4 text-purple-400 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href={plan.ctaHref}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 hover:scale-[1.03] ${plan.ctaClass}`}
            >
              {plan.cta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Self-host note */}
      <div
        className="pricing-selfhost mt-10 text-center p-6 rounded-2xl border border-gray-800/50 bg-gray-900/30 max-w-2xl mx-auto"
        style={{ opacity: 0 }}
      >
        <p className="text-gray-400 text-sm">
          <span className="text-white font-semibold">Want to self-host?</span>{" "}
          The entire codebase is open-source. Clone the repo, run{" "}
          <code className="px-1.5 py-0.5 rounded bg-gray-800 text-purple-300 text-xs font-mono">
            docker-compose up
          </code>{" "}
          and you&apos;re done — free forever, no credit card needed.{" "}
          <a
            href="https://github.com"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            View on GitHub →
          </a>
        </p>
      </div>
    </div>
  );
}
