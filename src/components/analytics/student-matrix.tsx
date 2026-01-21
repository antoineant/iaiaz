"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HelpCircle, X, TrendingUp, Brain, AlertTriangle, Zap } from "lucide-react";
import type { Quadrant, QuadrantSummary } from "@/lib/analytics/student-metrics";

interface StudentMatrixProps {
  quadrants: QuadrantSummary[];
  totalStudents: number;
  periodDays: number;
}

const quadrantConfig: Record<
  Quadrant,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
    icon: React.ReactNode;
    position: string;
  }
> = {
  ideal: {
    color: "text-green-700 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    dotColor: "bg-green-500",
    icon: <TrendingUp className="w-4 h-4" />,
    position: "top-right",
  },
  train_ai: {
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    dotColor: "bg-yellow-500",
    icon: <Brain className="w-4 h-4" />,
    position: "top-left",
  },
  at_risk: {
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    dotColor: "bg-red-500",
    icon: <AlertTriangle className="w-4 h-4" />,
    position: "bottom-left",
  },
  superficial: {
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    dotColor: "bg-orange-500",
    icon: <Zap className="w-4 h-4" />,
    position: "bottom-right",
  },
};

export function StudentMatrix({
  quadrants,
  totalStudents,
  periodDays,
}: StudentMatrixProps) {
  const t = useTranslations("org.classes.analytics.matrix");
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Get quadrant data by key
  const getQuadrant = (key: Quadrant) =>
    quadrants.find((q) => q.quadrant === key) || { quadrant: key, count: 0, students: [] };

  const renderQuadrantCell = (quadrant: Quadrant) => {
    const data = getQuadrant(quadrant);
    const config = quadrantConfig[quadrant];
    const isSelected = selectedQuadrant === quadrant;

    return (
      <button
        onClick={() => setSelectedQuadrant(isSelected ? null : quadrant)}
        className={`
          relative p-4 rounded-lg border-2 transition-all h-full min-h-[140px]
          ${config.bgColor} ${config.borderColor}
          ${isSelected ? "ring-2 ring-primary-500 ring-offset-2" : "hover:border-opacity-80"}
        `}
      >
        {/* Quadrant label */}
        <div className={`flex items-center gap-1.5 mb-3 ${config.color}`}>
          {config.icon}
          <span className="text-sm font-medium">{t(`quadrants.${quadrant}`)}</span>
        </div>

        {/* Student dots */}
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[40px]">
          {data.students.slice(0, 12).map((student, idx) => (
            <div
              key={student.userId}
              className={`w-3 h-3 rounded-full ${config.dotColor} opacity-80 hover:opacity-100 transition-opacity`}
              title={`${student.name}: AI ${Math.round(student.aiLiteracyScore)}%, Engagement ${Math.round(student.domainEngagementScore)}%`}
            />
          ))}
          {data.students.length > 12 && (
            <div className={`w-3 h-3 rounded-full ${config.dotColor} opacity-50 flex items-center justify-center text-[8px] text-white font-bold`}>
              +
            </div>
          )}
        </div>

        {/* Count */}
        <div className={`text-sm ${config.color}`}>
          <span className="font-semibold">{data.count}</span>{" "}
          <span className="opacity-75">
            {data.count === 1 ? t("student") : t("students")}
          </span>
        </div>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("subtitle", { count: totalStudents, days: periodDays })}
          </p>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
          aria-label={t("help")}
        >
          <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
        </button>
      </CardHeader>

      <CardContent>
        {/* Help panel */}
        {showHelp && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-blue-700 dark:text-blue-400">
                {t("helpTitle")}
              </h3>
              <button onClick={() => setShowHelp(false)}>
                <X className="w-4 h-4 text-blue-500" />
              </button>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
              {t("helpDescription")}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>{t("helpIdeal")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>{t("helpTrainAI")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{t("helpAtRisk")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>{t("helpSuperficial")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Matrix grid */}
        <div className="relative">
          {/* Y-axis label */}
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full">
            <div className="transform -rotate-90 whitespace-nowrap text-xs text-[var(--muted-foreground)] font-medium">
              {t("yAxisLabel")} →
            </div>
          </div>

          {/* X-axis label */}
          <div className="text-center mb-2">
            <span className="text-xs text-[var(--muted-foreground)] font-medium">
              {t("xAxisLabel")} →
            </span>
          </div>

          {/* 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3 ml-4">
            {/* Top row: train_ai (left) | ideal (right) */}
            {renderQuadrantCell("train_ai")}
            {renderQuadrantCell("ideal")}

            {/* Bottom row: at_risk (left) | superficial (right) */}
            {renderQuadrantCell("at_risk")}
            {renderQuadrantCell("superficial")}
          </div>
        </div>

        {/* Selected quadrant details */}
        {selectedQuadrant && (
          <div className="mt-4 p-4 rounded-lg bg-[var(--muted)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-medium ${quadrantConfig[selectedQuadrant].color}`}>
                {t(`quadrants.${selectedQuadrant}`)} - {t("studentList")}
              </h3>
              <button
                onClick={() => setSelectedQuadrant(null)}
                className="p-1 rounded hover:bg-[var(--background)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {getQuadrant(selectedQuadrant).students.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("noStudents")}
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {getQuadrant(selectedQuadrant).students.map((student) => (
                  <div
                    key={student.userId}
                    className="flex items-center justify-between p-2 rounded bg-[var(--background)]"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${quadrantConfig[selectedQuadrant].dotColor}`}
                      />
                      <span className="text-sm font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span title={t("aiLiteracy")}>
                        AI: {Math.round(student.aiLiteracyScore)}%
                      </span>
                      <span title={t("domainEngagement")}>
                        Eng: {Math.round(student.domainEngagementScore)}%
                      </span>
                      <span>{student.totalMessages} msg</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quadrant-specific recommendation */}
            <div className="mt-3 pt-3 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                <span className="font-medium">{t("recommendation")}:</span>{" "}
                {t(`recommendations.${selectedQuadrant}`)}
              </p>
            </div>
          </div>
        )}

        {/* Quick stats footer */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">
            {t("clickToExpand")}
          </span>
          {getQuadrant("at_risk").count > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              {t("atRiskAlert", { count: getQuadrant("at_risk").count })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
