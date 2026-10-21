"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Bot,
  Shield,
  ShieldCheck,
  Activity,
  Cpu,
  Layers,
  Server,
  ArrowRight,
  Check,
  Pause,
  Play,
} from "lucide-react";

export function SystemArchitectureMatrix() {
  const [isFlowing, setIsFlowing] = useState(true);

  return (
    <div className="w-full max-w-[1152px] mx-auto rounded-2xl bg-[#090d16]/90 border border-white/10 p-5 sm:p-8 backdrop-blur-md shadow-2xl relative">
      {/* Keyframe animation for SVG Line Stream */}
      <style>{`
        @keyframes archStream {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        .arch-stream-pulse {
          animation: archStream 2.2s linear infinite;
        }
      `}</style>

      {/* 1. Header & Live Flow Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold font-sans text-white tracking-tight">
              NeuralControl Runtime Architecture
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-medium">
              v2.4
            </span>
          </div>
          <p className="text-xs sm:text-sm font-sans text-slate-300">
            In-process telemetry and runtime protection paired with decoupled control plane intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsFlowing(!isFlowing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isFlowing ? "Pause line flow animation" : "Resume line flow animation"}
          >
            {isFlowing ? (
              <>
                <Pause className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pause flow</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span>Resume flow</span>
              </>
            )}
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isFlowing ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            <span className="text-xs font-mono text-emerald-300 font-medium">
              {isFlowing ? "Live Signals (<0.4ms)" : "Flow Paused"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Capability / Guarantee Badges */}
      <div className="py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <span className="uppercase text-[11px] text-slate-400 font-semibold tracking-wider">
          Runtime Guarantees:
        </span>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            &lt;0.4ms In-Process Interception
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <Check className="w-3.5 h-3.5 text-cyan-400" />
            Zero Network Hops on Hot Path
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Fail-Open Memory Resilience
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-200">
            <Check className="w-3.5 h-3.5 text-violet-400" />
            Gemini AI Anomaly Reasoning
          </span>
        </div>
      </div>

      {/* 3. TIER 01: INGRESS */}
      <div className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Tier Label */}
          <div className="lg:col-span-3">
            <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase tracking-wider block mb-1">
              01 / INGRESS
            </span>
            <h4 className="text-sm font-semibold font-sans text-white">
              Inbound Traffic
            </h4>
            <p className="text-xs font-sans text-slate-300 mt-0.5 leading-relaxed">
              Callers, client applications &amp; autonomous agent streams.
            </p>
          </div>

          {/* 2 Authentic Ingress Cards */}
          <div className="lg:col-span-9 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 rounded-xl bg-[#0d1424]/80 border border-cyan-500/25 hover:border-cyan-500/40 transition-colors relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-white">
                        Client &amp; API Traffic
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      REST / GraphQL
                    </span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    Web &amp; mobile clients, direct HTTP, REST, and GraphQL requests entering microservice fleet.
                  </p>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 hidden sm:block shadow-sm" />
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-xl bg-[#0d1424]/80 border border-violet-500/25 hover:border-violet-500/40 transition-colors relative flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-violet-500/10 text-violet-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-white">
                        AI Agents &amp; MCP Tools
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      x-agent-id
                    </span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    Autonomous callers authenticated via <code className="text-violet-300 bg-violet-500/10 px-1 py-0.5 rounded">x-agent-id</code> and FastMCP tool executions.
                  </p>
                </div>
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 hidden sm:block shadow-sm" />
              </div>
            </div>

            {/* SVG Line Flow: Tier 1 -> Tier 2 */}
            <div className="hidden sm:block relative w-full h-11 my-0.5">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
              >
                {/* Base dashed vertical paths */}
                <path
                  d="M 25 0 L 25 44"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 75 0 L 75 44"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Animated Flow Pulses */}
                <path
                  d="M 25 0 L 25 44"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="14 86"
                  pathLength="100"
                  className={isFlowing ? "arch-stream-pulse" : ""}
                  style={{
                    animationPlayState: isFlowing ? "running" : "paused",
                    animationDelay: "0s",
                  }}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 75 0 L 75 44"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeDasharray="14 86"
                  pathLength="100"
                  className={isFlowing ? "arch-stream-pulse" : ""}
                  style={{
                    animationPlayState: isFlowing ? "running" : "paused",
                    animationDelay: "0.8s",
                  }}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 4. TIER 02: NEURALCONTROL RUNTIME ENGINE (The Highlighted Hero Box) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Tier Label */}
          <div className="lg:col-span-3">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase tracking-wider block mb-1">
              02 / CONTROL PLANE
            </span>
            <h4 className="text-sm font-semibold font-sans text-white">
              Runtime Engine
            </h4>
            <p className="text-xs font-sans text-slate-300 mt-0.5 leading-relaxed">
              In-memory decision core protecting live services.
            </p>
          </div>

          {/* Hero Highlighted Box */}
          <div className="lg:col-span-9 rounded-xl border border-emerald-500/35 bg-[#09151c]/90 p-4 sm:p-5 relative mt-3 sm:mt-0 shadow-lg">
            {/* Top Junction Pills (Border Anchors directly on the top border) */}
            <div className="absolute top-0 left-[25%] -translate-x-1/2 -translate-y-1/2 hidden sm:block pointer-events-none z-10">
              <div className="px-2.5 py-0.5 rounded-full bg-[#0a0f1d] border border-cyan-500/40 text-[10px] font-mono text-cyan-300 inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>SIGNAL STREAM</span>
              </div>
            </div>

            <div className="absolute top-0 left-[75%] -translate-x-1/2 -translate-y-1/2 hidden sm:block pointer-events-none z-10">
              <div className="px-2.5 py-0.5 rounded-full bg-[#0a0f1d] border border-violet-500/40 text-[10px] font-mono text-violet-300 inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span>x-agent-id AUTH</span>
              </div>
            </div>

            {/* Inner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-semibold uppercase text-white tracking-wider">
                  Shared In-Memory Protection Core
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Fail-Open Protection Active</span>
              </div>
            </div>

            {/* 3 Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-[#0d1424]/90 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold font-sans text-white">
                      Live Signal Ingestion
                    </span>
                  </div>
                </div>
                <span className="inline-block text-[10px] font-mono text-cyan-300 mb-1.5">
                  &lt;0.4ms Hot Path
                </span>
                <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                  Continuously tracks request speed, error rates, and traffic volume directly inside process memory.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0d1424]/90 border border-emerald-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold font-sans text-white">
                      Autonomous Defense
                    </span>
                  </div>
                </div>
                <span className="inline-block text-[10px] font-mono text-emerald-300 mb-1.5">
                  Circuit Breakers &amp; Quotas
                </span>
                <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                  Automatically stabilizes services under heavy traffic and prevents cascading outages without human delay.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0d1424]/90 border border-violet-500/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span className="text-xs font-semibold font-sans text-white">
                      Decoupled Coordination
                    </span>
                  </div>
                </div>
                <span className="inline-block text-[10px] font-mono text-violet-300 mb-1.5">
                  Redis + RabbitMQ + AI
                </span>
                <p className="text-[11px] font-sans text-slate-300 leading-relaxed">
                  Syncs cluster state and Gemini AI insights in background queues so live user requests never slow down.
                </p>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400/90 font-medium">Fail-open guarantee: Never blocks business traffic</span>
              <span className="text-slate-300">Interception latency: &lt;0.4ms</span>
            </div>

            {/* Bottom Junction Pills (Border Anchors directly on the bottom border) */}
            <div className="absolute bottom-0 left-[25%] -translate-x-1/2 translate-y-1/2 hidden sm:block pointer-events-none z-10">
              <div className="px-2.5 py-0.5 rounded-full bg-[#0a0f1d] border border-emerald-500/40 text-[10px] font-mono text-emerald-300 inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>FAIL-OPEN DISPATCH</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-[75%] -translate-x-1/2 translate-y-1/2 hidden sm:block pointer-events-none z-10">
              <div className="px-2.5 py-0.5 rounded-full bg-[#0a0f1d] border border-violet-500/40 text-[10px] font-mono text-violet-300 inline-flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span>RATE-LIMITED PROXY</span>
              </div>
            </div>
          </div>
        </div>

        {/* SVG Line Flow: Tier 2 -> Tier 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="hidden lg:block lg:col-span-3" />
          <div className="lg:col-span-9 w-full">
            <div className="hidden sm:block relative w-full h-11 my-0.5">
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 100 44"
                preserveAspectRatio="none"
              >
                {/* Base dashed vertical paths */}
                <path
                  d="M 25 0 L 25 44"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 75 0 L 75 44"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Animated Flow Pulses from Tier 2 to Tier 3 */}
                <path
                  d="M 25 0 L 25 44"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="14 86"
                  pathLength="100"
                  className={isFlowing ? "arch-stream-pulse" : ""}
                  style={{
                    animationPlayState: isFlowing ? "running" : "paused",
                    animationDelay: "0.4s",
                  }}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d="M 75 0 L 75 44"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  strokeDasharray="14 86"
                  pathLength="100"
                  className={isFlowing ? "arch-stream-pulse" : ""}
                  style={{
                    animationPlayState: isFlowing ? "running" : "paused",
                    animationDelay: "1.2s",
                  }}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* 5. TIER 03: PROTECTED BACKEND FLEET */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Tier Label */}
          <div className="lg:col-span-3">
            <span className="text-[11px] font-mono text-violet-400 font-semibold uppercase tracking-wider block mb-1">
              03 / BACKEND
            </span>
            <h4 className="text-sm font-semibold font-sans text-white">
              Protected Fleet
            </h4>
            <p className="text-xs font-sans text-slate-300 mt-0.5 leading-relaxed">
              Target microservices &amp; upstream AI model endpoints.
            </p>
          </div>

          {/* 2 Authentic Backend Cards */}
          <div className="lg:col-span-9 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1 */}
              <div className="p-4 rounded-xl bg-[#0d1424]/80 border border-emerald-500/25 hover:border-emerald-500/40 transition-colors relative flex flex-col justify-between">
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 hidden sm:block shadow-sm" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-white">
                        Target Microservices
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Node / Python / Go
                    </span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    FastAPI, Express, Node, and Go application handlers protected against latency spikes and cascade failures.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-xl bg-[#0d1424]/80 border border-violet-500/25 hover:border-violet-500/40 transition-colors relative flex flex-col justify-between">
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 hidden sm:block shadow-sm" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-violet-500/10 text-violet-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-mono font-medium text-white">
                        Upstream AI &amp; LLM APIs
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                      Token &amp; Rate Defense
                    </span>
                  </div>
                  <p className="text-xs font-sans text-slate-300 leading-relaxed">
                    Gemini, Claude, and OpenAI endpoints shielded with token budgets, adaptive timeouts, and circuit breakers.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Callout */}
      <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-sans text-slate-400">
            Shared Control Backbone:
          </span>
          <span className="text-xs font-mono text-white font-medium">
            Redis + PostgreSQL + RabbitMQ + Gemini AI
          </span>
        </div>

        <Link
          href="/dashboard/docs"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>Read Full Architecture Guide</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
