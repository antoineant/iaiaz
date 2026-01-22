"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Target, BookOpen, Brain, Zap, AlertCircle, CheckCircle } from "lucide-react";

// Types matching the API response
interface NLPBreakdown {
  clarity: number;
  context: number;
  sophistication: number;
  actionability: number;
  overall: number;
  messageCount: number;
}

interface ExamplePrompt {
  content: string;
  overall: number;
  topic?: string;
}

interface ExamplesByTier {
  low: ExamplePrompt[];
  medium: ExamplePrompt[];
  high: ExamplePrompt[];
}

// ================================
// Prompt Quality Breakdown Component
// ================================

interface PromptQualityBreakdownProps {
  breakdown: NLPBreakdown | null;
  analyzedCount: number;
  totalMessages: number;
}

const dimensionConfig = {
  clarity: {
    icon: Target,
    color: "bg-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
  },
  context: {
    icon: BookOpen,
    color: "bg-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-400",
  },
  sophistication: {
    icon: Brain,
    color: "bg-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
  },
  actionability: {
    icon: Zap,
    color: "bg-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
  },
};

export function PromptQualityBreakdown({
  breakdown,
  analyzedCount,
  totalMessages,
}: PromptQualityBreakdownProps) {
  const t = useTranslations("org.classes.analytics.promptQuality");

  if (!breakdown) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t("breakdownTitle")}</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noData")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dimensions = [
    { key: "clarity" as const, value: breakdown.clarity },
    { key: "context" as const, value: breakdown.context },
    { key: "sophistication" as const, value: breakdown.sophistication },
    { key: "actionability" as const, value: breakdown.actionability },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{t("breakdownTitle")}</h2>
          <span className="text-sm text-[var(--muted-foreground)]">
            {t("analyzed", { count: analyzedCount, total: totalMessages })}
          </span>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("breakdownSubtitle")}
        </p>
      </CardHeader>
      <CardContent>
        {/* Overall score */}
        <div className="mb-6 p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{t("overallScore")}</span>
            <span className="text-2xl font-bold">{breakdown.overall}/100</span>
          </div>
          <div className="h-3 bg-[var(--background)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                breakdown.overall >= 70
                  ? "bg-green-500"
                  : breakdown.overall >= 40
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${breakdown.overall}%` }}
            />
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="space-y-4">
          {dimensions.map(({ key, value }) => {
            const config = dimensionConfig[key];
            const Icon = config.icon;

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                      <Icon className={`w-4 h-4 ${config.textColor}`} />
                    </div>
                    <span className="text-sm font-medium">{t(`dimensions.${key}`)}</span>
                  </div>
                  <span className="text-sm font-semibold">{value}/100</span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.color} rounded-full transition-all`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t(`dimensionDesc.${key}`)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// Example Prompts by Tier Component
// ================================

interface ExamplePromptsByTierProps {
  examples: ExamplesByTier;
}

const tierConfig = {
  high: {
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  medium: {
    icon: AlertCircle,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  low: {
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};

export function ExamplePromptsByTier({ examples }: ExamplePromptsByTierProps) {
  const t = useTranslations("org.classes.analytics.promptQuality");

  const hasExamples =
    examples.low.length > 0 ||
    examples.medium.length > 0 ||
    examples.high.length > 0;

  if (!hasExamples) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t("examplesTitle")}</h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noExamples")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tiers: Array<{ key: keyof ExamplesByTier; label: string }> = [
    { key: "high", label: t("tierHigh") },
    { key: "medium", label: t("tierMedium") },
    { key: "low", label: t("tierLow") },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="font-semibold">{t("examplesTitle")}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("examplesSubtitle")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tiers.map(({ key, label }) => {
            const tierExamples = examples[key];
            const config = tierConfig[key];
            const Icon = config.icon;

            if (tierExamples.length === 0) return null;

            return (
              <div
                key={key}
                className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}
              >
                <div className={`flex items-center gap-2 mb-3 ${config.color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{label}</span>
                  <span className="text-xs opacity-75">
                    ({key === "high" ? "> 70" : key === "medium" ? "40-70" : "< 40"})
                  </span>
                </div>
                <div className="space-y-2">
                  {tierExamples.map((example, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded bg-[var(--background)] text-sm"
                    >
                      <p className="italic text-[var(--foreground)]">
                        &ldquo;{example.content}&rdquo;
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
                        <span>{t("score")}: {example.overall}</span>
                        {example.topic && (
                          <>
                            <span>•</span>
                            <span>{example.topic}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// Combined Prompt Quality Section
// ================================

interface PromptQualitySectionProps {
  breakdown: NLPBreakdown | null;
  examples: ExamplesByTier;
  analyzedCount: number;
  totalMessages: number;
}

export function PromptQualitySection({
  breakdown,
  examples,
  analyzedCount,
  totalMessages,
}: PromptQualitySectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PromptQualityBreakdown
        breakdown={breakdown}
        analyzedCount={analyzedCount}
        totalMessages={totalMessages}
      />
      <ExamplePromptsByTier examples={examples} />
    </div>
  );
}
