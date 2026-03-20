"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

import { useTrace, Span } from "../../../hooks/useTraces";

// ─── Waterfall bar ───────────────────────────────────────────────────────────

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
  const width = totalMs > 0 ? Math.max((dur / totalMs) * 100, 0.5) : 0;

  const color = span.is_slow ? "#ef4444" : "#7c3aed";
  const bgColor = span.is_slow ? "#fef2f2" : "#f5f3ff";
  const indent = span.depth * 16;

  return (
    <div className="group relative">
      {/* Operation label */}
      <div
        className="flex items-center gap-2 py-1 px-2 rounded-lg transition-colors hover:bg-gray-800/40"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Indentation */}
        <div style={{ minWidth: `${indent + 4}px` }} />

        {/* Operation name */}
        <span
          className="text-[12px] font-medium truncate"
          style={{
            color: span.is_slow ? "#ef4444" : "#d1d5db",
            minWidth: "180px",
            maxWidth: "200px",
          }}
        >
          {span.is_slow ? "🔴 " : "✅ "}
          {span.operation}
        </span>

        {/* Waterfall bar track */}
        <div className="flex-1 relative h-5 rounded overflow-hidden bg-gray-800/40">
          <div
            className="absolute top-0 h-full rounded transition-all"
            style={{
              left: `${Math.max(0, Math.min(offset, 99))}%`,
              width: `${Math.max(width, 0.5)}%`,
              background: color,
              opacity: 0.8,
            }}
          />
        </div>

        {/* Duration badge */}
        <span
          className="text-[11px] font-mono font-semibold shrink-0 px-2 py-0.5 rounded-full"
          style={{
            color,
            background: bgColor,
            border: `1px solid ${color}30`,
          }}
        >
          {dur.toFixed(0)}ms
        </span>
      </div>

      {/* Hover tooltip */}
      {hovered && span.attributes && Object.keys(span.attributes).length > 0 && (
        <div
          className="absolute left-[200px] top-0 z-50 bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl text-xs"
          style={{ minWidth: "200px" }}
        >
          {Object.entries(span.attributes).map(([k, v]) => (
            <div key={k} className="flex gap-2 text-gray-300">
              <span className="text-gray-500">{k}:</span>
              <span className="font-mono">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-3xl max-h-[85vh] bg-gray-900 border border-gray-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/70">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🔍 Request Trace
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
              {traceId.substring(0, 16)}...
            </p>
          </div>
          {data && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {data.span_count} spans · {totalMs.toFixed(0)}ms total
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          )}
          {!data && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scale row */}
        {data && totalMs > 0 && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-800/50 bg-gray-900/60">
            <span
              className="text-[11px] text-gray-500"
              style={{ minWidth: "204px" }}
            >
              Operation
            </span>
            <div className="flex-1 flex justify-between text-[10px] text-gray-600 font-mono">
              <span>0</span>
              <span>{(totalMs / 2).toFixed(0)}ms</span>
              <span>{totalMs.toFixed(0)}ms</span>
            </div>
            <span className="text-[11px] text-gray-600 w-16 text-right">
              Duration
            </span>
          </div>
        )}

        {/* Spans */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full" />
              Loading trace...
            </div>
          )}

          {isError && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">😕</span>
              <p className="text-gray-400 text-sm">
                Couldn&apos;t load trace data.
              </p>
              <p className="text-gray-600 text-xs mt-1">
                The trace may have expired or tracing was not enabled for this
                request.
              </p>
            </div>
          )}

          {data && data.spans.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">📭</span>
              <p className="text-gray-400 text-sm">No spans found for this trace.</p>
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
        <div className="px-5 py-3 border-t border-gray-800/70 flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#7c3aed] inline-block" />
            Fast (&lt;500ms)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444] inline-block" />
            Slow (&gt;500ms)
          </span>
          <span className="ml-auto text-gray-700">
            Hover a span for details
          </span>
        </div>
      </div>
    </div>
  );
}
