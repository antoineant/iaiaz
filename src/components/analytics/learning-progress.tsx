"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BookOpen,
  Brain,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Lightbulb,
} from "lucide-react";

// Types matching the API response
interface TopicCoverage {
  topic_id: string;
  topic_title: string;
  parent_id: string | null;
  message_count: number;
  percentage: number;
  avg_bloom_level: string | null;
  avg_topic_confidence: number | null;
}

interface BloomDistribution {
  remember: number;
  understand: number;
  apply: number;
  analyze: number;
  evaluate: number;
  create: number;
}

interface ProgressOverTime {
  date: string;
  topics_covered: number;
  avg_bloom_level: string | null;
  message_count: number;
}

// Bloom level colors and labels
const BLOOM_CONFIG = {
  remember: {
    color: "bg-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    level: 1,
  },
  understand: {
    color: "bg-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-700 dark:text-orange-400",
    level: 2,
  },
  apply: {
    color: "bg-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-700 dark:text-yellow-400",
    level: 3,
  },
  analyze: {
    color: "bg-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    level: 4,
  },
  evaluate: {
    color: "bg-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-700 dark:text-blue-400",
    level: 5,
  },
  create: {
    color: "bg-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-700 dark:text-purple-400",
    level: 6,
  },
};

type BloomLevel = keyof typeof BLOOM_CONFIG;

// ================================
// Topic Coverage Chart Component
// ================================

interface TopicCoverageChartProps {
  topics: TopicCoverage[];
  totalMessages: number;
}

export function TopicCoverageChart({
  topics,
  totalMessages,
}: TopicCoverageChartProps) {
  const t = useTranslations("org.classes.analytics.learning");

  // Sort by message count descending
  const sortedTopics = [...topics].sort(
    (a, b) => b.message_count - a.message_count
  );

  // Get max for scaling
  const maxCount = Math.max(...topics.map((t) => t.message_count), 1);

  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t("topicCoverage")}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-[var(--muted-foreground)]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t("noStructure")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t("topicCoverage")}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("topicCoverageDesc", { total: totalMessages })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTopics.map((topic) => {
            const widthPercent = (topic.message_count / maxCount) * 100;
            const bloomConfig = topic.avg_bloom_level
              ? BLOOM_CONFIG[topic.avg_bloom_level as BloomLevel]
              : null;

            return (
              <div key={topic.topic_id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {topic.parent_id && (
                        <span className="text-[var(--muted-foreground)]">
                          └{" "}
                        </span>
                      )}
                      {topic.topic_title}
                    </span>
                    {bloomConfig && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${bloomConfig.bgColor} ${bloomConfig.textColor}`}
                      >
                        {t(`bloom.${topic.avg_bloom_level}`)}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {topic.message_count} ({topic.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      bloomConfig?.color || "bg-primary-500"
                    }`}
                    style={{ width: `${widthPercent}%` }}
                  />
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
// Bloom Distribution Chart Component
// ================================

interface BloomDistributionChartProps {
  distribution: BloomDistribution;
}

export function BloomDistributionChart({
  distribution,
}: BloomDistributionChartProps) {
  const t = useTranslations("org.classes.analytics.learning");

  const total = Object.values(distribution).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            {t("bloomDistribution")}
          </h2>
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

  const levels: BloomLevel[] = [
    "remember",
    "understand",
    "apply",
    "analyze",
    "evaluate",
    "create",
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          {t("bloomDistribution")}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("bloomDistributionDesc")}
        </p>
      </CardHeader>
      <CardContent>
        {/* Stacked bar */}
        <div className="h-8 rounded-lg overflow-hidden flex mb-4">
          {levels.map((level) => {
            const count = distribution[level];
            const percent = total > 0 ? (count / total) * 100 : 0;
            if (percent === 0) return null;
            return (
              <div
                key={level}
                className={`${BLOOM_CONFIG[level].color} transition-all`}
                style={{ width: `${percent}%` }}
                title={`${t(`bloom.${level}`)}: ${count} (${Math.round(
                  percent
                )}%)`}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {levels.map((level) => {
            const count = distribution[level];
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;
            const config = BLOOM_CONFIG[level];

            return (
              <div
                key={level}
                className={`flex items-center gap-2 p-2 rounded ${config.bgColor}`}
              >
                <div className={`w-3 h-3 rounded ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-medium ${config.textColor}`}>
                    {t(`bloom.${level}`)}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {count} ({percent}%)
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bloom explanation */}
        <div className="mt-4 p-3 rounded-lg bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>{t("bloomExplanation")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// Uncovered Topics Alert Component
// ================================

interface UncoveredTopicsAlertProps {
  topics: Array<{ id: string; title: string }>;
}

export function UncoveredTopicsAlert({ topics }: UncoveredTopicsAlertProps) {
  const t = useTranslations("org.classes.analytics.learning");

  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-amber-800 dark:text-amber-300">
            {t("uncoveredTopics")} ({topics.length})
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            {t("uncoveredTopicsDesc")}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {topics.map((topic) => (
              <span
                key={topic.id}
                className="px-2 py-1 text-xs rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
              >
                {topic.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================
// Progress Over Time Chart Component
// ================================

interface ProgressOverTimeChartProps {
  progress: ProgressOverTime[];
}

export function ProgressOverTimeChart({
  progress,
}: ProgressOverTimeChartProps) {
  const t = useTranslations("org.classes.analytics.learning");

  if (progress.length === 0) {
    return null;
  }

  // Get max values for scaling
  const maxTopics = Math.max(...progress.map((p) => p.topics_covered), 1);
  const maxMessages = Math.max(...progress.map((p) => p.message_count), 1);

  // Only show last 14 days
  const recentProgress = progress.slice(-14);

  return (
    <Card>
      <CardHeader className="pb-2">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          {t("progressOverTime")}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("progressOverTimeDesc")}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-end gap-1">
          {recentProgress.map((day) => {
            const topicsHeight = (day.topics_covered / maxTopics) * 100;
            const bloomConfig = day.avg_bloom_level
              ? BLOOM_CONFIG[day.avg_bloom_level as BloomLevel]
              : null;

            return (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className={`w-full rounded-t-sm min-h-[4px] transition-all ${
                    bloomConfig?.color || "bg-primary-500"
                  }`}
                  style={{ height: `${Math.max(topicsHeight, 4)}%` }}
                  title={`${day.date}: ${day.topics_covered} topics, ${day.message_count} messages`}
                />
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {new Date(day.date).getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            <span>{t("topicsCovered")}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-r from-red-400 via-green-400 to-purple-400" />
            <span>{t("colorByBloom")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ================================
// Combined Learning Progress Section
// ================================

interface LearningProgressSectionProps {
  topicCoverage: TopicCoverage[];
  bloomDistribution: BloomDistribution;
  uncoveredTopics: Array<{ id: string; title: string }>;
  progressOverTime: ProgressOverTime[];
  totalAnalyzedMessages: number;
  hasStructure: boolean;
}

export function LearningProgressSection({
  topicCoverage,
  bloomDistribution,
  uncoveredTopics,
  progressOverTime,
  totalAnalyzedMessages,
  hasStructure,
}: LearningProgressSectionProps) {
  const t = useTranslations("org.classes.analytics.learning");

  // No course structure defined
  if (!hasStructure) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {t("title")}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-[var(--muted-foreground)] mb-2">
              {t("noStructure")}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("defineStructureHint")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {t("title")}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("description", { count: totalAnalyzedMessages })}
        </p>
      </div>

      {/* Uncovered topics alert */}
      <UncoveredTopicsAlert topics={uncoveredTopics} />

      {/* Main charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopicCoverageChart
          topics={topicCoverage}
          totalMessages={totalAnalyzedMessages}
        />
        <BloomDistributionChart distribution={bloomDistribution} />
      </div>

      {/* Progress over time */}
      {progressOverTime.length > 0 && (
        <ProgressOverTimeChart progress={progressOverTime} />
      )}
    </div>
  );
}
