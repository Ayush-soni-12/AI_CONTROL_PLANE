import { Globe } from "lucide-react";
import { InteractiveBackground } from "@/components/home/InteractiveBackground";
import { AnimatedSections } from "@/components/home/AnimatedSections";
import { HomeNavigation } from "@/components/home/HomeNavigation";

// This is now a SERVER COMPONENT (no "use client")
// Can be cached and statically generated
export default function HomePage() {
  // Static data - use icon names as strings
  const features = [
    {
      icon: "Cpu",
      title: "AI-Powered Monitoring",
      description: "Real-time anomaly detection and predictive analytics",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: "BarChart3",
      title: "Advanced Analytics",
      description: "Deep insights into service performance and patterns",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: "Shield",
      title: "Auto-Remediation",
      description: "Autonomous issue resolution and system optimization",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: "Zap",
      title: "Lightning Fast",
      description: "Sub-millisecond response times for all operations",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: "Lock",
      title: "Secure by Design",
      description: "Enterprise-grade security with zero-trust architecture",
      color: "from-indigo-500 to-purple-500",
    },
    {
      icon: "Brain",
      title: "Self-Learning",
      description: "Adaptive algorithms that improve over time",
      color: "from-rose-500 to-pink-500",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "<10ms", label: "Avg Latency" },
    { value: "24/7", label: "Monitoring" },
    { value: "1000+", label: "Services Supported" },
  ];

  return (
    <InteractiveBackground>
      {/* Navigation */}
      <HomeNavigation />

      {/* Main Content */}
      <main className="px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <AnimatedSections stats={stats} features={features} />
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
                © 2024 NeuralControl. All rights reserved.
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
