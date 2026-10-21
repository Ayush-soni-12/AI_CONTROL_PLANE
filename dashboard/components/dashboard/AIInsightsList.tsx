"use client";

import { AIInsight } from "@/lib/types";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Clock,
  Brain,
} from "lucide-react";

interface AIInsightsListProps {
  insights: AIInsight[];
  isLoading?: boolean;
}

export function AIInsightsList({ insights, isLoading }: AIInsightsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 rounded-xl bg-[#091020]/60 border border-white/5 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-20 rounded-xl bg-[#091020]/40 border border-white/5">
        <div className="inline-block p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-3">
          <Lightbulb className="w-8 h-8 text-cyan-400" />
        </div>
        <h3 className="text-base font-semibold font-sans text-slate-200 mb-1">
          No Cognitive Insights Yet
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
          As telemetry flows through your microservices, the AI cognitive engine analyzes traffic variance and generates real-time recommendations.
        </p>
      </div>
    );
  }

  const getInsightConfig = (type: AIInsight["insight_type"]) => {
    switch (type) {
      case "pattern":
        return {
          icon: TrendingUp,
          iconColor: "text-cyan-400",
          iconBg: "bg-cyan-500/10 border-cyan-500/30",
          cardBorder: "border-cyan-500/20 hover:border-cyan-500/40",
          badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
          label: "Pattern Detected",
        };
      case "anomaly":
        return {
          icon: AlertTriangle,
          iconColor: "text-rose-400",
          iconBg: "bg-rose-500/10 border-rose-500/30",
          cardBorder: "border-rose-500/20 hover:border-rose-500/40",
          badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/30",
          label: "Anomaly Flagged",
        };
      case "recommendation":
        return {
          icon: Lightbulb,
          iconColor: "text-emerald-400",
          iconBg: "bg-emerald-500/10 border-emerald-500/30",
          cardBorder: "border-emerald-500/20 hover:border-emerald-500/40",
          badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
          label: "Recommendation",
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Helper to cleanly parse bulleted or key-value text in descriptions
  const renderFormattedDescription = (text: string) => {
    if (text.includes("•")) {
      const parts = text
        .split("•")
        .map((p) => p.trim())
        .filter(Boolean);

      return (
        <div className="space-y-2 mt-2">
          {parts.map((part, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#070a13] border border-white/5 text-xs font-sans leading-relaxed text-slate-300"
            >
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <div>{part}</div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans mt-2">
        {text}
      </p>
    );
  };

  return (
    <div className="space-y-4">
      {insights.map((insight) => {
        const config = getInsightConfig(insight.insight_type);
        const Icon = config.icon;

        return (
          <div
            key={insight.id}
            className={`group relative rounded-xl bg-[#091020] border ${config.cardBorder} transition-colors duration-200 overflow-hidden`}
          >
            <div className="p-5 sm:p-6">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border ${config.iconBg} ${config.iconColor} shrink-0`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-sans font-semibold border ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs font-mono text-slate-300 font-medium">
                        {insight.service_name}
                      </span>
                    </div>
                  </div>
                </div>

                {insight.confidence !== null && (
                  <div className="px-2.5 py-1 rounded-full bg-[#070a13] border border-white/8 text-[11px] font-mono tabular-nums text-slate-300 flex items-center gap-1.5 font-medium">
                    <Brain className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{(insight.confidence * 100).toFixed(0)}% Confidence</span>
                  </div>
                )}
              </div>

              {/* Formatted Content Body */}
              {renderFormattedDescription(insight.description)}

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/4 text-xs font-sans text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Emitted <strong className="font-mono tabular-nums text-slate-300 font-normal">{formatDate(insight.created_at)}</strong></span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span>Engine:</span>
                  <span className="text-cyan-400 font-medium">Gemini Pro Reasoning</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
