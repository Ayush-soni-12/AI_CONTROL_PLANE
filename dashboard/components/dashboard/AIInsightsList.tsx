"use client";

import { AIInsight } from "@/lib/types";
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Clock,
  Sparkles,
} from "lucide-react";

interface AIInsightsListProps {
  insights: AIInsight[];
  isLoading?: boolean;
}

export function AIInsightsList({ insights, isLoading }: AIInsightsListProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-800/50 rounded-xl" />
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-block p-6 rounded-2xl bg-gray-800/50 mb-4">
          <Sparkles className="w-16 h-16 text-gray-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          No Insights Yet
        </h3>
        <p className="text-gray-500">
          AI-generated insights will appear here as your services are analyzed.
        </p>
      </div>
    );
  }

  const getInsightConfig = (type: AIInsight["insight_type"]) => {
    switch (type) {
      case "pattern":
        return {
          icon: TrendingUp,
          iconColor: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          label: "Pattern Detected",
          labelColor: "text-blue-400",
        };
      case "anomaly":
        return {
          icon: AlertTriangle,
          iconColor: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          label: "Anomaly",
          labelColor: "text-red-400",
        };
      case "recommendation":
        return {
          icon: Lightbulb,
          iconColor: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          label: "Recommendation",
          labelColor: "text-green-400",
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

  return (
    <div className="space-y-4">
      {insights.map((insight) => {
        const config = getInsightConfig(insight.insight_type);
        const Icon = config.icon;

        return (
          <div
            key={insight.id}
            className={`group relative rounded-2xl backdrop-blur-sm border ${config.borderColor} ${config.bgColor} hover:border-opacity-60 transition-all duration-300 overflow-hidden`}
          >
            {/* Animated gradient on hover */}
            <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            <div className="relative p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                {/* Icon */}
                <div
                  className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}
                >
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`text-sm font-semibold ${config.labelColor}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-sm text-gray-400 font-mono">
                      {insight.service_name}
                    </span>
                    {insight.confidence !== null && (
                      <>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-base text-gray-300 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(insight.created_at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
