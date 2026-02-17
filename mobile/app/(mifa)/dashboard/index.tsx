import { View, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { useFamilyAnalytics, useChildAnalytics, useChildInsights } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useState, useCallback, useMemo } from "react";
import {
  PeriodSelector,
  ChildAnalyticsKpis,
  ChildAnalyticsBody,
  type Period,
} from "@/components/child-analytics";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>(7);

  const orgId = family?.orgId;
  const { data: analytics, refetch: refetchFamily } = useFamilyAnalytics(orgId);

  const children = useMemo(
    () => (analytics?.members || []).filter((m: any) => m.role === "student"),
    [analytics]
  );

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Auto-select first child when data loads
  const activeChildId = selectedChildId || children[0]?.user_id || null;

  const {
    data: childAnalytics,
    refetch: refetchChild,
  } = useChildAnalytics(orgId, activeChildId, period);
  const { data: childInsights, refetch: refetchInsights } = useChildInsights(
    orgId,
    activeChildId
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchFamily(), refetchChild(), refetchInsights()]);
    setRefreshing(false);
  }, [refetchFamily, refetchChild, refetchInsights]);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Credit Balance */}
      <View className="px-4 pt-4">
        <Card style={{ backgroundColor: accent.hex }}>
          <View className="flex-row items-center mb-1">
            <CreditCard size={18} color="#fff" />
            <Text variant="label" className="ml-2" style={{ color: accent.light }}>
              {t("dashboard.creditBalance")}
            </Text>
          </View>
          <View className="flex-row items-end justify-between">
            <Text variant="title" className="text-white text-3xl">
              {analytics?.creditBalance != null
                ? `${Number(analytics.creditBalance).toFixed(2)}€`
                : "—"}
            </Text>
            {analytics?.usagePeriod != null && Number(analytics.usagePeriod) > 0 && (
              <Text variant="caption" style={{ color: "rgba(255,255,255,0.7)" }}>
                {t("dashboard.weeklyCost", { cost: Number(analytics.usagePeriod).toFixed(2) })}
              </Text>
            )}
          </View>
        </Card>
      </View>

      {/* Child Selector Pills */}
      {children.length > 0 && (
        <View className="px-4 mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {children.map((child: any) => {
                const isActive = child.user_id === activeChildId;
                return (
                  <TouchableOpacity
                    key={child.user_id}
                    onPress={() => setSelectedChildId(child.user_id)}
                    className={`px-4 py-2 rounded-full ${
                      isActive ? "" : "bg-gray-100"
                    }`}
                    style={isActive ? { backgroundColor: accent.hex } : undefined}
                  >
                    <Text
                      variant="body"
                      className={`font-semibold ${
                        isActive ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {child.display_name || child.email}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Selected Child Analytics */}
      {activeChildId && (
        <View className="px-4 mt-4">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            accentHex={accent.hex}
          />

          <ChildAnalyticsKpis analytics={childAnalytics} accentHex={accent.hex} />

          <ChildAnalyticsBody
            analytics={childAnalytics}
            insights={childInsights}
            accentHex={accent.hex}
          />
        </View>
      )}

      {/* No children state */}
      {children.length === 0 && (
        <View className="px-4 mt-4">
          <Card variant="outlined" className="items-center py-6">
            <Text variant="caption">{t("common.noData")}</Text>
          </Card>
        </View>
      )}

      {/* Quick Actions */}
      <View className="px-4 mt-4 mb-8">
        <Text variant="subtitle" className="mb-3">
          {t("dashboard.quickActions")}
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1"
            onPress={() => router.push("/(mifa)/dashboard/transfer")}
          >
            <Card variant="outlined" className="items-center py-4">
              <Text variant="label" style={{ color: accent.hex }}>
                {t("dashboard.transferCredits")}
              </Text>
            </Card>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1"
            onPress={() => router.push("/(mifa)/family")}
          >
            <Card variant="outlined" className="items-center py-4">
              <Text variant="label" style={{ color: accent.hex }}>
                {t("dashboard.inviteMember")}
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
