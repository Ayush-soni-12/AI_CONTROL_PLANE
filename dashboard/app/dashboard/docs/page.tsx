"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, AlertCircle, Loader2, Menu } from "lucide-react";
import { TopCommandHeader } from "@/components/dashboard/TopCommandHeader";
import { DocsHeader } from "@/components/dashboard/docs/DocsHeader";
import { DocsCategoryNav } from "@/components/dashboard/docs/DocsCategoryNav";
import { DocsMarkdownRenderer } from "@/components/dashboard/docs/DocsMarkdownRenderer";
import { docsList } from "@/components/dashboard/docs/docsData";

function DocsPageContent() {
  const searchParams = useSearchParams();
  const initialDoc = searchParams.get("doc") ?? "README";

  const [activeDoc, setActiveDoc] = useState(initialDoc);
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Fetch markdown content when activeDoc changes
  const fetchDoc = useCallback(async (slug: string) => {
    setIsLoading(true);
    setError(null);
    setContent("");

    try {
      const res = await fetch(`/api/docs/${slug}`);
      if (!res.ok) throw new Error(`Failed to load documentation for ${slug}`);
      const text = await res.text();
      setContent(text);
    } catch (err: any) {
      setError(err.message || "Could not load this documentation file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoc(activeDoc);
  }, [activeDoc, fetchDoc]);

  const handleDocSelect = (slug: string) => {
    setActiveDoc(slug);
    // Scroll window smoothly to top when switching docs
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Update URL query param without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("doc", slug);
    window.history.pushState({}, "", url.toString());
  };

  const activeDocMeta = docsList.find((d) => d.slug === activeDoc);

  return (
    <div className="min-h-screen bg-[#070a13] cyber-grid text-slate-100 relative">
      {/* ── Dedicated Full-Height Docs Sidebar ──────────────────────── */}
      <DocsCategoryNav
        activeDoc={activeDoc}
        onSelectDoc={handleDocSelect}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* ── Main Docs Reading Viewport (Offset by Left Docs Sidebar) ── */}
      <div className="lg:pl-80 min-h-screen flex flex-col">
        {/* Mobile Header Bar with Sidebar Drawer Trigger */}
        <div className="lg:hidden p-4 border-b border-white/[0.08] bg-[#060b16]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#091020] border border-white/[0.1] text-xs font-mono text-cyan-300 flex items-center gap-2 cursor-pointer"
          >
            <Menu className="w-4 h-4" />
            <span>Browse Topics</span>
          </button>

          <span className="text-xs font-mono text-slate-300 font-bold">
            {activeDocMeta?.title || "Documentation"}
          </span>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6 flex-1">

          {/* ── Hero Header & 4 KPI Telemetry Cards ──────────────────── */}
          <DocsHeader
            activeDocTitle={activeDocMeta?.title}
            activeCategory={activeDocMeta?.category}
          />

          {/* ── Active Document Markdown Content ────────────────────── */}
          <main className="w-full min-w-0 pt-2 pb-16">
            {isLoading ? (
              <div className="p-8 sm:p-12 rounded-2xl bg-[#091020]/80 border border-white/[0.08] backdrop-blur-xl animate-pulse space-y-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-xs font-mono text-cyan-300">
                    Loading documentation specification...
                  </span>
                </div>
                <div className="h-8 w-2/3 rounded-xl bg-white/[0.06]" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded-lg bg-white/[0.04]" />
                  <div className="h-4 w-5/6 rounded-lg bg-white/[0.04]" />
                  <div className="h-4 w-4/6 rounded-lg bg-white/[0.04]" />
                </div>
                <div className="h-40 rounded-xl bg-[#070d1a] border border-white/[0.04]" />
              </div>
            ) : error ? (
              <div className="p-8 rounded-2xl bg-[#091020]/90 border border-rose-500/30 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <h3 className="text-base font-bold font-mono text-white">
                  Documentation Load Error
                </h3>
                <p className="text-xs text-rose-300 font-mono max-w-md mx-auto">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => fetchDoc(activeDoc)}
                  className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <DocsMarkdownRenderer
                content={content}
                onDocSelect={handleDocSelect}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070a13] cyber-grid text-slate-100">
          <div className="text-center space-y-3">
            <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <BookOpen className="w-10 h-10 text-cyan-400 animate-pulse" />
            </div>
            <p className="text-sm font-mono text-slate-300">Loading Developer Documentation...</p>
            <div className="w-32 h-1 bg-white/[0.06] rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-linear-to-r from-cyan-500 to-purple-500 animate-pulse" />
            </div>
          </div>
        </div>
      }
    >
      <DocsPageContent />
    </Suspense>
  );
}
