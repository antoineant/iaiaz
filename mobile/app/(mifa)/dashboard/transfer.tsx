import { useState, useCallback, useMemo } from "react";
import { View, ScrollView, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CreditCard } from "lucide-react-native";
import { Text, Card, Button, Input } from "@/components/ui";
import { useFamilyAnalytics, useTransferCredits } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";

export default function TransferScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);

  const orgId = family?.orgId;
  const { data: analytics, refetch } = useFamilyAnalytics(orgId);
  const transferCredits = useTransferCredits();

  const children = useMemo(
    () =>
      (analytics?.members || []).filter((m: any) => m.role === "student"),
    [analytics]
  );

  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const orgBalance = Number(analytics?.creditBalance || 0);

  const totalTransfer = useMemo(() => {
    return Object.values(amounts).reduce((sum, v) => {
      const n = Number(v);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  }, [amounts]);

  const remaining = orgBalance - totalTransfer;
  const isValid = totalTransfer > 0 && remaining >= 0;

  const handleTransfer = async () => {
    if (!orgId || !isValid) return;

    try {
      const entries = Object.entries(amounts).filter(
        ([, v]) => Number(v) > 0
      );
      for (const [childId, amount] of entries) {
        await transferCredits.mutateAsync({
          orgId,
          childId,
          amount: Number(amount),
        });
      }
      setAmounts({});
      await refetch();
      Alert.alert(t("dashboard.transfer.success"));
      if (router.canGoBack()) {
        router.back();
      }
    } catch (err: any) {
      Alert.alert(t("dashboard.transfer.error"), err.message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-4 pt-4">
        {/* Org Balance Header */}
        <Card style={{ backgroundColor: accent.hex }} className="mb-6">
          <View className="flex-row items-center mb-1">
            <CreditCard size={18} color="#fff" />
            <Text
              variant="label"
              className="ml-2"
              style={{ color: accent.light }}
            >
              {t("dashboard.transfer.orgBalance")}
            </Text>
          </View>
          <Text variant="title" className="text-white text-3xl">
            {orgBalance.toFixed(2)}€
          </Text>
        </Card>

        {/* Children List */}
        {children.map((child: any) => {
          const childBalance = Number(child.credits_balance || 0);
          return (
            <Card key={child.user_id} variant="outlined" className="mb-3">
              <View className="flex-row items-center mb-2">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: accent.light }}
                >
                  <Text
                    className="text-lg font-bold"
                    style={{ color: accent.hex }}
                  >
                    {(child.display_name || child.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text variant="body" className="font-semibold">
                    {child.display_name || child.email}
                  </Text>
                  <Text variant="caption">
                    {t("dashboard.transfer.childBalance")}:{" "}
                    {childBalance.toFixed(2)}€
                  </Text>
                </View>
              </View>
              <Input
                label={t("dashboard.transfer.amount")}
                value={amounts[child.user_id] || ""}
                onChangeText={(v) =>
                  setAmounts((prev) => ({ ...prev, [child.user_id]: v }))
                }
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </Card>
          );
        })}

        {/* Summary */}
        <Card variant="outlined" className="mb-4">
          <View className="flex-row justify-between mb-2">
            <Text variant="label">{t("dashboard.transfer.total")}</Text>
            <Text variant="subtitle">{totalTransfer.toFixed(2)}€</Text>
          </View>
          <View className="flex-row justify-between">
            <Text variant="label">{t("dashboard.transfer.remaining")}</Text>
            <Text
              variant="subtitle"
              style={{ color: remaining < 0 ? "#ef4444" : "#10b981" }}
            >
              {remaining.toFixed(2)}€
            </Text>
          </View>
          {remaining < 0 && (
            <Text variant="caption" className="text-red-500 mt-1">
              {t("dashboard.transfer.exceedsBalance")}
            </Text>
          )}
        </Card>

        <Button
          onPress={handleTransfer}
          loading={transferCredits.isPending}
          disabled={!isValid}
          className="mb-8"
        >
          {t("dashboard.transfer.button")}
        </Button>
      </View>
    </ScrollView>
  );
}
