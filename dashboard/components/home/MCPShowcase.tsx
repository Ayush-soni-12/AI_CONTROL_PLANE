"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  Sliders,
  BookOpen,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Bot,
} from "lucide-react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MCP_CONFIG_SNIPPET = `{
  "mcpServers": {
    "neuralcontrol": {
      "command": "uvx",
      "args": ["neuralcontrol-mcp"],
      "env": {
        "CONTROL_PLANE_URL": "https://api.neuralcontrol.online",
        "NEURALCONTROL_API_KEY": "your_api_key_here"
      }
    }
  }
}`;

export function MCPShowcase() {
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: headingRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );

      gsap.fromTo(
        ".mcp-card",
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.08,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        },
      );
    },
    { scope: sectionRef },
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(MCP_CONFIG_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section ref={sectionRef} className="py-24 relative z-10 max-w-[1152px] mx-auto px-4 sm:px-6">
      {/* Section Header */}
      <div ref={headingRef} className="text-center mb-14" style={{ opacity: 0 }}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-cyan-300 uppercase tracking-wider font-medium">
            Model Context Protocol
          </span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-semibold font-sans text-white tracking-tight mb-3 text-balance">
          Control your runtime directly from AI agents and editors.
        </h2>
        <p className="text-sm sm:text-base font-sans text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
          Connect Cursor, Claude Desktop, Windsurf, or custom AI agents to NeuralControl using our official MCP server. Give your AI live access to traffic metrics, policy overrides, and incident debugging.
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: 3 Core Capabilities */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3.5">
            {/* Capability 1: Cyan (Telemetry Queries) */}
            <div className="mcp-card p-5 rounded-xl bg-[#090d16]/90 border border-cyan-500/25 hover:border-cyan-500/40 transition-all shadow-md backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <h3 className="text-sm font-semibold font-sans text-white">
                  Live Telemetry Queries (Tools)
                </h3>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed mb-3">
                Your AI agent queries real-time P95/P99 latency percentiles, error rates, and active incidents on demand using tools.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded font-medium">
                  get_recent_metrics
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded font-medium">
                  get_open_incidents
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded font-medium">
                  get_service_health
                </span>
              </div>
            </div>

            {/* Capability 2: Amber (Policy Overrides) */}
            <div className="mcp-card p-5 rounded-xl bg-[#090d16]/90 border border-amber-500/25 hover:border-amber-500/40 transition-all shadow-md backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Sliders className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold font-sans text-white">
                  In-Editor Policy Overrides (Actions)
                </h3>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed mb-3">
                Let your AI push emergency threshold overrides, adjust adaptive timeouts, or toggle feature flags directly from chat.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-medium">
                  create_threshold_override
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-medium">
                  set_feature_flag
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-medium">
                  trip_circuit_breaker
                </span>
              </div>
            </div>

            {/* Capability 3: Violet (Documentation Resources) */}
            <div className="mcp-card p-5 rounded-xl bg-[#090d16]/90 border border-violet-500/25 hover:border-violet-500/40 transition-all shadow-md backdrop-blur-md">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400">
                  <BookOpen className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="text-sm font-semibold font-sans text-white">
                  In-Context SDK Documentation (Resources)
                </h3>
              </div>
              <p className="text-xs font-sans text-slate-300 leading-relaxed mb-3">
                The agent automatically reads official middleware guides and architecture docs into context, eliminating copy-pasting.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded font-medium">
                  docs://circuit-breaker
                </span>
                <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded font-medium">
                  docs://caching
                </span>
                <span className="text-[10px] font-mono text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded font-medium">
                  docs://adaptive-timeout
                </span>
              </div>
            </div>
          </div>

          {/* Supported Clients row */}
          <div className="mcp-card p-4 rounded-xl bg-[#090d16]/90 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-md">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Compatible Editors:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white font-medium">
                Cursor
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white font-medium">
                Claude Desktop
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white font-medium">
                Windsurf
              </span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white font-medium">
                VS Code Copilot
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Code Box & Agent Dialogue */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* MCP JSON Config Snippet */}
          <div className="mcp-card rounded-xl bg-[#090d16]/90 border border-white/10 overflow-hidden flex flex-col flex-1 shadow-md">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0c121e] border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 mr-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60 inline-block" />
                </div>
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-mono text-white font-medium">
                  ~/.cursor/mcp.json
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  uvx (zero setup)
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:border-white/20 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copy configuration snippet"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed flex-1 bg-[#070a12]">
              <pre className="text-[12px] leading-relaxed font-mono">
                <span className="text-slate-400">&#123;</span>{"\n"}
                <span className="text-cyan-300">  &quot;mcpServers&quot;</span><span className="text-slate-400">: &#123;</span>{"\n"}
                <span className="text-cyan-300">    &quot;neuralcontrol&quot;</span><span className="text-slate-400">: &#123;</span>{"\n"}
                <span className="text-cyan-300">      &quot;command&quot;</span><span className="text-slate-400">: </span><span className="text-amber-300">&quot;uvx&quot;</span><span className="text-slate-400">,</span>{"\n"}
                <span className="text-cyan-300">      &quot;args&quot;</span><span className="text-slate-400">: [</span><span className="text-amber-300">&quot;neuralcontrol-mcp&quot;</span><span className="text-slate-400">],</span>{"\n"}
                <span className="text-cyan-300">      &quot;env&quot;</span><span className="text-slate-400">: &#123;</span>{"\n"}
                <span className="text-cyan-300">        &quot;CONTROL_PLANE_URL&quot;</span><span className="text-slate-400">: </span><span className="text-emerald-300">&quot;https://api.neuralcontrol.online&quot;</span><span className="text-slate-400">,</span>{"\n"}
                <span className="text-cyan-300">        &quot;NEURALCONTROL_API_KEY&quot;</span><span className="text-slate-400">: </span><span className="text-emerald-300">&quot;your_api_key_here&quot;</span>{"\n"}
                <span className="text-slate-400">      &#125;</span>{"\n"}
                <span className="text-slate-400">    &#125;</span>{"\n"}
                <span className="text-slate-400">  &#125;</span>{"\n"}
                <span className="text-slate-400">&#125;</span>
              </pre>
            </div>
          </div>

          {/* Interactive Agent Query Simulation */}
          <div className="mcp-card rounded-xl bg-[#090d16]/90 border border-white/10 p-4 shadow-md">
            <div className="flex items-center gap-2 mb-3 text-xs font-mono">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span className="uppercase tracking-wider text-violet-300 font-semibold">
                Example Agent Dialogue
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0c121e] border border-white/10 text-slate-200">
                <span className="text-cyan-400 font-medium">Developer:</span> &quot;Why is /checkout failing right now?&quot;
              </div>

              <div className="p-2.5 rounded-lg bg-[#081312] border border-emerald-500/35 text-slate-300 space-y-1.5">
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Agent called tool: get_recent_metrics(endpoint=&quot;/checkout&quot;)</span>
                </div>
                <p className="text-xs text-white leading-relaxed font-sans">
                  &quot;P99 latency has surged to <span className="font-mono text-amber-300 font-medium">4,200ms</span> with a <span className="font-mono text-rose-300 font-medium">24% error spike</span>. The fail-open circuit breaker tripped to protect downstream databases. Should I push a temporary timeout override?&quot;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docs link */}
      <div className="mt-8 text-center">
        <Link
          href="/dashboard/docs"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <span>Read the full Model Context Protocol integration guide</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
