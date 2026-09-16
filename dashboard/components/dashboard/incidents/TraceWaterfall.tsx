"use client";

import { useState } from "react";
import { useTrace, Span } from "../../../hooks/useTraces";
import { X, Search, Clock, Activity, AlertTriangle, Layers } from "lucide-react";

function SpanRow({
  span,
  totalMs,
  traceStart,
}: {
  span: Span;
  totalMs: number;
  traceStart: number;
}) {
  const [hovered, setHovered] = useState(false);

  const start = span.start_time ? new Date(span.start_time).getTime() : 0;
  const dur = span.duration_ms ?? 0;
  const offset = totalMs > 0 ? ((start - traceStart) / totalMs) * 100 : 0;
  const width = totalMs > 0 ? Math.max((dur / totalMs) * 100, 1) : 1;

  const isSlow = span.is_slow || dur > 500;
  const color = isSlow ? "#f43f5e" : "#06b6d4";
  const indent = span.depth * 16;

  return (
    <div className="group relative">
      <div
        className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg transition-colors hover:bg-white/[0.04]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Indentation */}
        <div style={{ minWidth: `${indent + 4}px` }} />

        {/* Operation label */}
        <span
          className="text-xs font-mono font-medium truncate shrink-0"
          style={{
            color: isSlow ? "#fb7185" : "#e2e8f0",
            width: "220px",
          }}
        >
          {isSlow ? "🔴 " : "⚡ "}
          {span.operation}
        </span>

        {/* Waterfall bar track */}
        <div className="flex-1 relative h-4 rounded overflow-hidden bg-black/50 border border-white/[0.06]">
          <div
            className="absolute top-0 h-full rounded transition-all"
            style={{
              left: `${Math.max(0, Math.min(offset, 98))}%`,
              width: `${Math.max(width, 1.5)}%`,
              backgroundColor: color,
              boxShadow: isSlow ? "0 0 10px rgba(244,63,94,0.5)" : "0 0 10px rgba(6,182,212,0.4)",
            }}
          />
        </div>

        {/* Duration badge */}
        <span
          className={`text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-md border w-16 text-right ${
            isSlow
              ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
              : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
          }`}
        >
          {dur.toFixed(0)}ms
        </span>
      </div>

      {/* Hover tooltip with attributes */}
      {hovered && span.attributes && Object.keys(span.attributes).length > 0 && (
        <div className="absolute left-[240px] top-0 z-50 bg-[#091020] border border-cyan-500/30 rounded-xl p-3 shadow-[0_0_25px_rgba(0,0,0,0.8)] text-xs font-mono min-w-[240px]">
          <div className="text-[10px] uppercase text-cyan-400 font-bold mb-1.5 pb-1 border-b border-white/[0.08]">
            Span Attributes
          </div>
          {Object.entries(span.attributes).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-2 py-0.5 text-slate-300">
              <span className="text-slate-500 text-[11px]">{k}:</span>
              <span className="text-cyan-200 text-[11px] truncate max-w-[180px]">
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TraceWaterfall({
  traceId,
  onClose,
}: {
  traceId: string;
  onClose: () => void;
}) {
  const { data, isLoading, isError } = useTrace(traceId);

  const traceStart = data?.spans?.[0]?.start_time
    ? new Date(data.spans[0].start_time).getTime()
    : 0;

  const totalMs = data?.duration_ms ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[85vh] bg-[#091020]/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-mono text-slate-100">
                Distributed Trace Waterfall
              </h3>
              <p className="text-[11px] text-cyan-400 font-mono">
                Trace ID: {traceId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <span className="text-xs font-mono text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                {data.span_count} spans · {totalMs.toFixed(0)}ms total
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scale Timeline Header */}
        {data && totalMs > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-white/[0.06] bg-black/60 font-mono text-[11px]">
            <span className="text-slate-400 w-[220px] shrink-0">
              Span Operation
            </span>
            <div className="flex-1 flex justify-between text-[10px] text-slate-500">
              <span>0ms</span>
              <span>{(totalMs / 2).toFixed(0)}ms</span>
              <span>{totalMs.toFixed(0)}ms</span>
            </div>
            <span className="text-slate-400 w-16 text-right shrink-0">
              Duration
            </span>
          </div>
        )}

        {/* Spans stream */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {isLoading && (
            <div className="flex items-center justify-center py-20 gap-3 text-cyan-300 font-mono text-xs">
              <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
              Ingesting distributed span waterfall...
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-slate-200 text-xs font-mono font-bold">
                Failed to load trace telemetry
              </p>
              <p className="text-slate-400 text-[11px] font-mono mt-1">
                The trace span records may have expired or were not recorded with distributed tracing enabled.
              </p>
            </div>
          )}

          {data && data.spans.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-xs font-mono">
              No span records found for this trace ID.
            </div>
          )}

          {data?.spans.map((span) => (
            <SpanRow
              key={span.span_id}
              span={span}
              totalMs={totalMs}
              traceStart={traceStart}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-white/[0.08] bg-black/40 flex items-center gap-4 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            Normal Latency (&lt;500ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            Latency Bottleneck (&gt;500ms)
          </span>
          <span className="ml-auto text-slate-500 text-[10px]">
            Hover span to inspect telemetry attributes
          </span>
        </div>
      </div>
    </div>
  );
}
