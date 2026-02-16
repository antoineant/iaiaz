import { View, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronRight, CreditCard, Users, Zap } from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { useFamilyAnalytics } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useState, useCallback } from "react";

function StatCard({
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
    <Card className="flex-1 mr-3 last:mr-0">
      <View className="flex-row items-center mb-1">
        <Icon size={16} color={color} />
        <Text variant="caption" className="ml-1">
          {label}
        </Text>
      </View>
      <Text variant="title" className="text-xl">
        {value}
      </Text>
    </Card>
  );
}

function MemberCard({
  member,
  onPress,
  accentHex,
  accentLight,
}: {
  member: any;
  onPress: () => void;
  accentHex: string;
  accentLight: string;
}) {
  const { t } = useTranslation();
  const modeKey = member.supervision_mode || "adult";

  return (
    <TouchableOpacity onPress={onPress}>
      <Card variant="outlined" className="flex-row items-center mb-2">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: accentLight }}
        >
          <Text className="text-lg font-bold" style={{ color: accentHex }}>
            {(member.display_name || member.email || "?")[0].toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="body" className="font-semibold">
            {member.display_name || member.email}
          </Text>
          <Text variant="caption">
            {t(`dashboard.modes.${modeKey}`)}
          </Text>
        </View>
        <ChevronRight size={20} color="#9ca3af" />
      </Card>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);

  const orgId = family?.orgId;
  const { data, refetch, isLoading } = useFamilyAnalytics(orgId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const analytics = data;
  const members = analytics?.members || [];
  const children = members.filter((m: any) => m.role === "student");

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
            <Text variant="title" className="text-white text-3xl">
              {analytics?.creditBalance != null
                ? `${Number(analytics.creditBalance).toFixed(2)}€`
                : "—"}
            </Text>
          </Card>
        </View>

        {/* Quick Stats */}
        <View className="px-4 mt-4">
          <Text variant="subtitle" className="mb-3">
            {t("dashboard.quickStats")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <StatCard
              label={t("dashboard.members")}
              value={String(members.length)}
              icon={Users}
              color={accent.hex}
            />
            <StatCard
              label="Conversations"
              value={String(analytics?.totalConversations || 0)}
              icon={Zap}
              color="#f59e0b"
            />
          </ScrollView>
        </View>

        {/* Family Members */}
        <View className="px-4 mt-6">
          <Text variant="subtitle" className="mb-3">
            {t("dashboard.members")}
          </Text>
          {children.length === 0 && !isLoading ? (
            <Card variant="outlined" className="items-center py-6">
              <Text variant="caption">{t("common.noData")}</Text>
            </Card>
          ) : (
            children.map((child: any) => (
              <MemberCard
                key={child.user_id}
                member={child}
                accentHex={accent.hex}
                accentLight={accent.light}
                onPress={() =>
                  router.push({
                    pathname: "/(mifa)/dashboard/[childId]",
                    params: { childId: child.user_id },
                  })
                }
              />
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View className="px-4 mt-6 mb-8">
          <Text variant="subtitle" className="mb-3">
            {t("dashboard.quickActions")}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push("/(mifa)/settings")}
            >
              <Card variant="outlined" className="items-center py-4">
                <Text variant="label" style={{ color: accent.hex }}>
                  {t("dashboard.transferCredits")}
                </Text>
              </Card>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1"
              onPress={() => router.push("/(mifa)/settings")}
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
