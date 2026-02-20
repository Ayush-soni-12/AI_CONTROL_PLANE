"use client";

import { useCheckAuth } from "@/hooks/useSignals";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { LogIn, BookOpen, ChevronRight, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useCallback,
  Suspense,
  isValidElement,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Doc catalogue (mirrors the API route list) ───────────────────────────────
const docsList = [
  {
    slug: "README",
    title: "Overview",
    description: "Project overview & quick start",
    category: "Overview",
    emoji: "🚀",
  },
  {
    slug: "GETTING_STARTED",
    title: "Getting Started",
    description: "Installation and setup guide",
    category: "Overview",
    emoji: "⚡",
  },
  {
    slug: "CONFIGURATION",
    title: "Configuration",
    description: "Environment variables & settings",
    category: "Overview",
    emoji: "⚙️",
  },
  {
    slug: "AI_DECISIONS",
    title: "AI Decision Engine",
    description: "How the AI makes decisions",
    category: "Features",
    emoji: "🤖",
  },
  {
    slug: "CACHING",
    title: "Dynamic Caching",
    description: "AI-driven caching strategy",
    category: "Features",
    emoji: "🔄",
  },
  {
    slug: "CIRCUIT_BREAKER",
    title: "Circuit Breaker",
    description: "Cascade failure protection",
    category: "Features",
    emoji: "⚡",
  },
  {
    slug: "RATE_LIMITING",
    title: "Rate Limiting",
    description: "AI-tuned rate limit protection",
    category: "Features",
    emoji: "🚦",
  },
  {
    slug: "LOAD_SHEDDING",
    title: "Load Shedding",
    description: "Graceful degradation under load",
    category: "Features",
    emoji: "⚖️",
  },
  {
    slug: "QUEUE_DEFERRAL",
    title: "Queue Deferral",
    description: "Async processing for non-critical ops",
    category: "Features",
    emoji: "📋",
  },
  {
    slug: "CONTRIBUTOR_WORKFLOW",
    title: "Contributing",
    description: "How to contribute to this project",
    category: "Contributing",
    emoji: "🤝",
  },
];

const categories = ["Overview", "Features", "Contributing"];

// ─── Markdown renderer component ─────────────────────────────────────────────
function MarkdownContent({
  content,
  onDocSelect,
}: {
  content: string;
  onDocSelect?: (slug: string) => void;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-4xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-6 mt-2 pb-4 border-b border-gray-800">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-gray-800/60 flex items-center gap-2">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-purple-300 mt-8 mb-3">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-gray-200 mt-6 mb-2">
            {children}
          </h4>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
        ),
        // Links — intercept relative .md links for in-app navigation
        a: ({ href, children }) => {
          if (href?.endsWith(".md")) {
            const slug = href.split("/").pop()?.replace(".md", "") ?? "";
            const isKnown = docsList.some((d) => d.slug === slug);
            if (isKnown && onDocSelect) {
              return (
                <button
                  onClick={() => onDocSelect(slug)}
                  className="text-purple-400 hover:text-pink-400 underline underline-offset-2 transition-colors duration-200 cursor-pointer"
                >
                  {children}
                </button>
              );
            }
          }
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-pink-400 underline underline-offset-2 transition-colors duration-200"
            >
              {children}
            </a>
          );
        },
        // ── Code blocks ─────────────────────────────────────────
        // pre: reads language from its child <code> className, shows the
        // mac-style dots + language badge, then renders content.
        // code: only decides inline vs block — no visual shell.
        pre: ({ children }) => {
          let lang = "";
          if (isValidElement(children)) {
            const childProps = children.props as Record<string, string>;
            lang = childProps?.className?.replace("language-", "") ?? "";
          }
          return (
            <div className="relative my-6 rounded-2xl overflow-hidden border border-gray-700/50 shadow-xl">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                {lang && (
                  <span className="text-xs text-gray-500 font-mono ml-2">
                    {lang}
                  </span>
                )}
              </div>
              <pre className="bg-gray-950/80 p-5 overflow-x-auto text-sm font-mono text-gray-200 leading-relaxed whitespace-pre">
                {children}
              </pre>
            </div>
          );
        },
        code: ({ className, children, ...props }) => {
          // Block code: has a language class OR is multiline (e.g. ASCII diagrams)
          // → render as plain <code> — the <pre> wrapper above handles all styling
          const isBlock =
            !!className?.startsWith("language-") ||
            String(children).includes("\n");
          if (isBlock) {
            return (
              <code className="text-sm font-mono text-gray-200 leading-relaxed">
                {children}
              </code>
            );
          }
          // Inline code
          return (
            <code
              className="px-1.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[0.85em]"
              {...props}
            >
              {children}
            </code>
          );
        },
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="my-4 pl-4 border-l-4 border-purple-500/50 bg-purple-500/5 rounded-r-xl py-3 pr-4 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="my-4 space-y-2 ml-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 space-y-2 ml-2 list-decimal list-inside">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-gray-300">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        // Tables
        table: ({ children }) => (
          <div className="my-6 overflow-x-auto rounded-xl border border-gray-700/50">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-800/80">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-gray-800/50">{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="hover:bg-gray-800/30 transition-colors">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left font-semibold text-purple-300 text-xs uppercase tracking-wider">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-gray-300">{children}</td>
        ),
        // Horizontal rule
        hr: () => (
          <hr className="my-8 border-0 h-px bg-linear-to-r from-transparent via-gray-700 to-transparent" />
        ),
        // Strong / Em
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-300">{children}</em>
        ),
        // Details / Summary (for collapsible sections in README)
        details: ({ children }) => (
          <details className="my-4 rounded-xl border border-gray-700/50 bg-gray-900/40 overflow-hidden group">
            {children}
          </details>
        ),
        summary: ({ children }) => (
          <summary className="px-4 py-3 cursor-pointer font-medium text-purple-300 hover:text-white transition-colors list-none flex items-center gap-2 select-none">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            {children}
          </summary>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Inner page (uses useSearchParams) ───────────────────────────────────────
function DocsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDoc = searchParams.get("doc") ?? "README";

  const [activeDoc, setActiveDoc] = useState(initialDoc);
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: user, isLoading: isAuthLoading } = useCheckAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isAuthLoading, router]);

  // Fetch markdown content when activeDoc changes
  const fetchDoc = useCallback(async (slug: string) => {
    setIsLoading(true);
    setContent("");
    try {
      const res = await fetch(`/api/docs/${slug}`);
      if (!res.ok) throw new Error("Failed to load doc");
      const text = await res.text();
      setContent(text);
    } catch {
      setContent(
        "# Error\n\nCould not load this documentation file. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoc(activeDoc);
  }, [activeDoc, fetchDoc]);

  const handleDocSelect = (slug: string) => {
    setActiveDoc(slug);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("doc", slug);
    window.history.pushState({}, "", url.toString());
  };

  // Filter docs by search
  const filteredDocs = docsList.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeDocMeta = docsList.find((d) => d.slug === activeDoc);

  // Auth loading state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
        <div className="text-center">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10 mb-4">
            <LogIn className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-lg">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <DashboardSidebar />
      <div className="lg:ml-64 min-h-screen bg-linear-to-br from-background via-purple-950/5 to-background">
        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="px-8 py-6 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-10 bg-gray-950/80">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl blur-md opacity-50" />
              <div className="relative p-2.5 rounded-xl bg-linear-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Documentation
              </h1>
              <p className="text-gray-500 text-sm">
                Everything you need to know about AI Control Plane
              </p>
            </div>

            {/* Breadcrumb */}
            {activeDocMeta && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <span>Docs</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-purple-400 font-medium">
                  {activeDocMeta.title}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex">
          {/* ── Left Navigation Panel ────────────────────────────── */}
          <aside className="w-72 shrink-0 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto border-r border-gray-800/50 py-6 px-4">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700/50 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Categories */}
            {categories.map((category) => {
              const docsInCategory = filteredDocs.filter(
                (d) => d.category === category,
              );
              if (docsInCategory.length === 0) return null;

              return (
                <div key={category} className="mb-6">
                  <div className="px-3 mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                      {category}
                    </span>
                    <div className="h-px flex-1 bg-gray-800/60" />
                  </div>
                  <div className="space-y-1">
                    {docsInCategory.map((doc) => {
                      const isActive = activeDoc === doc.slug;
                      return (
                        <button
                          key={doc.slug}
                          onClick={() => handleDocSelect(doc.slug)}
                          className={`
                            group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200
                            ${
                              isActive
                                ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white shadow-sm shadow-purple-500/10"
                                : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200 border border-transparent"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base leading-none">
                              {doc.emoji}
                            </span>
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-medium truncate ${isActive ? "text-white" : ""}`}
                              >
                                {doc.title}
                              </div>
                              <div className="text-xs text-gray-600 mt-0.5 truncate group-hover:text-gray-500 transition-colors">
                                {doc.description}
                              </div>
                            </div>
                            {isActive && (
                              <div className="ml-auto shrink-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredDocs.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-sm">
                No docs match &quot;{searchQuery}&quot;
              </div>
            )}
          </aside>

          {/* ── Right Content Panel ───────────────────────────────── */}
          <main className="flex-1 min-w-0 px-10 py-8">
            {isLoading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-10 w-3/4 rounded-2xl bg-gray-800/60" />
                <div className="h-4 w-full rounded-xl bg-gray-800/40" />
                <div className="h-4 w-5/6 rounded-xl bg-gray-800/40" />
                <div className="h-4 w-4/5 rounded-xl bg-gray-800/40" />
                <div className="h-32 rounded-2xl bg-gray-800/30 mt-8" />
                <div className="h-4 w-full rounded-xl bg-gray-800/40" />
                <div className="h-4 w-3/4 rounded-xl bg-gray-800/40" />
                <div className="h-32 rounded-2xl bg-gray-800/30 mt-4" />
              </div>
            ) : (
              <div className="prose-invert max-w-none pb-16">
                <MarkdownContent
                  content={content}
                  onDocSelect={handleDocSelect}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

// ─── Page export (Suspense boundary for useSearchParams) ─────────────────────
export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-purple-950/5 to-background">
          <div className="inline-block p-4 rounded-2xl bg-purple-500/10">
            <BookOpen className="w-12 h-12 text-purple-400 animate-pulse" />
          </div>
        </div>
      }
    >
      <DocsPageInner />
    </Suspense>
  );
}
