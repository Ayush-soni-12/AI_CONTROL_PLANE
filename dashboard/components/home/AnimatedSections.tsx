"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Code,
  Server,
  Sparkles,
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Lock,
  Brain,
  LucideIcon,
} from "lucide-react";

// Icon mapping to convert string names to components
const iconMap: Record<string, LucideIcon> = {
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Lock,
  Brain,
};

interface AnimatedSectionsProps {
  stats: Array<{ value: string; label: string }>;
  features: Array<{
    icon: string; // Icon name as string
    title: string;
    description: string;
    color: string;
  }>;
}

/**
 * Client component for animated sections
 * Handles all framer-motion animations
 */
export function AnimatedSections({ stats, features }: AnimatedSectionsProps) {
  return (
    <>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 mb-6">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">
            Next-Gen AI Control Plane
          </span>
        </div>

        <h1 className="text-7xl md:text-8xl font-bold mb-6">
          <span className="bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-linear">
            Intelligent
          </span>
          <br />
          <span className="text-white">Service Orchestration</span>
        </h1>

        <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
          Autonomous monitoring, predictive analytics, and intelligent
          remediation for modern microservices architecture. Let AI handle the
          complexity.
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
          Experience the future of service management with our AI-powered
          platform
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
                <div
                  className={`inline-flex p-3 rounded-xl bg-linear-to-br ${feature.color}/20 mb-4`}
                >
                  {(() => {
                    const IconComponent = iconMap[feature.icon];
                    return IconComponent ? (
                      <IconComponent
                        className={`w-6 h-6 bg-linear-to-r ${feature.color} bg-clip-text text-transparent`}
                      />
                    ) : null;
                  })()}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-400">{feature.description}</p>
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
    </>
  );
}
