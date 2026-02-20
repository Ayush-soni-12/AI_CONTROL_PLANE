import { NextResponse } from "next/server";

// List of available docs with metadata
export const docsList = [
  {
    slug: "README",
    title: "Overview",
    description: "Project overview and quick start",
    category: "overview",
    icon: "🚀",
  },
  {
    slug: "GETTING_STARTED",
    title: "Getting Started",
    description: "Installation and setup guide",
    category: "overview",
    icon: "⚡",
  },
  {
    slug: "CONFIGURATION",
    title: "Configuration",
    description: "Environment variables and settings",
    category: "overview",
    icon: "⚙️",
  },
  {
    slug: "AI_DECISIONS",
    title: "AI Decision Engine",
    description: "How the AI engine makes decisions",
    category: "features",
    icon: "🤖",
  },
  {
    slug: "CACHING",
    title: "Dynamic Caching",
    description: "AI-driven caching strategy",
    category: "features",
    icon: "🔄",
  },
  {
    slug: "CIRCUIT_BREAKER",
    title: "Circuit Breaker",
    description: "Cascade failure protection",
    category: "features",
    icon: "⚡",
  },
  {
    slug: "RATE_LIMITING",
    title: "Rate Limiting",
    description: "AI-tuned rate limit protection",
    category: "features",
    icon: "🚦",
  },
  {
    slug: "LOAD_SHEDDING",
    title: "Load Shedding",
    description: "Graceful degradation under load",
    category: "features",
    icon: "⚖️",
  },
  {
    slug: "QUEUE_DEFERRAL",
    title: "Queue Deferral",
    description: "Async processing for non-critical ops",
    category: "features",
    icon: "📋",
  },
  {
    slug: "CONTRIBUTOR_WORKFLOW",
    title: "Contributing",
    description: "How to contribute to this project",
    category: "contributing",
    icon: "🤝",
  },
];

export async function GET() {
  return NextResponse.json({ docs: docsList });
}
