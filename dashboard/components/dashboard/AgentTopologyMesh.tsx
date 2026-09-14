"use client";

import React, { useState, useMemo } from "react";
import {
  User,
  Shield,
  Zap,
  Globe,
  Database,
  Radio,
  Sparkles,
  ChevronDown,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  Server,
  Activity,
  Terminal,
} from "lucide-react";
import { useServices } from "@/hooks/useSignals";

interface TopologyNode {
  id: string;
  label: string;
  shortLabel: string;
  category: "ingress" | "client" | "sdk" | "queue" | "cache" | "database" | "ai" | "dashboard";
  categoryLabel: string;
  icon: React.ElementType;
  status: "active" | "processing" | "streaming";
  color: "cyan" | "emerald" | "purple" | "blue" | "amber";
  latency?: string;
  throughput?: string;
  technology: string;
  description: string;
}

export function AgentTopologyMesh() {
  const { data: servicesData } = useServices();
  const [selectedNodeId, setSelectedNodeId] = useState<string>("client-app");
  const [timeFilter, setTimeFilter] = useState("Last 5 minutes");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Dynamic service names from control plane
  const liveServices = servicesData?.services || [];
  const primaryLatency = liveServices[0]?.avg_latency
    ? `${Math.round(liveServices[0].avg_latency)}ms`
    : "14ms";
  const totalSignals = servicesData?.overall?.total_signals || 12480;

  const nodes: TopologyNode[] = useMemo(
    () => [
      {
        id: "user",
        label: "End Users & Traffic",
        shortLabel: "User",
        category: "ingress",
        categoryLabel: "Inbound Ingress",
        icon: User,
        status: "active",
        color: "blue",
        latency: "0ms",
        throughput: `${totalSignals.toLocaleString()} req/m`,
        technology: "HTTP / HTTPS / Agent Calls",
        description:
          "End-users, web clients, and external AI agents sending inbound API requests and initiating traffic flows.",
      },
      {
        id: "client-app",
        label: "Your Service",
        shortLabel: "Your Service",
        category: "client",
        categoryLabel: "Target Application",
        icon: Server,
        status: "active",
        color: "cyan",
        latency: primaryLatency,
        throughput: "620 req/m",
        technology: "Node.js / Express / Python / Go",
        description:
          "Your target business service or microservice runtime instance handling client application workloads with zero code alterations.",
      },
      {
        id: "sdk",
        label: "NeuralControl SDK",
        shortLabel: "Neural SDK",
        category: "sdk",
        categoryLabel: "Interception Middleware",
        icon: Shield,
        status: "active",
        color: "emerald",
        latency: "<0.4ms",
        throughput: "Zero Overhead",
        technology: "@neuralcontrol/sdk",
        description:
          "Zero-config middleware that auto-intercepts requests, executes local circuit breakers, sliding-window rate limits, and guarantees adaptive fail-open protection.",
      },
      {
        id: "rabbitmq",
        label: "RabbitMQ Broker",
        shortLabel: "RabbitMQ",
        category: "queue",
        categoryLabel: "Async Message Queue",
        icon: Radio,
        status: "streaming",
        color: "amber",
        latency: "1.8ms",
        throughput: "50,000 msg/s",
        technology: "RabbitMQ AMQP 0-9-1",
        description:
          "High-throughput asynchronous message broker buffering telemetry signals, fanning out events to background workers, and isolating failures with Dead Letter Queues (DLQ).",
      },
      {
        id: "redis",
        label: "Redis Cache & State",
        shortLabel: "Redis",
        category: "cache",
        categoryLabel: "In-Memory State Store",
        icon: Zap,
        status: "active",
        color: "cyan",
        latency: "0.5ms",
        throughput: "Sub-ms Sync",
        technology: "Redis 7.2 In-Memory",
        description:
          "Sub-millisecond state cache managing sliding-window rate limit token buckets, active trip flags, tenant rule sync, and real-time SSE pub/sub streams.",
      },
      {
        id: "postgres",
        label: "PostgreSQL Database",
        shortLabel: "PostgreSQL",
        category: "database",
        categoryLabel: "Relational Persistence",
        icon: Database,
        status: "active",
        color: "emerald",
        latency: "3.4ms",
        throughput: "ACID Durable",
        technology: "PostgreSQL 16 AsyncPG",
        description:
          "Durable relational persistence storing historical metrics, hourly aggregate snapshots, service registries, user authentication, and audit logs.",
      },
      {
        id: "ai-engine",
        label: "Gemini AI Engine",
        shortLabel: "Gemini AI",
        category: "ai",
        categoryLabel: "Autonomous Intelligence",
        icon: Sparkles,
        status: "processing",
        color: "purple",
        latency: "38ms",
        throughput: "Continuous Loop",
        technology: "Gemini 2.5 Flash + LangChain",
        description:
          "Continuous AI analyzer ingesting real-time Redis telemetry and PostgreSQL historical baselines to calibrate dynamic thresholds, detect anomalies, and auto-rollback risky flags.",
      },
      {
        id: "dashboard",
        label: "Mission Control Dashboard",
        shortLabel: "Dashboard",
        category: "dashboard",
        categoryLabel: "Real-Time Frontend UI",
        icon: Cpu,
        status: "streaming",
        color: "cyan",
        latency: "Real-time",
        throughput: "Live SSE Stream",
        technology: "Next.js 16 + Tailwind CSS 4",
        description:
          "High-precision Obsidian Cyber dashboard rendering live telemetry streams, rolling error graphs, circuit controls, and Web3 confidential invoice settlements.",
      },
    ],
    [primaryLatency, totalSignals]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[1];

  return (
    <div className="rounded-2xl p-5 sm:p-6 bg-[#0d1527]/85 backdrop-blur-xl border border-blue-500/15 shadow-2xl shadow-black/50 relative overflow-hidden">
      {/* Background Decorative Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-60 pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
              <span>Full End-to-End System Architecture</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono font-medium text-emerald-300">Live Wire</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time pipeline: User → Your Service → Neural SDK → RabbitMQ → Redis &amp; PostgreSQL ⇄ Gemini AI Engine → Dashboard
          </p>
        </div>

        {/* Time filter picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white hover:border-cyan-500/30 transition-all cursor-pointer font-mono"
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{timeFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-[#0b1222] border border-blue-500/20 shadow-2xl p-1.5 z-30">
              {["Last 5 minutes", "Last 15 minutes", "Last 1 hour", "Last 24 hours"].map((tf) => (
                <button
                  key={tf}
                  onClick={() => {
                    setTimeFilter(tf);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    timeFilter === tf
                      ? "bg-cyan-500/15 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Interactive Network Mesh Layout */}
      <div className="relative z-10 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
          {/* Left / Center 8 Columns: Graphical Topology Map */}
          <div className="xl:col-span-8 relative min-h-[380px] sm:min-h-[420px] flex items-center justify-center overflow-x-auto overflow-y-hidden py-4 px-2">
            <div className="relative w-[940px] h-[380px] shrink-0">
              {/* SVG Connecting Flow Lines with animated energy particles */}
              <svg
                className="absolute inset-0 w-[940px] h-[380px] pointer-events-none"
                viewBox="0 0 940 380"
              >
                <defs>
                  <linearGradient id="lineGradCyan" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="lineGradEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#00e699" stopOpacity="0.8" />
                  </linearGradient>
                  <linearGradient id="lineGradAmber" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00e699" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* 1. User -> Your Service */}
                <path
                  d="M 90 190 L 140 190"
                  fill="none"
                  stroke="url(#lineGradCyan)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* 2. Your Service -> Neural SDK */}
                <path
                  d="M 230 190 L 270 190"
                  fill="none"
                  stroke="url(#lineGradEmerald)"
                  strokeWidth="2.5"
                />

                {/* 3. Neural SDK -> RabbitMQ */}
                <path
                  d="M 360 190 L 405 190"
                  fill="none"
                  stroke="url(#lineGradAmber)"
                  strokeWidth="2.5"
                />

                {/* 4. RabbitMQ -> Redis (Top Branch) */}
                <path
                  d="M 485 190 C 515 190, 520 105, 545 105"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="2"
                  strokeOpacity="0.65"
                />

                {/* 5. RabbitMQ -> PostgreSQL (Bottom Branch) */}
                <path
                  d="M 485 190 C 515 190, 520 275, 535 275"
                  fill="none"
                  stroke="#00e699"
                  strokeWidth="2"
                  strokeOpacity="0.65"
                />

                {/* 6. Redis -> Gemini AI Engine */}
                <path
                  d="M 635 105 C 660 105, 665 190, 690 190"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeOpacity="0.75"
                />

                {/* 7. PostgreSQL -> Gemini AI Engine */}
                <path
                  d="M 645 275 C 670 275, 675 190, 690 190"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2"
                  strokeOpacity="0.75"
                />

                {/* 8. Redis -> Dashboard (Direct Real-time SSE link) */}
                <path
                  d="M 635 105 C 700 75, 790 145, 825 175"
                  fill="none"
                  stroke="#00f0ff"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.5"
                />

                {/* 9. Gemini AI Engine -> Dashboard */}
                <path
                  d="M 780 190 L 825 190"
                  fill="none"
                  stroke="url(#lineGradCyan)"
                  strokeWidth="2.5"
                />

                {/* 10. PostgreSQL -> Dashboard (Historical Metrics Link) */}
                <path
                  d="M 645 275 C 700 305, 790 235, 825 205"
                  fill="none"
                  stroke="#00e699"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.5"
                />

                {/* Animated Live Signal Pulse Particles traveling on paths */}
                {/* Particle 1: User -> Your Service */}
                <circle r="3" fill="#00f0ff" className="drop-shadow-[0_0_6px_#00f0ff]">
                  <animateMotion path="M 90 190 L 140 190" dur="1.2s" repeatCount="indefinite" />
                </circle>

                {/* Particle 2: Your Service -> SDK */}
                <circle r="3.5" fill="#00e699" className="drop-shadow-[0_0_8px_#00e699]">
                  <animateMotion path="M 230 190 L 270 190" dur="1.0s" repeatCount="indefinite" />
                </circle>

                {/* Particle 3: SDK -> RabbitMQ */}
                <circle r="3" fill="#f59e0b" className="drop-shadow-[0_0_6px_#f59e0b]">
                  <animateMotion path="M 360 190 L 405 190" dur="1.4s" repeatCount="indefinite" />
                </circle>

                {/* Particle 4: RabbitMQ -> Redis */}
                <circle r="2.5" fill="#00f0ff" className="drop-shadow-[0_0_6px_#00f0ff]">
                  <animateMotion path="M 485 190 C 515 190, 520 105, 545 105" dur="1.6s" repeatCount="indefinite" />
                </circle>

                {/* Particle 5: RabbitMQ -> PostgreSQL */}
                <circle r="2.5" fill="#00e699" className="drop-shadow-[0_0_6px_#00e699]">
                  <animateMotion path="M 485 190 C 515 190, 520 275, 535 275" dur="1.8s" repeatCount="indefinite" />
                </circle>

                {/* Particle 6: Redis -> Gemini AI */}
                <circle r="3" fill="#c084fc" className="drop-shadow-[0_0_8px_#c084fc]">
                  <animateMotion path="M 635 105 C 660 105, 665 190, 690 190" dur="2.0s" repeatCount="indefinite" />
                </circle>

                {/* Particle 7: Postgres -> Gemini AI */}
                <circle r="3" fill="#c084fc" className="drop-shadow-[0_0_8px_#c084fc]">
                  <animateMotion path="M 645 275 C 670 275, 675 190, 690 190" dur="2.0s" repeatCount="indefinite" />
                </circle>

                {/* Particle 8: AI -> Dashboard */}
                <circle r="3" fill="#00f0ff" className="drop-shadow-[0_0_6px_#00f0ff]">
                  <animateMotion path="M 780 190 L 825 190" dur="1.1s" repeatCount="indefinite" />
                </circle>
              </svg>

              {/* Exact-Anchored Architecture HTML Nodes */}
              {/* Node 1: Ingress User */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "55px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("user")}
                  className={`group relative p-3 rounded-2xl bg-[#091122]/95 border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "user"
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.35)] scale-105 bg-[#0b162c]"
                      : "border-blue-500/20 hover:border-cyan-500/40 hover:scale-102"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-200 mt-2 text-center whitespace-nowrap">
                    User
                  </p>
                </button>
              </div>

              {/* Node 2: Your Service (Target Application) */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "185px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("client-app")}
                  className={`group relative p-3 px-3.5 rounded-2xl bg-[#091122]/95 border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "client-app"
                      ? "border-cyan-400 shadow-[0_0_22px_rgba(0,240,255,0.4)] scale-105 bg-[#0b1830]"
                      : "border-cyan-500/25 hover:border-cyan-500/50 hover:scale-102"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mx-auto">
                    <Globe className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-cyan-300 mt-2 text-center whitespace-nowrap">
                    Your Service
                  </p>
                </button>
              </div>

              {/* Node 3: NeuralControl SDK */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "315px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("sdk")}
                  className={`group relative p-3.5 rounded-2xl bg-[#08152e] border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "sdk"
                      ? "border-emerald-400 shadow-[0_0_30px_rgba(0,230,153,0.45)] scale-110 bg-[#0a1e3d]"
                      : "border-emerald-500/40 shadow-[0_0_15px_rgba(0,230,153,0.15)] hover:scale-105"
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform mx-auto">
                    <Shield className="w-6 h-6 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-emerald-300 mt-2 text-center whitespace-nowrap">
                    Neural SDK
                  </p>
                </button>
              </div>

              {/* Node 4: RabbitMQ Broker */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "445px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("rabbitmq")}
                  className={`group relative p-3 rounded-2xl bg-[#091122]/95 border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "rabbitmq"
                      ? "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105 bg-[#17120a]"
                      : "border-amber-500/25 hover:border-amber-500/50 hover:scale-102"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mx-auto">
                    <Radio className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-amber-300 mt-2 text-center whitespace-nowrap">
                    RabbitMQ
                  </p>
                </button>
              </div>

              {/* Node 5A: Redis State Store */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "590px", top: "105px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("redis")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#091122]/95 border transition-all duration-200 cursor-pointer ${
                    selectedNodeId === "redis"
                      ? "border-cyan-400 shadow-[0_0_18px_rgba(0,240,255,0.35)] bg-[#0c1833] scale-105"
                      : "border-cyan-500/30 hover:border-cyan-400 hover:bg-[#0b1429]"
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200 whitespace-nowrap">Redis</span>
                </button>
              </div>

              {/* Node 5B: PostgreSQL Persistence */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "590px", top: "275px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("postgres")}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#091122]/95 border transition-all duration-200 cursor-pointer ${
                    selectedNodeId === "postgres"
                      ? "border-emerald-400 shadow-[0_0_18px_rgba(0,230,153,0.35)] bg-[#0c1833] scale-105"
                      : "border-emerald-500/30 hover:border-emerald-400 hover:bg-[#0b1429]"
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-200 whitespace-nowrap">PostgreSQL</span>
                </button>
              </div>

              {/* Node 6: Gemini AI Engine */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "735px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("ai-engine")}
                  className={`group relative p-3.5 rounded-2xl bg-[#130d24] border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "ai-engine"
                      ? "border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.45)] scale-110 bg-[#1c1236]"
                      : "border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)] hover:scale-105"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/30 border border-purple-400/50 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform mx-auto">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-purple-300 mt-2 text-center whitespace-nowrap">
                    Gemini AI
                  </p>
                </button>
              </div>

              {/* Node 7: Mission Control Dashboard */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: "865px", top: "190px" }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNodeId("dashboard")}
                  className={`group relative p-3 rounded-2xl bg-[#091122]/95 border transition-all duration-300 cursor-pointer ${
                    selectedNodeId === "dashboard"
                      ? "border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.35)] scale-105 bg-[#0b162c]"
                      : "border-cyan-500/30 hover:border-cyan-400 hover:scale-102"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mx-auto">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-200 mt-2 text-center whitespace-nowrap">
                    Dashboard
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Node Inspector & Telemetry Slide-card */}
          <div className="xl:col-span-4 rounded-xl p-5 bg-[#09101f]/95 border border-blue-500/20 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-inner">
                  <selectedNode.icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{selectedNode.label}</h4>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    {selectedNode.categoryLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span className="capitalize">{selectedNode.status}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {selectedNode.description}
            </p>

            {/* Quick Metrics Grid for Selected Node */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400">Latency / Delay</span>
                <p className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {selectedNode.latency || "0.4ms"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400">Capacity / Load</span>
                <p className="text-lg font-bold font-mono text-emerald-300 mt-0.5">
                  {selectedNode.throughput || "Nominal"}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#070a13] border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                Stack / Protocol:
              </span>
              <span className="text-slate-200 font-semibold">{selectedNode.technology}</span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Protection Protocol:</span>
              <span className="text-emerald-400 font-semibold">Adaptive Fail-Open</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="relative z-10 pt-4 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#00e699]" />
            <span className="text-slate-300 text-[11px]">Active Node</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
            <span className="text-slate-300 text-[11px]">AI Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="text-slate-300 text-[11px]">Async Queue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]" />
            <span className="text-slate-300 text-[11px]">In-Memory / SSE</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>Complete 8-Node Production Mesh</span>
        </div>
      </div>
    </div>
  );
}


