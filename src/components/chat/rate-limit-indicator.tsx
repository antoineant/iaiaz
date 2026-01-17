"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Clock, AlertTriangle, Check } from "lucide-react";
import type { ModelTier } from "@/lib/rate-limiter";

interface RateLimitIndicatorProps {
  remaining: number;
  limit: number;
  tier: ModelTier;
  resetAt?: string;
}

export function RateLimitIndicator({
  remaining,
  limit,
  tier,
  resetAt,
}: RateLimitIndicatorProps) {
  const t = useTranslations("chat.rateLimit");
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!resetAt || remaining > 0) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const reset = new Date(resetAt).getTime();
      const seconds = Math.max(0, Math.ceil((reset - now) / 1000));
      setCountdown(seconds);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [resetAt, remaining]);

  const percentage = (remaining / limit) * 100;
  const isLow = remaining <= 2;
  const isExhausted = remaining === 0;

  const tierLabels: Record<ModelTier, string> = {
    economy: t("eco"),
    standard: t("std"),
    premium: t("pro"),
  };

  if (isExhausted && countdown !== null) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs">
        <Clock className="w-3 h-3" />
        <span>{t("retryIn", { countdown })}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
        isLow
          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
      }`}
      title={t("tooltip", { remaining, limit, tier: tierLabels[tier] })}
    >
      {isLow ? (
        <AlertTriangle className="w-3 h-3" />
      ) : (
        <Check className="w-3 h-3" />
      )}
      <span>
        {t("remaining", { remaining, limit })}
      </span>
      <span className="opacity-70">• {tierLabels[tier]}</span>
    </div>
  );
}

// Compact version for tight spaces
export function RateLimitBadge({
  remaining,
  limit,
  tier,
}: {
  remaining: number;
  limit: number;
  tier: ModelTier;
}) {
  const isLow = remaining <= 2;
  const isExhausted = remaining === 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
        isExhausted
          ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          : isLow
            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
      }`}
      title={`${remaining}/${limit} requêtes/min`}
    >
      {remaining}/{limit}
    </span>
  );
}
