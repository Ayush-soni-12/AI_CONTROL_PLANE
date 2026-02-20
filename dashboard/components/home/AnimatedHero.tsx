"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { ArrowRight, Activity, Code, Sparkles } from "lucide-react";

gsap.registerPlugin(useGSAP);

export function AnimatedHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Badge animation
      tl.fromTo(
        badgeRef.current,
        { opacity: 0, y: 30, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8 },
      );

      // Heading words stagger
      const words = headingRef.current?.querySelectorAll(".hero-word");
      if (words) {
        tl.fromTo(
          words,
          { opacity: 0, y: 60, rotateX: -40 },
          {
            opacity: 1,
            y: 0,
            rotateX: 0,
            duration: 0.9,
            stagger: 0.12,
          },
          "-=0.4",
        );
      }

      // Subtitle
      tl.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7 },
        "-=0.5",
      );

      // Buttons stagger
      const buttons = buttonsRef.current?.children;
      if (buttons) {
        tl.fromTo(
          buttons,
          { opacity: 0, y: 20, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.15,
          },
          "-=0.3",
        );
      }

      // Floating glow animation
      gsap.to(".hero-glow", {
        y: -20,
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: sectionRef },
  );

  return (
    <div ref={sectionRef} className="text-center mb-24 pt-8">
      {/* Floating glow elements */}
      <div className="hero-glow absolute top-20 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="hero-glow absolute top-32 right-1/4 w-48 h-48 bg-pink-600/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Badge */}
      <div
        ref={badgeRef}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-800/60 border border-purple-500/30 mb-8 backdrop-blur-sm"
        style={{ opacity: 0 }}
      >
        <div className="relative flex items-center justify-center">
          <span className="absolute w-6 h-6 bg-purple-500/30 rounded-full animate-ping" />
          <Sparkles className="w-4 h-4 text-purple-400 relative" />
        </div>
        <span className="text-sm font-medium text-gray-300">
          AI-Powered Control Plane for Microservices
        </span>
      </div>

      {/* Heading */}
      <h1
        ref={headingRef}
        className="text-6xl sm:text-7xl md:text-8xl font-bold mb-8 leading-tight"
        style={{ perspective: "800px" }}
      >
        <span
          className="hero-word inline-block bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
          style={{ opacity: 0 }}
        >
          Intelligent
        </span>
        <br />
        <span
          className="hero-word inline-block text-white"
          style={{ opacity: 0 }}
        >
          Service
        </span>{" "}
        <span
          className="hero-word inline-block text-white"
          style={{ opacity: 0 }}
        >
          Control
        </span>
      </h1>

      {/* Subtitle */}
      <p
        ref={subtitleRef}
        className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed"
        style={{ opacity: 0 }}
      >
        Autonomous traffic management with{" "}
        <span className="text-purple-400 font-medium">smart caching</span>,{" "}
        <span className="text-pink-400 font-medium">circuit breaking</span>,{" "}
        <span className="text-cyan-400 font-medium">rate limiting</span>, and{" "}
        <span className="text-emerald-400 font-medium">
          AI-powered insights
        </span>{" "}
        — powered by Gemini. Let AI handle the complexity of your microservices.
      </p>

      {/* CTA Buttons */}
      <div
        ref={buttonsRef}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        <Link
          href="/dashboard"
          className="group relative px-8 py-4 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20"
          style={{ opacity: 0 }}
        >
          <span className="absolute inset-0 rounded-xl bg-linear-to-r from-purple-400 to-pink-400 blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
          <span className="relative flex items-center gap-3 text-white font-semibold text-lg">
            <Activity className="w-5 h-5" />
            Launch Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </span>
        </Link>

        <button
          className="px-8 py-4 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-gray-900/50 transition-all duration-300 backdrop-blur-sm"
          style={{ opacity: 0 }}
        >
          <span className="flex items-center gap-3 text-gray-300 font-semibold text-lg">
            <Code className="w-5 h-5" />
            View Documentation
          </span>
        </button>
      </div>
    </div>
  );
}
