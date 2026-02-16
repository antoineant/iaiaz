import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  Coins,
  TrendingUp,
  Palette,
} from "lucide-react-native";
import { Text, Card, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useQueryClient } from "@tanstack/react-query";
import {
  useMyStats,
  useRequestCredits,
  useUpdateTheme,
} from "@/lib/hooks/useMifa";
import { useAccentColor } from "@/lib/AccentColorContext";
import { ACCENT_COLORS } from "@/lib/theme";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);
  const [creditRequestState, setCreditRequestState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const queryClient = useQueryClient();
  const { data: stats, refetch } = useMyStats();
  const requestCredits = useRequestCredits();
  const updateTheme = useUpdateTheme();

  const currentColor = family?.accentColor || "cobalt";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const displayName = family?.displayName || "...";

  const handleRequestCredits = async () => {
    const orgId = family?.orgId;
    if (!orgId) return;
    setCreditRequestState("sending");
    try {
      await requestCredits.mutateAsync(orgId);
      setCreditRequestState("sent");
      setTimeout(() => setCreditRequestState("idle"), 3000);
    } catch {
      setCreditRequestState("error");
      setTimeout(() => setCreditRequestState("idle"), 3000);
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      await updateTheme.mutateAsync(color);
      queryClient.invalidateQueries({ queryKey: ["familyRole"] });
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  const creditRequestLabel = {
    idle: t("childSettings.requestCredits"),
    sending: t("childSettings.requestCreditsSending"),
    sent: t("childSettings.requestCreditsSent"),
    error: t("childSettings.requestCreditsError"),
  }[creditRequestState];

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
        <View className="px-4 pt-4">
          {/* Greeting */}
          <Card className="mb-4" style={{ backgroundColor: accent.hex }}>
            <Text variant="title" className="text-white text-xl">
              {t("chat.greeting", { name: displayName })}
            </Text>
          </Card>

          {/* Weekly Stats */}
          <Text variant="subtitle" className="mb-3">
            {t("childSettings.stats.weeklyActivity")}
          </Text>
          <View className="flex-row gap-3 mb-4">
            <Card className="flex-1">
              <View className="flex-row items-center mb-1">
                <MessageCircle size={14} color={accent.hex} />
                <Text variant="caption" className="ml-1">
                  {t("childSettings.stats.conversations")}
                </Text>
              </View>
              <Text variant="title" className="text-xl">
                {stats?.conversations || 0}
              </Text>
            </Card>
            <Card className="flex-1">
              <View className="flex-row items-center mb-1">
                <Coins size={14} color="#10b981" />
                <Text variant="caption" className="ml-1">
                  {t("childSettings.stats.creditsUsed")}
                </Text>
              </View>
              <Text variant="title" className="text-xl">
                {Number(stats?.creditsUsed || 0).toFixed(2)}€
              </Text>
            </Card>
          </View>

          {/* Credits Remaining */}
          <Card variant="outlined" className="mb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text variant="label">
                  {t("childSettings.stats.creditsRemaining")}
                </Text>
                <Text variant="title" className="text-2xl" style={{ color: accent.hex }}>
                  {Number(stats?.creditsBalance ?? family?.creditsBalance ?? 0).toFixed(2)}€
                </Text>
              </View>
              <TrendingUp size={24} color={accent.hex} />
            </View>
          </Card>

          {/* Request Credits */}
          <Button
            variant={creditRequestState === "sent" ? "secondary" : "primary"}
            onPress={handleRequestCredits}
            loading={creditRequestState === "sending"}
            disabled={creditRequestState !== "idle"}
            className="mb-6"
          >
            {creditRequestLabel}
          </Button>

          {/* Theme */}
          <Text variant="subtitle" className="mb-3">
            <Palette size={18} color={accent.hex} />{" "}
            {t("childSettings.theme.title")}
          </Text>
          <Card variant="outlined" className="mb-4">
            <Text variant="label" className="mb-3">
              {t("childSettings.theme.chooseColor")}
            </Text>
            <View className="flex-row flex-wrap gap-2 justify-center">
              {ACCENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  onPress={() => handleColorChange(c.name)}
                  className="items-center"
                  style={{ width: 56 }}
                >
                  <View
                    className={`w-11 h-11 rounded-full mb-1 ${
                      currentColor === c.name ? "border-[3px] border-gray-800" : ""
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                  <Text className="text-[9px] text-gray-500 text-center">{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Sign Out */}
          <Button variant="ghost" onPress={signOut} className="mb-8">
            {t("auth.signIn") === "Se connecter"
              ? "A plus !"
              : "See ya!"}
          </Button>
        </View>
    </ScrollView>
  );
}
