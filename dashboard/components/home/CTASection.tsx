"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function CTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        sectionRef.current,
        { opacity: 0, scale: 0.92, y: 40 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );

      // Glow pulse
      gsap.to(".cta-glow", {
        opacity: 0.15,
        scale: 1.1,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: sectionRef },
  );

  return (
    <div
      ref={sectionRef}
      className="relative rounded-3xl overflow-hidden border border-gray-800 bg-linear-to-br from-gray-900 via-gray-950 to-gray-900"
      style={{ opacity: 0 }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.03)_1px,transparent_1px)] bg-size-[40px_40px]" />
      <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] opacity-10" />

      <div className="relative z-10 p-10 sm:p-14 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-linear-to-br from-purple-500/20 to-pink-500/20 mb-6 border border-purple-500/20">
          <Rocket className="w-10 h-10 text-purple-400" />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
          Ready to Take{" "}
          <span className="bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Intelligent Control
          </span>
          ?
        </h2>

        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Deploy the AI Control Plane and let Gemini-powered intelligence manage
          your microservices infrastructure — caching, circuit breaking, rate
          limiting, and more.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/20"
          >
            <span className="absolute inset-0 rounded-xl bg-linear-to-r from-purple-400 to-pink-400 blur-xl opacity-0 group-hover:opacity-40 transition-opacity" />
            <span className="relative text-white font-semibold text-lg">
              Start Monitoring Now
            </span>
            <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-2 transition-transform relative" />
          </Link>

          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-gray-700 hover:border-purple-500/50 hover:bg-gray-900/50 transition-all duration-300 backdrop-blur-sm"
          >
            <span className="text-gray-300 font-semibold text-lg">
              Create Free Account
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
