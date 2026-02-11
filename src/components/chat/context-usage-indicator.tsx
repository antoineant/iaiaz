"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Brain, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextUsageIndicatorProps {
  totalTokens: number;
  maxContext: number;
  onSuggestNewConversation: () => void;
  className?: string;
}

export function ContextUsageIndicator({
  totalTokens,
  maxContext,
  onSuggestNewConversation,
  className,
}: ContextUsageIndicatorProps) {
  const t = useTranslations("chat.contextUsage");
  const [isExpanded, setIsExpanded] = useState(false);
  const expandedRef = useRef<HTMLDivElement>(null);

  // Calculate thresholds based on model's context window
  const warningThreshold = Math.floor(maxContext * 0.90);
  const criticalThreshold = Math.floor(maxContext * 0.95);
  const minShowThreshold = Math.min(Math.floor(maxContext * 0.25), 50000);

  const percentage = Math.min((totalTokens / maxContext) * 100, 100);
  const isWarning = totalTokens >= warningThreshold;
  const isCritical = totalTokens >= criticalThreshold;
  const shouldShow = totalTokens >= minShowThreshold;

  // Close expanded view when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (expandedRef.current && !expandedRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isExpanded]);

  // Auto-expand when critical
  useEffect(() => {
    if (isCritical && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isCritical, isExpanded]);

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  // Don't render if below threshold
  if (!shouldShow) return null;

  return (
    <div className={cn("relative flex justify-end px-4 py-1", className)}>
      {/* Collapsed pill */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all hover:scale-105",
            isCritical
              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              : isWarning
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
          )}
        >
          {isCritical ? (
            <AlertTriangle className="w-3 h-3" />
          ) : isWarning ? (
            <AlertTriangle className="w-3 h-3" />
          ) : (
            <Brain className="w-3 h-3" />
          )}
          <span className="font-mono">{Math.round(percentage)}%</span>
        </button>
      )}

      {/* Expanded panel */}
      {isExpanded && (
        <div
          ref={expandedRef}
          className={cn(
            "absolute bottom-full right-4 mb-2 w-72 rounded-lg border shadow-lg p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200",
            isCritical
              ? "bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800"
              : isWarning
                ? "bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-800"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isCritical ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Brain className="w-4 h-4 text-blue-500" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isCritical
                    ? "text-red-700 dark:text-red-300"
                    : isWarning
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-gray-700 dark:text-gray-300"
                )}
              >
                {t("title")}
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Token count */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("tokensUsed")}
            </span>
            <span
              className={cn(
                "text-xs font-mono",
                isCritical
                  ? "text-red-600 dark:text-red-400"
                  : isWarning
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-gray-600 dark:text-gray-400"
              )}
            >
              {formatTokens(totalTokens)} / {formatTokens(maxContext)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-2">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCritical
                  ? "bg-red-500"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-blue-500"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Message */}
          <p
            className={cn(
              "text-xs",
              isCritical
                ? "text-red-600 dark:text-red-400"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-gray-500 dark:text-gray-400"
            )}
          >
            {isCritical ? t("critical") : isWarning ? t("warning") : t("info")}
          </p>

          {/* Action button for critical */}
          {isCritical && (
            <button
              onClick={() => {
                onSuggestNewConversation();
                setIsExpanded(false);
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {t("suggestNew")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
