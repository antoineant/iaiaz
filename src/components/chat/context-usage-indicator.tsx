"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_CONTEXT = 200000;
const WARNING_THRESHOLD = 180000; // 90% - show yellow warning
const CRITICAL_THRESHOLD = 190000; // 95% - show red + suggest new conversation

interface ContextUsageIndicatorProps {
  totalTokens: number;
  onSuggestNewConversation: () => void;
  className?: string;
}

export function ContextUsageIndicator({
  totalTokens,
  onSuggestNewConversation,
  className,
}: ContextUsageIndicatorProps) {
  const t = useTranslations("chat.contextUsage");

  // Don't show anything until we've used at least 50K tokens
  if (totalTokens < 50000) return null;

  const percentage = Math.min((totalTokens / MAX_CONTEXT) * 100, 100);
  const isWarning = totalTokens >= WARNING_THRESHOLD;
  const isCritical = totalTokens >= CRITICAL_THRESHOLD;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className={cn("px-4 py-2", className)}>
      <div
        className={cn(
          "rounded-lg border p-3 transition-colors",
          isCritical
            ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
            : isWarning
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
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
                    : "text-blue-700 dark:text-blue-300"
              )}
            >
              {t("title")}
            </span>
          </div>
          <span
            className={cn(
              "text-xs font-mono",
              isCritical
                ? "text-red-600 dark:text-red-400"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-blue-600 dark:text-blue-400"
            )}
          >
            {formatTokens(totalTokens)} / {formatTokens(MAX_CONTEXT)}
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
                : "text-blue-600 dark:text-blue-400"
          )}
        >
          {isCritical ? t("critical") : isWarning ? t("warning") : t("info")}
        </p>

        {/* Action button for critical */}
        {isCritical && (
          <button
            onClick={onSuggestNewConversation}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {t("suggestNew")}
          </button>
        )}
      </div>
    </div>
  );
}
