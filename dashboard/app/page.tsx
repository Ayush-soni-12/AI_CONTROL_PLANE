import Link from "next/link";
import { Globe, Github } from "lucide-react";
import { InteractiveBackground } from "@/components/home/InteractiveBackground";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { StatsCounter } from "@/components/home/StatsCounter";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { MCPShowcase } from "@/components/home/MCPShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ArchitectureVisual } from "@/components/home/ArchitectureVisual";
import { CTASection } from "@/components/home/CTASection";
import { HomeNavigation } from "@/components/home/HomeNavigation";
import { PricingSection } from "@/components/home/PricingSection";

export default function HomePage() {
  return (
    <InteractiveBackground>
      {/* Navigation */}
      <HomeNavigation />

      {/* Main Content */}
      <main className="px-4 sm:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* 1. Hero — GSAP text reveal */}
          <AnimatedHero />

          {/* 2. Stats — Scroll-triggered animated counters */}
          <StatsCounter />

          {/* 3. Architecture Topology — Interactive Agent Network & Service Mesh */}
          <ArchitectureVisual />

          {/* 4. Features — Real project features with scroll reveals */}
          <FeatureShowcase />

          {/* 5. Model Context Protocol — In-Editor & Agent Tooling */}
          <MCPShowcase />

          {/* 6. How It Works — Timeline with scroll-scrub */}
          <HowItWorks />

          {/* 7. Pricing — Plans overview */}
          <PricingSection />

          {/* 8. CTA — Final call to action */}
          <CTASection />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-8 py-10 border-t border-white/10 bg-black/95">
        <div className="max-w-[1152px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold font-sans text-white flex items-center gap-2">
                  <span>NeuralControl</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    v2.4
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-sans mt-0.5">
                  © 2026 AI Control Plane. Open Source Community Edition.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-sans text-slate-400">
              <a
                href="https://github.com/Ayush-soni-12/AI_CONTROL_PLANE"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <Link href="/dashboard/docs" className="hover:text-cyan-300 transition-colors">
                Documentation
              </Link>
              <span className="hover:text-cyan-300 transition-colors cursor-pointer">
                Privacy
              </span>
              <span className="hover:text-cyan-300 transition-colors cursor-pointer">
                Terms
              </span>
            </div>
          </div>
        </div>
      </footer>
    </InteractiveBackground>
  );
}

