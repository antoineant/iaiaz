import { View, ScrollView, RefreshControl } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text } from "@/components/ui";
import { useChildAnalytics, useChildInsights } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useState, useCallback } from "react";
import {
  PeriodSelector,
  ChildAnalyticsKpis,
  ChildAnalyticsBody,
  type Period,
} from "@/components/child-analytics";

export default function ChildAnalyticsScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>(7);

  const orgId = family?.orgId;
  const {
    data: analytics,
    refetch: refetchAnalytics,
  } = useChildAnalytics(orgId, childId, period);
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

          <PeriodSelector
            value={period}
            onChange={setPeriod}
            accentHex={accent.hex}
          />

          <ChildAnalyticsKpis analytics={analytics} accentHex={accent.hex} />

          <ChildAnalyticsBody
            analytics={analytics}
            insights={insights}
            accentHex={accent.hex}
          />
        </View>
    </ScrollView>
  );
}
