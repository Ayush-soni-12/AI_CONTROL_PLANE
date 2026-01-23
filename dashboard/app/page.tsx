"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  BarChart3, 
  Cpu, 
  Shield, 
  Zap, 
  Globe, 
  Sparkles, 
  Code,
  Server,
  Activity,
  Lock,
  Brain
} from "lucide-react";
import { motion } from "framer-motion";

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glitchEffect, setGlitchEffect] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    // Random glitch effect
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.95) {
        setGlitchEffect(true);
        setTimeout(() => setGlitchEffect(false), 100);
      }
    }, 3000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(glitchInterval);
    };
  }, []);

  const features = [
    {
      icon: Cpu,
      title: "AI-Powered Monitoring",
      description: "Real-time anomaly detection and predictive analytics",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into service performance and patterns",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: "Auto-Remediation",
      description: "Autonomous issue resolution and system optimization",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Sub-millisecond response times for all operations",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Lock,
      title: "Secure by Design",
      description: "Enterprise-grade security with zero-trust architecture",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Brain,
      title: "Self-Learning",
      description: "Adaptive algorithms that improve over time",
      color: "from-rose-500 to-pink-500"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "<10ms", label: "Avg Latency" },
    { value: "24/7", label: "Monitoring" },
    { value: "1000+", label: "Services Supported" }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950">
      {/* Animated background */}
      <div 
        className="fixed inset-0 opacity-20"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(120, 119, 198, 0.15), transparent 80%)`
        }}
      />

      {/* Grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[50px_50px]" />

      {/* Glitch effect overlay */}
      {glitchEffect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-white mix-blend-overlay"
        />
      )}

      {/* Floating elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-linear-to-br from-purple-500/20 to-pink-500/20">
                <Cpu className="w-6 h-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                NeuralControl
              </span>
            </div>
            <Link
              href="/dashboard"
              className="group relative px-6 py-3 rounded-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2 text-white font-medium">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-full bg-linear-to-r from-purple-400 to-pink-400 blur-xl opacity-0 group-hover:opacity-30 transition-opacity" />
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="px-8 py-20">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 mb-6">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Next-Gen AI Control Plane</span>
              </div>

              <h1 className="text-7xl md:text-8xl font-bold mb-6">
                <span className="bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-linear">
                  Intelligent
                </span>
                <br />
                <span className="text-white">Service Orchestration</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
                Autonomous monitoring, predictive analytics, and intelligent remediation 
                for modern microservices architecture. Let AI handle the complexity.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/dashboard"
                  className="group px-8 py-4 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-3 text-white font-semibold text-lg">
                    <Activity className="w-5 h-5" />
                    Launch Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                </Link>

                <button className="px-8 py-4 rounded-xl border border-gray-700 hover:border-gray-600 hover:bg-gray-900/50 transition-all duration-300">
                  <span className="flex items-center gap-3 text-gray-300 font-semibold text-lg">
                    <Code className="w-5 h-5" />
                    View Documentation
                  </span>
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 text-center"
                >
                  <div className="text-4xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-400">{stat.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Features Grid */}
            <div className="mb-20">
              <h2 className="text-4xl font-bold text-center mb-4 text-white">
                Why Choose NeuralControl?
              </h2>
              <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
                Experience the future of service management with our AI-powered platform
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="group relative bg-gray-900/30 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-linear-to-br from-transparent via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    
                    <div className="relative z-10">
                      <div className={`inline-flex p-3 rounded-xl bg-linear-to-br ${feature.color}/20 mb-4`}>
                        <feature.icon className={`w-6 h-6 bg-linear-to-r ${feature.color} bg-clip-text text-transparent`} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-3xl overflow-hidden border border-gray-800 bg-linear-to-br from-gray-900 to-gray-950"
            >
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative z-10 p-12 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-linear-to-br from-purple-500/20 to-pink-500/20 mb-6">
                  <Server className="w-12 h-12 text-purple-400" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">
                  Ready to Transform Your Infrastructure?
                </h2>
                <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of teams using NeuralControl to achieve unprecedented 
                  levels of reliability and performance.
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 hover:scale-105 group"
                >
                  <span className="text-white font-semibold text-lg">
                    Start Monitoring Now
                  </span>
                  <ArrowRight className="w-5 h-5 text-white group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </motion.div>
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
                <button className="hover:text-white transition-colors">Privacy</button>
                <button className="hover:text-white transition-colors">Terms</button>
                <button className="hover:text-white transition-colors">Contact</button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}