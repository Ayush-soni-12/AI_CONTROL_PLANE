import { Globe } from "lucide-react";
import { InteractiveBackground } from "@/components/home/InteractiveBackground";
import { AnimatedHero } from "@/components/home/AnimatedHero";
import { StatsCounter } from "@/components/home/StatsCounter";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ArchitectureVisual } from "@/components/home/ArchitectureVisual";
import { CTASection } from "@/components/home/CTASection";
import { HomeNavigation } from "@/components/home/HomeNavigation";

// This is now a SERVER COMPONENT (no "use client")
// Can be cached and statically generated
export default function HomePage() {
  return (
    <InteractiveBackground>
      {/* Navigation */}
      <HomeNavigation />

      {/* Main Content */}
      <main className="px-6 sm:px-8 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto">
          {/* 1. Hero — GSAP text reveal */}
          <AnimatedHero />

          {/* 2. Stats — Scroll-triggered animated counters */}
          <StatsCounter />

          {/* 3. Features — Real project features with scroll reveals */}
          <FeatureShowcase />

          {/* 4. How It Works — Timeline with scroll-scrub */}
          <HowItWorks />

          {/* 5. Architecture — Animated flow diagram */}
          <ArchitectureVisual />

          {/* 6. CTA — Final call to action */}
          <CTASection />
        </div>
      </main>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <span className="text-gray-400">
                © 2024 AI Control Plane. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6 text-gray-400">
              <button className="hover:text-white transition-colors">
                Privacy
              </button>
              <button className="hover:text-white transition-colors">
                Terms
              </button>
              <button className="hover:text-white transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>
    </InteractiveBackground>
  );
}
