import { Globe, Github, Sparkles } from "lucide-react";
import { InteractiveBackground } from "@/components/home/InteractiveBackground";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { StatsCounter } from "@/components/home/StatsCounter";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
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

          {/* 5. How It Works — Timeline with scroll-scrub */}
          <HowItWorks />

          {/* 6. Pricing — Plans overview */}
          <PricingSection />

          {/* 7. CTA — Final call to action */}
          <CTASection />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 sm:px-8 py-10 border-t border-slate-800/80 bg-[#070a13]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.15)]">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold font-mono text-white flex items-center gap-1.5">
                  <span>NeuralControl</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    v2.4
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  © 2026 AI Control Plane. Open Source under Apache 2.0.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
              <a href="https://github.com" className="hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <button className="hover:text-cyan-400 transition-colors cursor-pointer">
                Documentation
              </button>
              <button className="hover:text-cyan-400 transition-colors cursor-pointer">
                Privacy
              </button>
              <button className="hover:text-cyan-400 transition-colors cursor-pointer">
                Terms
              </button>
            </div>
          </div>
        </div>
      </footer>
    </InteractiveBackground>
  );
}

