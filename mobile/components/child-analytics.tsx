import { View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
  Shield,
} from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { useMemo, useState } from "react";

export type Period = 7 | 14 | 30;

export function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
}) {
  return (
    <Card className="flex-1 min-w-[45%] m-1">
      <View className="flex-row items-center mb-1">
        <Icon size={14} color={color} />
        <Text variant="caption" className="ml-1">
          {label}
        </Text>
      </View>
      <Text variant="subtitle">{value}</Text>
    </Card>
  );
}

export function PeriodSelector({
  value,
  onChange,
  accentHex,
}: {
  value: Period;
  onChange: (p: Period) => void;
  accentHex: string;
}) {
  const { t } = useTranslation();
  const periods: Period[] = [7, 14, 30];

  return (
    <View className="flex-row gap-2 mb-4">
      {periods.map((p) => (
        <TouchableOpacity
          key={p}
          onPress={() => onChange(p)}
          className={`flex-1 py-2 rounded-xl items-center ${
            value === p ? "" : "bg-gray-100"
          }`}
          style={value === p ? { backgroundColor: accentHex } : undefined}
        >
          <Text
            variant="caption"
            className={`font-semibold ${
              value === p ? "text-white" : "text-gray-600"
            }`}
          >
            {t(`childAnalytics.period.${p}d`)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function DailyActivityBars({
  data,
  accentHex,
}: {
  data: any[];
  accentHex: string;
}) {
  const { t } = useTranslation();
  const maxCount = Math.max(...data.map((d: any) => d.messageCount || d.count || 0), 1);

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.dailyActivity")}
      </Text>
      <Card variant="outlined">
        {data.map((day: any, i: number) => {
          const count = day.messageCount || day.count || 0;
          const pct = (count / maxCount) * 100;
          const label = day.date
            ? new Date(day.date).toLocaleDateString(undefined, {
                weekday: "short",
                day: "numeric",
              })
            : `Day ${i + 1}`;
          return (
            <View
              key={i}
              className={`flex-row items-center py-1.5 ${
                i > 0 ? "border-t border-gray-50" : ""
              }`}
            >
              <Text variant="caption" className="w-16">
                {label}
              </Text>
              <View className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden mx-2">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: accentHex,
                  }}
                />
              </View>
              <Text variant="caption" className="w-8 text-right">
                {count}
              </Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const TYPE_COLORS: Record<string, string> = {
  homework: "#3b82f6",
  revision: "#8b5cf6",
  creative: "#f59e0b",
  essay: "#10b981",
  general: "#6b7280",
};

export function ActivityTypesBreakdown({ data }: { data: any[] }) {
  const { t } = useTranslation();
  const total = data.reduce((s: number, d: any) => s + (d.count || 0), 0) || 1;

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.activityTypes")}
      </Text>
      <Card variant="outlined">
        {data.map((item: any, i: number) => {
          const pct = ((item.count || 0) / total) * 100;
          const color = TYPE_COLORS[item.type] || "#6b7280";
          return (
            <View
              key={i}
              className={`py-2 ${i > 0 ? "border-t border-gray-50" : ""}`}
            >
              <View className="flex-row justify-between mb-1">
                <Text variant="body">
                  {t(`childAnalytics.activityTypes.${item.type}`, {
                    defaultValue: item.type,
                  })}
                </Text>
                <Text variant="caption">{item.count}</Text>
              </View>
              <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(pct, 2)}%`,
                    backgroundColor: color,
                  }}
                />
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

export function TopTopics({ data, accentHex }: { data: any[]; accentHex: string }) {
  const { t } = useTranslation();

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.topTopics")}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {data.map((topic: any, i: number) => {
          const isStruggle = topic.struggle || topic.hasStruggle;
          return (
            <View
              key={i}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: isStruggle ? "#fef2f2" : `${accentHex}15`,
              }}
            >
              <Text
                variant="caption"
                className="font-medium"
                style={{ color: isStruggle ? "#ef4444" : accentHex }}
              >
                {topic.name || topic.topic}
              </Text>
              {topic.count != null && (
                <View
                  className="ml-1.5 px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isStruggle ? "#fca5a5" : `${accentHex}30`,
                  }}
                >
                  <Text
                    variant="caption"
                    className="text-xs font-bold"
                    style={{ color: isStruggle ? "#991b1b" : accentHex }}
                  >
                    {topic.count}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const TIME_BLOCKS = ["morning", "afternoon", "evening", "night"] as const;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function getTimeBlock(hour: number): (typeof TIME_BLOCKS)[number] {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function UsageHeatmap({
  data,
  accentHex,
}: {
  data: any[];
  accentHex: string;
}) {
  const { t } = useTranslation();

  const grid = useMemo(() => {
    const g: Record<string, Record<string, number>> = {};
    for (const d of DAY_KEYS) {
      g[d] = {};
      for (const tb of TIME_BLOCKS) g[d][tb] = 0;
    }
    for (const entry of data) {
      const dayIdx =
        entry.dayOfWeek != null
          ? entry.dayOfWeek
          : new Date(entry.date || entry.timestamp).getDay();
      const mappedIdx = dayIdx === 0 ? 6 : dayIdx - 1;
      const dayKey = DAY_KEYS[mappedIdx];
      const hour = entry.hour != null ? entry.hour : new Date(entry.timestamp).getHours();
      const block = getTimeBlock(hour);
      if (dayKey) g[dayKey][block] += entry.count || 1;
    }
    return g;
  }, [data]);

  const maxVal = useMemo(() => {
    let m = 0;
    for (const d of DAY_KEYS)
      for (const tb of TIME_BLOCKS) m = Math.max(m, grid[d][tb]);
    return m || 1;
  }, [grid]);

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.heatmap")}
      </Text>
      <Card variant="outlined">
        <View className="flex-row mb-1">
          <View className="w-10" />
          {TIME_BLOCKS.map((tb) => (
            <View key={tb} className="flex-1 items-center">
              <Text variant="caption" className="text-xs">
                {t(`childAnalytics.heatmap.${tb}`)}
              </Text>
            </View>
          ))}
        </View>
        {DAY_KEYS.map((day) => (
          <View key={day} className="flex-row items-center mb-1">
            <Text variant="caption" className="w-10 text-xs">
              {t(`childAnalytics.heatmap.${day}`)}
            </Text>
            {TIME_BLOCKS.map((tb) => {
              const intensity = grid[day][tb] / maxVal;
              return (
                <View key={tb} className="flex-1 px-0.5">
                  <View
                    className="h-8 rounded"
                    style={{
                      backgroundColor: accentHex,
                      opacity: Math.max(intensity * 0.9 + 0.1, 0.1),
                    }}
                  />
                </View>
              );
            })}
          </View>
        ))}
      </Card>
    </View>
  );
}

export function SafetyFlags({ data }: { data: any[] }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) return null;

  const flagIcon = (type: string) => {
    if (type === "content_policy") return Shield;
    return AlertTriangle;
  };

  const flagColor = (type: string) => {
    if (type === "content_policy") return "#ef4444";
    if (type === "late_usage") return "#f59e0b";
    return "#f97316";
  };

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.flags")}
      </Text>
      {data.map((flag: any, i: number) => {
        const Icon = flagIcon(flag.type);
        const color = flagColor(flag.type);
        return (
          <Card key={i} variant="outlined" className="mb-2">
            <View className="flex-row items-center">
              <Icon size={16} color={color} />
              <View
                className="ml-2 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}15` }}
              >
                <Text
                  variant="caption"
                  className="text-xs font-semibold"
                  style={{ color }}
                >
                  {t(`childAnalytics.flags.${flag.type}`, {
                    defaultValue: flag.type,
                  })}
                </Text>
              </View>
              <View className="flex-1" />
              {flag.created_at && (
                <Text variant="caption" className="text-xs">
                  {new Date(flag.created_at).toLocaleDateString()}
                </Text>
              )}
            </View>
            {flag.reason && (
              <Text variant="caption" className="mt-1">
                {flag.reason}
              </Text>
            )}
          </Card>
        );
      })}
    </View>
  );
}

const PREVIEW_COUNT = 3;

export function RecentConversations({
  data,
  accentHex,
}: {
  data: any[];
  accentHex: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) return null;

  const visible = expanded ? data : data.slice(0, PREVIEW_COUNT);
  const hasMore = data.length > PREVIEW_COUNT;

  return (
    <View className="mb-4">
      <Text variant="subtitle" className="mb-3">
        {t("childAnalytics.sections.recentConversations")}
      </Text>
      {visible.map((conv: any, i: number) => (
        <Card key={i} variant="outlined" className="mb-2">
          <View className="flex-row items-center mb-1">
            {conv.hasStruggle && (
              <View className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            )}
            <Text variant="body" className="flex-1 font-medium" numberOfLines={1}>
              {conv.title || t("history.untitled")}
            </Text>
            <Text variant="caption" className="text-xs">
              {conv.date
                ? new Date(conv.date).toLocaleDateString()
                : conv.created_at
                ? new Date(conv.created_at).toLocaleDateString()
                : ""}
            </Text>
          </View>
          <View className="flex-row items-center gap-2 flex-wrap">
            {conv.subjects?.map((s: string, j: number) => (
              <View
                key={j}
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${accentHex}15` }}
              >
                <Text
                  variant="caption"
                  className="text-xs"
                  style={{ color: accentHex }}
                >
                  {s}
                </Text>
              </View>
            ))}
            {conv.messageCount != null && (
              <Text variant="caption" className="text-xs">
                {conv.messageCount} msg
              </Text>
            )}
            {conv.cost != null && (
              <Text variant="caption" className="text-xs">
                {Number(conv.cost).toFixed(2)}€
              </Text>
            )}
          </View>
        </Card>
      ))}
      {hasMore && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          className="py-2 items-center"
        >
          <Text
            variant="caption"
            className="font-semibold"
            style={{ color: accentHex }}
          >
            {expanded
              ? t("common.buttons.close")
              : `${t("dashboard.viewDetails")} (${data.length})`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ChildAnalyticsKpis({
  analytics,
  accentHex,
}: {
  analytics: any;
  accentHex: string;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row flex-wrap -m-1 mb-4">
      <KpiCard
        label={t("childAnalytics.kpi.conversations")}
        value={String(analytics?.totalConversations || 0)}
        icon={MessageCircle}
        color={accentHex}
      />
      <KpiCard
        label={t("childAnalytics.kpi.totalCost")}
        value={`${Number(analytics?.totalCost || 0).toFixed(2)}€`}
        icon={TrendingUp}
        color="#10b981"
      />
      <KpiCard
        label={t("childAnalytics.kpi.dailyAvg")}
        value={`${Number(analytics?.dailyAvg || 0).toFixed(2)}€`}
        icon={Clock}
        color="#f59e0b"
      />
      <KpiCard
        label={t("childAnalytics.kpi.struggleRatio")}
        value={`${Math.round((analytics?.struggleRatio || 0) * 100)}%`}
        icon={AlertTriangle}
        color="#ef4444"
      />
    </View>
  );
}

export function ChildAnalyticsBody({
  analytics,
  insights,
  accentHex,
}: {
  analytics: any;
  insights: any;
  accentHex: string;
}) {
  const { t } = useTranslation();

  return (
    <>
      {analytics?.dailyActivity && analytics.dailyActivity.length > 0 && (
        <DailyActivityBars
          data={analytics.dailyActivity}
          accentHex={accentHex}
        />
      )}

      {analytics?.activityTypes && analytics.activityTypes.length > 0 && (
        <ActivityTypesBreakdown data={analytics.activityTypes} />
      )}

      {analytics?.topTopics && analytics.topTopics.length > 0 && (
        <TopTopics data={analytics.topTopics} accentHex={accentHex} />
      )}

      {analytics?.usageHeatmap && analytics.usageHeatmap.length > 0 && (
        <UsageHeatmap
          data={analytics.usageHeatmap}
          accentHex={accentHex}
        />
      )}

      <SafetyFlags data={analytics?.flags || []} />

      <RecentConversations
        data={analytics?.recentConversations || []}
        accentHex={accentHex}
      />

      {analytics?.subjects && analytics.subjects.length > 0 && (
        <View className="mb-4">
          <Text variant="subtitle" className="mb-3">
            {t("childAnalytics.sections.subjects")}
          </Text>
          <Card variant="outlined">
            {analytics.subjects.map((subject: any, i: number) => (
              <View
                key={i}
                className={`flex-row justify-between py-2 ${
                  i > 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <Text variant="body">{subject.name}</Text>
                <Text variant="caption">
                  {subject.count} conversation{subject.count > 1 ? "s" : ""}
                </Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {insights?.suggestions && insights.suggestions.length > 0 && (
        <View className="mb-8">
          <Text variant="subtitle" className="mb-3">
            {t("childAnalytics.insights.suggestions")}
          </Text>
          {insights.suggestions.map((suggestion: any, i: number) => (
            <Card key={i} variant="outlined" className="mb-2">
              <Text variant="body">
                {typeof suggestion === "string"
                  ? suggestion
                  : `${suggestion.emoji || ""} ${suggestion.title || suggestion.body || ""}`}
              </Text>
              {suggestion.body && suggestion.title && (
                <Text variant="caption" className="mt-1">
                  {suggestion.body}
                </Text>
              )}
            </Card>
          ))}
        </View>
      )}
    </>
  );
}
