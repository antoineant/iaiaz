import { View, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { useChildAnalytics, useChildInsights } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useState, useCallback } from "react";

function KpiCard({
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

export default function ChildAnalyticsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);

  const orgId = family?.orgId;
  const {
    data: analytics,
    refetch: refetchAnalytics,
  } = useChildAnalytics(orgId, childId);
  const { data: insights, refetch: refetchInsights } = useChildInsights(
    orgId,
    childId
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAnalytics(), refetchInsights()]);
    setRefreshing(false);
  }, [refetchAnalytics, refetchInsights]);

  const childName = analytics?.childName || "...";

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
        <View className="px-4 pt-4">
          <Text variant="title" className="mb-4">
            {t("childAnalytics.title", { name: childName })}
          </Text>

          {/* KPIs */}
          <View className="flex-row flex-wrap -m-1 mb-4">
            <KpiCard
              label={t("childAnalytics.kpi.conversations")}
              value={String(analytics?.totalConversations || 0)}
              icon={MessageCircle}
              color={accent.hex}
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

          {/* Subjects */}
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

          {/* Insights */}
          {insights?.suggestions && insights.suggestions.length > 0 && (
            <View className="mb-8">
              <Text variant="subtitle" className="mb-3">
                {t("childAnalytics.insights.suggestions")}
              </Text>
              {insights.suggestions.map((suggestion: string, i: number) => (
                <Card key={i} variant="outlined" className="mb-2">
                  <Text variant="body">{suggestion}</Text>
                </Card>
              ))}
            </View>
          )}
        </View>
    </ScrollView>
  );
}
