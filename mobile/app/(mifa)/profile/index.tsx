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
import {
  useMyStats,
  useRequestCredits,
  useUpdateTheme,
} from "@/lib/hooks/useMifa";

const ACCENT_COLORS = [
  { name: "blue", hex: "#3b82f6" },
  { name: "pink", hex: "#ec4899" },
  { name: "green", hex: "#22c55e" },
  { name: "orange", hex: "#f97316" },
  { name: "purple", hex: "#a855f7" },
  { name: "red", hex: "#ef4444" },
  { name: "teal", hex: "#14b8a6" },
  { name: "amber", hex: "#f59e0b" },
];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { data: family } = useFamilyRole();
  const [refreshing, setRefreshing] = useState(false);
  const [creditRequestState, setCreditRequestState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  const { data: stats, refetch } = useMyStats();
  const requestCredits = useRequestCredits();
  const updateTheme = useUpdateTheme();

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
          <Card className="bg-primary-600 mb-4">
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
                <MessageCircle size={14} color="#6366f1" />
                <Text variant="caption" className="ml-1">
                  {t("childSettings.stats.conversations")}
                </Text>
              </View>
              <Text variant="title" className="text-xl">
                {stats?.weeklyConversations || 0}
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
                {Number(stats?.weeklyCreditsUsed || 0).toFixed(2)}€
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
                <Text variant="title" className="text-2xl text-primary-600">
                  {Number(stats?.creditsBalance || 0).toFixed(2)}€
                </Text>
              </View>
              <TrendingUp size={24} color="#6366f1" />
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
            <Palette size={18} color="#6366f1" />{" "}
            {t("childSettings.theme.title")}
          </Text>
          <Card variant="outlined" className="mb-4">
            <Text variant="label" className="mb-3">
              {t("childSettings.theme.chooseColor")}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.name}
                  onPress={() => handleColorChange(color.name)}
                  className="w-10 h-10 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
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
