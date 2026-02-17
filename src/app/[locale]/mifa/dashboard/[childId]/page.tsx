"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Leaf,
  AlertTriangle,
  Shield,
  Moon,
  BookOpen,
  TrendingUp,
  Flag,
  Clock,
  Info,
  Sparkles,
} from "lucide-react";
import { getThemeColor } from "@/lib/mifa/theme";

// ── Types ──────────────────────────────────────────────────────────────

interface ChildAnalytics {
  child: {
    displayName: string;
    birthdate: string | null;
    schoolYear: string | null;
    accentColor: string | null;
    supervisionMode: string | null;
    ageBracket: string | null;
  };
  controls: {
    dailyCreditLimit: number | null;
    cumulativeCredits: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
  };
  period: { days: number; startDate: string; endDate: string };
  totals: {
    conversations: number;
    cost: number;
    messages: number;
    co2Grams: number;
  };
  dailyActivity: Array<{
    date: string;
    conversations: number;
    cost: number;
    messages: number;
  }>;
  subjectBreakdown: Array<{
    subject: string;
    count: number;
    struggleCount: number;
  }>;
  activityTypes: Array<{ type: string; count: number }>;
  topTopics: Array<{
    topic: string;
    subject: string;
    count: number;
    struggleRatio: number;
  }>;
  usageHeatmap: Array<{ dayOfWeek: number; hour: number; count: number }>;
  flags: Array<{
    id: string;
    flagType: string;
    flagReason: string;
    createdAt: string;
    dismissed: boolean;
  }>;
  recentConversations: Array<{
    id: string;
    title: string;
    createdAt: string;
    model: string;
    cost: number;
    messageCount: number;
    subjects: string[];
    hasStruggle: boolean;
  }>;
}

// ── InfoTip ─────────────────────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group">
      <Info className="w-3.5 h-3.5 text-[var(--muted-foreground)] cursor-help" tabIndex={0} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-xs leading-relaxed max-w-60 w-max opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 z-20 shadow-lg">
        {text}
      </span>
    </span>
  );
}

// ── Color palette for subjects ─────────────────────────────────────────

const SUBJECT_COLORS = [
  "#818CF8", // periwinkle
  "#FF6B9D", // cherry blossom
  "#6EE7B7", // mint
  "#FDBA74", // peach
  "#C084FC", // violet
  "#FF6B6B", // coral
  "#5EEAD4", // teal
  "#FDE047", // lemon
  "#F472B6", // pink
  "#A78BFA", // lavender
];

function getSubjectColor(index: number) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────

function DailyBarChart({
  data,
  accentHex,
}: {
  data: ChildAnalytics["dailyActivity"];
  accentHex: string;
}) {
  const maxMessages = Math.max(...data.map((d) => d.messages), 1);
  const chartHeight = 120;
  const barGap = 6;
  // Use a wide viewBox so bars spread across the full width
  const barWidth = Math.max(16, Math.floor(800 / data.length) - barGap);
  const chartWidth = data.length * (barWidth + barGap) + 20;

  return (
    <div className="w-full" style={{ height: 180 }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        {data.map((d, i) => {
          const barH = Math.max(d.messages > 0 ? 4 : 0, (d.messages / maxMessages) * chartHeight);
          const x = 10 + i * (barWidth + barGap);
          const y = chartHeight - barH;
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={accentHex}
                opacity={0.85}
                className="transition-all duration-200 hover:opacity-100"
              />
              <title>{`${d.date}: ${d.messages} msg, ${d.conversations} conv`}</title>
              {(i % Math.max(1, Math.floor(data.length / 7)) === 0 || i === data.length - 1) && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  className="fill-[var(--muted-foreground)]"
                  fontSize="11"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── SVG Donut Chart ────────────────────────────────────────────────────

function SubjectDonut({
  subjects,
  totalLabel,
}: {
  subjects: ChildAnalytics["subjectBreakdown"];
  totalLabel: string;
}) {
  const total = subjects.reduce((s, sub) => s + sub.count, 0);
  if (total === 0) return null;

  const radius = 60;
  const stroke = 18;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        {subjects.map((subj, i) => {
          const pct = subj.count / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={subj.subject}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={getSubjectColor(i)}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
              className="transition-all duration-300"
            />
          );
        })}
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-[var(--foreground)] text-2xl font-bold"
          fontSize="24"
          fontWeight="bold"
        >
          {total}
        </text>
        <text
          x="80"
          y="94"
          textAnchor="middle"
          className="fill-[var(--muted-foreground)] text-xs"
          fontSize="11"
        >
          {totalLabel}
        </text>
      </svg>
    </div>
  );
}

// ── Usage Heatmap (CSS Grid) ───────────────────────────────────────────

function UsageHeatmap({
  data,
  accentHex,
  quietStart,
  quietEnd,
  t,
}: {
  data: ChildAnalytics["usageHeatmap"];
  accentHex: string;
  quietStart: string | null;
  quietEnd: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const dayLabels = [
    t("days.mon"),
    t("days.tue"),
    t("days.wed"),
    t("days.thu"),
    t("days.fri"),
    t("days.sat"),
    t("days.sun"),
  ];
  const timeBlocks = [
    { label: t("timeBlocks.morning"), hours: [6, 7, 8, 9, 10, 11] },
    { label: t("timeBlocks.afternoon"), hours: [12, 13, 14, 15, 16, 17] },
    { label: t("timeBlocks.evening"), hours: [18, 19, 20, 21] },
    { label: t("timeBlocks.night"), hours: [22, 23, 0, 1, 2, 3, 4, 5] },
  ];

  // Build lookup
  const lookup: Record<string, number> = {};
  for (const d of data) {
    lookup[`${d.dayOfWeek}-${d.hour}`] = d.count;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Quiet hours check
  const isQuietHour = (hour: number) => {
    if (!quietStart || !quietEnd) return false;
    const start = parseInt(quietStart.split(":")[0], 10);
    const end = parseInt(quietEnd.split(":")[0], 10);
    if (start > end) {
      return hour >= start || hour < end;
    }
    return hour >= start && hour < end;
  };

  // Aggregate: for each (day, timeBlock) sum the messages
  const cellCount = (day: number, hours: number[]) => {
    return hours.reduce((s, h) => s + (lookup[`${day}-${h}`] || 0), 0);
  };

  const blockMax = Math.max(
    ...timeBlocks.flatMap((tb) =>
      Array.from({ length: 7 }, (_, d) => cellCount(d, tb.hours))
    ),
    1
  );

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-1 min-w-[320px]">
        {/* Header row */}
        <div />
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-xs text-[var(--muted-foreground)] font-medium pb-1">
            {d}
          </div>
        ))}

        {/* Data rows */}
        {timeBlocks.map((tb) => (
          <div key={tb.label} className="contents">
            <div className="text-xs text-[var(--muted-foreground)] pr-2 flex items-center whitespace-nowrap">
              {tb.label}
            </div>
            {Array.from({ length: 7 }, (_, day) => {
              const count = cellCount(day, tb.hours);
              const intensity = count / blockMax;
              const hasQuiet = tb.hours.some(isQuietHour);
              return (
                <div
                  key={`${tb.label}-${day}`}
                  className="relative aspect-square rounded-md flex items-center justify-center text-xs font-medium min-h-[32px]"
                  style={{
                    backgroundColor: count > 0
                      ? `${accentHex}${Math.round(intensity * 200 + 30).toString(16).padStart(2, "0")}`
                      : "var(--muted)",
                  }}
                  title={`${dayLabels[day]} ${tb.label}: ${count} messages`}
                >
                  {count > 0 && (
                    <span className="text-[10px] font-semibold" style={{ color: intensity > 0.5 ? "#fff" : "var(--foreground)" }}>
                      {count}
                    </span>
                  )}
                  {hasQuiet && count > 0 && (
                    <Moon className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-amber-400" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Type Bars ─────────────────────────────────────────────────

function ActivityTypeBars({
  data,
  accentHex,
  t,
}: {
  data: ChildAnalytics["activityTypes"];
  accentHex: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const typeLabels: Record<string, string> = {
    homework: t("activityTypeLabels.homework"),
    revision: t("activityTypeLabels.revision"),
    creative: t("activityTypeLabels.creative"),
    essay: t("activityTypeLabels.essay"),
    general: t("activityTypeLabels.general"),
  };

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.type}>
          <div className="flex justify-between text-sm mb-1">
            <span className="capitalize">{typeLabels[item.type] || item.type}</span>
            <span className="text-[var(--muted-foreground)]">{item.count}</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[var(--muted)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                backgroundColor: accentHex,
                opacity: 0.85,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page Component ────────────────────────────────────────────────

interface Suggestion {
  emoji: string;
  title: string;
  body: string;
  category: "struggle" | "usage" | "safety" | "encouragement";
}

export default function ChildAnalyticsPage() {
  const t = useTranslations("mifa.childAnalytics");
  const params = useParams();
  const childId = params.childId as string;
  const locale = useLocale();

  const [data, setData] = useState<ChildAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(7);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsGeneratedAt, setSuggestionsGeneratedAt] = useState<string | null>(null);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionsNoData, setSuggestionsNoData] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/mifa/child-analytics?childId=${childId}&days=${days}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Error loading child analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    // Reset suggestions when period changes
    setSuggestions([]);
    setSuggestionsGeneratedAt(null);
    setSuggestionsError(null);
    setSuggestionsNoData(false);
    load();
  }, [childId, days]);

  const handleGenerateSuggestions = useCallback(async () => {
    setIsSuggestionsLoading(true);
    setSuggestionsError(null);
    setSuggestionsNoData(false);
    try {
      const res = await fetch("/api/mifa/child-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, days, locale }),
      });
      if (!res.ok) throw new Error("Failed");
      const result = await res.json();
      if (result.noData) {
        setSuggestionsNoData(true);
        setSuggestions([]);
      } else {
        setSuggestions(result.suggestions || []);
        setSuggestionsGeneratedAt(result.generatedAt || null);
      }
    } catch {
      setSuggestionsError(t("suggestions.error"));
    } finally {
      setIsSuggestionsLoading(false);
    }
  }, [childId, days, locale, t]);

  const accentHex = useMemo(() => {
    return getThemeColor(data?.child.accentColor).hex;
  }, [data?.child.accentColor]);

  const accentLight = useMemo(() => {
    return getThemeColor(data?.child.accentColor).light;
  }, [data?.child.accentColor]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentHex }} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p className="text-[var(--muted-foreground)]">{t("notFound")}</p>
      </div>
    );
  }

  const { child, controls, totals, subjectBreakdown, activityTypes, topTopics, usageHeatmap, flags, recentConversations, dailyActivity } = data;

  // Struggle ratio
  const totalActivities = subjectBreakdown.reduce((s, sub) => s + sub.count, 0);
  const totalStruggles = subjectBreakdown.reduce((s, sub) => s + sub.struggleCount, 0);
  const struggleRatio = totalActivities > 0 ? totalStruggles / totalActivities : 0;
  const strugglePercent = Math.round(struggleRatio * 100);

  const struggleColor =
    strugglePercent < 20 ? "text-green-600" : strugglePercent < 50 ? "text-amber-500" : "text-red-500";
  const struggleBg =
    strugglePercent < 20
      ? "bg-green-100 dark:bg-green-900/30"
      : strugglePercent < 50
      ? "bg-amber-100 dark:bg-amber-900/30"
      : "bg-red-100 dark:bg-red-900/30";

  // Top struggling subject for insight
  const topStruggleSubject = subjectBreakdown
    .filter((s) => s.struggleCount > 0)
    .sort((a, b) => b.struggleCount - a.struggleCount)[0];

  const topStruggleTopic = topTopics
    .filter((tp) => tp.struggleRatio > 0)
    .sort((a, b) => b.struggleRatio * b.count - a.struggleRatio * a.count)[0];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* ── A. Header Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/mifa/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToDashboard")}
          </Button>
        </Link>

        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: accentHex }}
          >
            {child.displayName?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{child.displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              {child.schoolYear && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: accentLight, color: accentHex }}
                >
                  {child.schoolYear}
                </span>
              )}
              {child.supervisionMode && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    child.supervisionMode === "guided"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  {child.supervisionMode === "guided" ? t("guidedMode") : t("trustedMode")}
                </span>
              )}
              {child.ageBracket && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {child.ageBracket} {t("years")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Period toggle */}
        <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-1 self-start sm:self-center">
          <button
            onClick={() => setDays(7)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              days === 7
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t("last7days")}
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              days === 30
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {t("last30days")}
          </button>
        </div>
      </div>

      {/* ── B. KPI Strip ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">{t("kpi.conversations")} <InfoTip text={t("tips.conversations")} /></p>
                <p className="text-2xl font-bold mt-1">{totals.conversations}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentLight }}>
                <MessageSquare className="w-4 h-4" style={{ color: accentHex }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">{t("kpi.totalCost")} <InfoTip text={t("tips.totalCost")} /></p>
                <p className="text-2xl font-bold mt-1">{totals.cost.toFixed(2)}&euro;</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {t("kpi.dailyAvg")}: {(totals.cost / days).toFixed(3)}&euro;
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentLight }}>
                <TrendingUp className="w-4 h-4" style={{ color: accentHex }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">{t("kpi.struggleRatio")} <InfoTip text={t("tips.struggleRatio")} /></p>
                <p className={`text-2xl font-bold mt-1 ${struggleColor}`}>{strugglePercent}%</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${struggleBg}`}>
                <AlertTriangle className={`w-4 h-4 ${struggleColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">{t("kpi.co2Impact")} <InfoTip text={t("tips.co2Impact")} /></p>
                <p className="text-2xl font-bold mt-1">{totals.co2Grams.toFixed(1)}g</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Suggestions ──────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          {suggestions.length === 0 && !suggestionsNoData && !suggestionsError ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: accentLight }}
                >
                  <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
                </div>
                <p className="text-sm font-medium">{t("suggestions.title")}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={isSuggestionsLoading}
              >
                {isSuggestionsLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("suggestions.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {t("suggestions.generate")}
                  </>
                )}
              </Button>
            </div>
          ) : suggestionsNoData ? (
            <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <p>{t("suggestions.noData")}</p>
            </div>
          ) : suggestionsError ? (
            <div className="flex items-center gap-3 text-sm text-red-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <p>{suggestionsError}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: accentHex }} />
                  {t("suggestions.title")}
                </h2>
                <div className="flex items-center gap-2">
                  {suggestionsGeneratedAt && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {t("suggestions.lastGenerated", {
                        date: new Date(suggestionsGeneratedAt).toLocaleDateString(),
                      })}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateSuggestions}
                    disabled={isSuggestionsLoading}
                    className="h-7 px-2"
                  >
                    {isSuggestionsLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg bg-[var(--muted)] text-sm"
                  >
                    <span className="text-lg shrink-0">{s.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-[var(--muted-foreground)] mt-0.5 leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── C. Daily Activity Bar Chart ───────────────────── */}
      {dailyActivity.length > 0 && dailyActivity.some((d) => d.messages > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="font-semibold text-sm flex items-center gap-1">{t("sections.dailyActivity")} <InfoTip text={t("tips.dailyActivity")} /></h2>
          </CardHeader>
          <CardContent>
            <DailyBarChart data={dailyActivity} accentHex={accentHex} />
          </CardContent>
        </Card>
      )}

      {/* ── D. Learning Map ───────────────────────────────── */}
      {(subjectBreakdown.length > 0 || topTopics.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Subject Donut */}
          {subjectBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="font-semibold text-sm flex items-center gap-1">{t("sections.subjects")} <InfoTip text={t("tips.subjects")} /></h2>
              </CardHeader>
              <CardContent>
                <SubjectDonut subjects={subjectBreakdown} totalLabel={t("sections.sessions")} />
                {/* Legend */}
                <div className="mt-4 space-y-1.5">
                  {subjectBreakdown.map((subj, i) => (
                    <div key={subj.subject} className="flex items-center gap-2 text-sm">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: getSubjectColor(i) }}
                      />
                      <span className="capitalize flex-1">{subj.subject}</span>
                      <span className="text-[var(--muted-foreground)] text-xs">{subj.count}</span>
                      {subj.struggleCount > 0 && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Topics */}
          {topTopics.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="font-semibold text-sm">{t("sections.topTopics")}</h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {topTopics.map((tp) => {
                    const subjectIdx = subjectBreakdown.findIndex((s) => s.subject === tp.subject);
                    const color = getSubjectColor(subjectIdx >= 0 ? subjectIdx : 0);
                    const size =
                      tp.count >= 5 ? "text-base px-3 py-1.5" : tp.count >= 3 ? "text-sm px-2.5 py-1" : "text-xs px-2 py-0.5";
                    return (
                      <span
                        key={`${tp.topic}-${tp.subject}`}
                        className={`rounded-full font-medium inline-flex items-center gap-1 ${size}`}
                        style={{
                          backgroundColor: `${color}20`,
                          color: color,
                        }}
                      >
                        {tp.topic.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                        {tp.struggleRatio > 0.3 && (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        )}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="font-semibold text-sm">{t("sections.topTopics")}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--muted-foreground)]">{t("empty.noTopics")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── E. Activity Types ─────────────────────────────── */}
      {activityTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="font-semibold text-sm">{t("sections.activityTypes")}</h2>
          </CardHeader>
          <CardContent>
            <ActivityTypeBars data={activityTypes} accentHex={accentHex} t={t} />
          </CardContent>
        </Card>
      )}

      {/* ── F. Usage Heatmap ──────────────────────────────── */}
      {usageHeatmap.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm flex items-center gap-1">{t("sections.usagePatterns")} <InfoTip text={t("tips.usagePatterns")} /></h2>
              {(controls.quietHoursStart || controls.quietHoursEnd) && (
                <span className="text-[10px] text-amber-500 flex items-center gap-1">
                  <Moon className="w-3 h-3" />
                  {controls.quietHoursStart}–{controls.quietHoursEnd}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <UsageHeatmap
              data={usageHeatmap}
              accentHex={accentHex}
              quietStart={controls.quietHoursStart}
              quietEnd={controls.quietHoursEnd}
              t={t}
            />
          </CardContent>
        </Card>
      )}

      {/* ── G. Struggle Spotlight ─────────────────────────── */}
      {totalStruggles > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t("sections.struggles")}
              <InfoTip text={t("tips.struggles")} />
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Per-subject struggle bars */}
            {subjectBreakdown
              .filter((s) => s.struggleCount > 0)
              .map((subj) => {
                const ratio = subj.count > 0 ? subj.struggleCount / subj.count : 0;
                return (
                  <div key={subj.subject}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{subj.subject}</span>
                      <span className="text-[var(--muted-foreground)]">
                        {Math.round(ratio * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--muted)]">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all duration-500"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}

            {/* Natural language insight */}
            {topStruggleSubject && topStruggleTopic && (
              <p className="text-sm text-[var(--muted-foreground)] italic mt-2">
                {t("struggleInsight", {
                  name: child.displayName,
                  subject: topStruggleSubject.subject,
                  topic: topStruggleTopic.topic,
                  count: topStruggleSubject.struggleCount,
                })}
              </p>
            )}
            {topStruggleSubject && !topStruggleTopic && (
              <p className="text-sm text-[var(--muted-foreground)] italic mt-2">
                {t("struggleInsightSimple", {
                  name: child.displayName,
                  subject: topStruggleSubject.subject,
                  count: topStruggleSubject.struggleCount,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── H. Safety & Flags ─────────────────────────────── */}
      {flags.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-2">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" />
              {t("sections.safety")}
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {flags.map((flag) => (
                <div key={flag.id} className="flex items-start gap-3 text-sm">
                  <Flag className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">{flag.flagType}</span>
                      {flag.dismissed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                          {t("dismissed")}
                        </span>
                      )}
                    </div>
                    <p className="text-[var(--muted-foreground)] text-xs mt-0.5">{flag.flagReason}</p>
                    <p className="text-[var(--muted-foreground)] text-[10px] mt-0.5">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── I. Recent Conversations ───────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="font-semibold text-sm">{t("sections.recentConversations")}</h2>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">{t("empty.noActivity")}</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {conv.hasStruggle && (
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{conv.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {conv.subjects.map((subj) => (
                        <span
                          key={subj}
                          className="text-[10px] px-1.5 py-0.5 rounded-full capitalize"
                          style={{
                            backgroundColor: `${accentHex}20`,
                            color: accentHex,
                          }}
                        >
                          {subj}
                        </span>
                      ))}
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(conv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-[var(--muted-foreground)]">{conv.cost.toFixed(3)}&euro;</div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      {conv.messageCount} msg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Settings Link ─────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-sm font-medium">{t("manageControls")}</p>
                {controls.dailyCreditLimit && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {controls.cumulativeCredits
                      ? `${controls.dailyCreditLimit}€/j (${(controls.dailyCreditLimit * 7).toFixed(2)}€/sem)`
                      : `${controls.dailyCreditLimit}€/j`
                    }
                  </p>
                )}
              </div>
            </div>
            <Link href={{ pathname: "/mifa/settings", query: { child: childId } } as never}>
              <Button variant="outline" size="sm">
                <Shield className="w-4 h-4 mr-2" />
                {t("adjustSettings")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Empty state if no activity at all */}
      {totals.conversations === 0 && totals.messages === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <p className="text-lg font-medium">{t("empty.noActivity")}</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t("empty.noActivityDesc")}</p>
        </div>
      )}
    </div>
  );
}
