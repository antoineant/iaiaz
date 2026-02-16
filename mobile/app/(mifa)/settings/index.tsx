import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Shield, Clock, Mail, ChevronRight } from "lucide-react-native";
import { Text, Card, Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import {
  useFamilyAnalytics,
  useControls,
  useUpdateControls,
  useSendInvite,
} from "@/lib/hooks/useMifa";

type SupervisionMode = "guided" | "trusted" | "adult";

function ChildControlCard({ child, orgId }: { child: any; orgId: string }) {
  const { t } = useTranslation();
  const accent = useAccentColor();
  const { data: controls, refetch } = useControls(orgId, child.user_id);
  const updateControls = useUpdateControls();

  const currentMode: SupervisionMode =
    controls?.supervision_mode || "guided";
  const modes: SupervisionMode[] = ["guided", "trusted", "adult"];

  const handleModeChange = async (mode: SupervisionMode) => {
    await updateControls.mutateAsync({
      orgId,
      childId: child.user_id,
      settings: { supervision_mode: mode },
    });
    refetch();
  };

  return (
    <Card variant="outlined" className="mb-4">
      <View className="flex-row items-center mb-3">
        <View
          className="w-8 h-8 rounded-full items-center justify-center mr-2"
          style={{ backgroundColor: accent.light }}
        >
          <Text className="font-bold" style={{ color: accent.hex }}>
            {(child.display_name || "?")[0].toUpperCase()}
          </Text>
        </View>
        <Text variant="subtitle">{child.display_name || child.email}</Text>
      </View>

      {/* Supervision Mode */}
      <Text variant="label" className="mb-2">
        {t("settings.supervisionMode")}
      </Text>
      <View className="flex-row gap-2 mb-4">
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode}
            onPress={() => handleModeChange(mode)}
            className={`flex-1 py-2 px-3 rounded-xl items-center ${
              currentMode === mode
                ? ""
                : "bg-gray-100"
            }`}
            style={currentMode === mode ? { backgroundColor: accent.hex } : undefined}
          >
            <Text
              variant="caption"
              className={`font-semibold ${
                currentMode === mode ? "text-white" : "text-gray-600"
              }`}
            >
              {t(`settings.modes.${mode}.title`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quiet Hours */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <Clock size={16} color="#6b7280" />
          <Text variant="label" className="ml-1">
            {t("settings.quietHours")}
          </Text>
        </View>
      </View>
      {controls?.quiet_hours_start && (
        <Text variant="caption" className="mb-2">
          {controls.quiet_hours_start} — {controls.quiet_hours_end}
        </Text>
      )}

      {/* Daily Credit Limit */}
      {controls?.daily_credit_limit != null && (
        <View className="flex-row items-center justify-between">
          <Text variant="label">{t("settings.dailyCreditLimit")}</Text>
          <Text variant="body">{controls.daily_credit_limit}€</Text>
        </View>
      )}
    </Card>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const sendInvite = useSendInvite();

  const orgId = family?.orgId;
  const { data: analytics, refetch } = useFamilyAnalytics(orgId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const children =
    analytics?.members?.filter((m: any) => m.role === "student") || [];

  const handleInvite = async () => {
    if (!inviteEmail || !orgId) return;
    try {
      await sendInvite.mutateAsync({
        orgId,
        email: inviteEmail,
        role: "student",
      });
      setInviteEmail("");
      Alert.alert(t("settings.inviteMember"), "Invitation sent!");
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
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
          {/* Parental Controls */}
          <Text variant="subtitle" className="mb-3">
            <Shield size={18} color={accent.hex} /> {t("settings.childControls")}
          </Text>
          {children.map((child: any) => (
            <ChildControlCard
              key={child.user_id}
              child={child}
              orgId={orgId!}
            />
          ))}

          {/* Invite */}
          <Text variant="subtitle" className="mb-3 mt-4">
            <Mail size={18} color={accent.hex} /> {t("settings.inviteMember")}
          </Text>
          <Card variant="outlined" className="mb-4">
            <Input
              label={t("auth.email")}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              onPress={handleInvite}
              loading={sendInvite.isPending}
              className="mt-3"
            >
              {t("common.buttons.send")}
            </Button>
          </Card>

          {/* Sign Out */}
          <Button variant="outline" onPress={signOut} className="mt-4 mb-8">
            {t("auth.signIn") === "Se connecter"
              ? "Se déconnecter"
              : "Sign out"}
          </Button>
        </View>
    </ScrollView>
  );
}
