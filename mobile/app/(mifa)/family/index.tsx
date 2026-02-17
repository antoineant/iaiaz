import { useState, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import {
  Shield,
  Clock,
  Mail,
  ChevronDown,
  User,
  CreditCard,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text, Card, Button, Input } from "@/components/ui";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useSchoolSystem } from "@/lib/SchoolSystemContext";
import {
  useFamilyAnalytics,
  useControls,
  useUpdateControls,
  useSendInvite,
  useInvites,
  useResendInvite,
  useRevokeInvite,
  useChildProfile,
} from "@/lib/hooks/useMifa";

/** Convert "HH:MM" or "HH:MM:SS" → Date (today) for the picker */
function timeToDate(time: string): Date {
  const d = new Date();
  const [h, m] = (time || "00:00").split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Convert Date → "HH:MM:SS" for storage */
function dateToTime(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}:00`;
}

type SupervisionMode = "guided" | "trusted" | "adult";

function ChildControlCard({ child, orgId }: { child: any; orgId: string }) {
  const { t } = useTranslation();
  const accent = useAccentColor();
  const { schoolSystem } = useSchoolSystem();
  const { data: controls, refetch } = useControls(orgId, child.user_id);
  const { data: profile, refetch: refetchProfile } = useChildProfile(
    orgId,
    child.user_id
  );
  const updateControls = useUpdateControls();
  const [expanded, setExpanded] = useState(false);

  const [quietStart, setQuietStart] = useState("");
  const [quietEnd, setQuietEnd] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [cumulative, setCumulative] = useState(false);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [schoolYear, setSchoolYear] = useState("");
  const [profileExpanded, setProfileExpanded] = useState(false);

  const syncFromControls = useCallback(() => {
    const c = controls?.controls;
    if (c) {
      setQuietStart(c.quiet_hours_start || "");
      setQuietEnd(c.quiet_hours_end || "");
      setDailyLimit(
        c.daily_credit_limit != null
          ? String(c.daily_credit_limit)
          : ""
      );
      setCumulative(c.cumulative_credits || false);
    }
  }, [controls]);

  const syncFromProfile = useCallback(() => {
    const p = profile?.profile;
    if (p) {
      setDisplayName(p.display_name || "");
      setBirthdate(p.birthdate || "");
      setSchoolYear(p.school_year || "");
    }
  }, [profile]);

  useEffect(() => {
    syncFromControls();
  }, [syncFromControls]);

  useEffect(() => {
    syncFromProfile();
  }, [syncFromProfile]);

  const currentMode: SupervisionMode =
    controls?.controls?.supervision_mode || "guided";
  const modes: SupervisionMode[] = ["guided", "trusted", "adult"];

  const handleModeChange = async (mode: SupervisionMode) => {
    await updateControls.mutateAsync({
      orgId,
      childId: child.user_id,
      settings: { supervision_mode: mode },
    });
    refetch();
  };

  const handleSaveControls = async () => {
    setSaving(true);
    try {
      await updateControls.mutateAsync({
        orgId,
        childId: child.user_id,
        settings: {
          quiet_hours_start: quietStart || null,
          quiet_hours_end: quietEnd || null,
          daily_credit_limit: dailyLimit ? Number(dailyLimit) : null,
          cumulative_credits: cumulative,
        },
      });
      refetch();
      Alert.alert(t("settings.saved"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
    setSaving(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { api } = await import("@/lib/api");
      await api.updateChildProfile(orgId, child.user_id, {
        display_name: displayName,
        birthdate: birthdate || null,
        school_year: schoolYear || null,
      });
      refetchProfile();
      Alert.alert(t("settings.saved"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
    setSaving(false);
  };

  const schoolYears = [
    "6eme",
    "5eme",
    "4eme",
    "3eme",
    "seconde",
    "premiere",
    "terminale",
    "superieur",
  ];

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
              currentMode === mode ? "" : "bg-gray-100"
            }`}
            style={
              currentMode === mode
                ? { backgroundColor: accent.hex }
                : undefined
            }
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

      {/* Expandable Controls Section */}
      <TouchableOpacity
        onPress={() => {
          if (!expanded) syncFromControls();
          setExpanded(!expanded);
        }}
        className="flex-row items-center justify-between py-2"
      >
        <View className="flex-row items-center">
          <Clock size={16} color="#6b7280" />
          <Text variant="label" className="ml-1">
            {t("settings.quietHours")} & {t("settings.dailyCreditLimit")}
          </Text>
        </View>
        <ChevronDown
          size={16}
          color="#6b7280"
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      {expanded && (
        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View className="flex-row items-center gap-2">
              <Text variant="label">{t("settings.quietHoursStart")}</Text>
              <DateTimePicker
                value={timeToDate(quietStart || "22:00:00")}
                mode="time"
                is24Hour
                display="compact"
                minuteInterval={15}
                locale="fr"
                accentColor={accent.hex}
                onChange={(_: DateTimePickerEvent, d?: Date) => {
                  if (d) setQuietStart(dateToTime(d));
                }}
              />
            </View>
            <View className="flex-row items-center gap-2">
              <Text variant="label">{t("settings.quietHoursEnd")}</Text>
              <DateTimePicker
                value={timeToDate(quietEnd || "07:00:00")}
                mode="time"
                is24Hour
                display="compact"
                minuteInterval={15}
                locale="fr"
                accentColor={accent.hex}
                onChange={(_: DateTimePickerEvent, d?: Date) => {
                  if (d) setQuietEnd(dateToTime(d));
                }}
              />
            </View>
          </View>

          <View className="mb-3">
            <Input
              label={t("settings.dailyCreditLimitInput")}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              placeholder={t("settings.unlimited")}
              keyboardType="decimal-pad"
            />
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-3">
              <Text variant="label">{t("settings.cumulativeCredits")}</Text>
              <Text variant="caption">
                {t("settings.cumulativeCreditsDesc")}
              </Text>
            </View>
            <Switch
              value={cumulative}
              onValueChange={setCumulative}
              trackColor={{ true: accent.hex }}
            />
          </View>

          <Button onPress={handleSaveControls} loading={saving} style={{ backgroundColor: accent.hex }}>
            {t("settings.saveControls")}
          </Button>
        </View>
      )}

      {/* Child Profile Editor */}
      <TouchableOpacity
        onPress={() => {
          if (!profileExpanded) syncFromProfile();
          setProfileExpanded(!profileExpanded);
        }}
        className="flex-row items-center justify-between py-2 mt-2 border-t border-gray-100"
      >
        <View className="flex-row items-center">
          <User size={16} color="#6b7280" />
          <Text variant="label" className="ml-1">
            {t("settings.childProfile.title")}
          </Text>
        </View>
        <ChevronDown
          size={16}
          color="#6b7280"
          style={{
            transform: [{ rotate: profileExpanded ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {profileExpanded && (
        <View className="mt-2">
          <View className="mb-3">
            <Input
              label={t("settings.childProfile.displayName")}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>
          <View className="mb-3">
            <Input
              label={t("settings.childProfile.birthdate")}
              value={birthdate}
              onChangeText={setBirthdate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View className="mb-3">
            <Text variant="label" className="mb-1.5">
              {t("settings.childProfile.schoolYear")}
            </Text>
            {/* Grade pills */}
            <View className="flex-row flex-wrap gap-2">
              {schoolYears.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => setSchoolYear(y)}
                  className={`px-3 py-1.5 rounded-xl ${
                    schoolYear === y ? "" : "bg-gray-100"
                  }`}
                  style={
                    schoolYear === y
                      ? { backgroundColor: accent.hex }
                      : undefined
                  }
                >
                  <Text
                    variant="caption"
                    className={`font-semibold ${
                      schoolYear === y ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {t(`settings.schoolYears.${schoolSystem}.${y}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Button onPress={handleSaveProfile} loading={saving} style={{ backgroundColor: accent.hex }}>
            {t("common.buttons.save")}
          </Button>
        </View>
      )}
    </Card>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fef3c7", text: "#d97706" },
  accepted: { bg: "#d1fae5", text: "#059669" },
  expired: { bg: "#fee2e2", text: "#dc2626" },
  revoked: { bg: "#f3f4f6", text: "#6b7280" },
};

function InvitesList({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const { data: invites, refetch } = useInvites(orgId);
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();

  if (!invites || invites.length === 0) {
    return (
      <Card variant="outlined" className="items-center py-4 mb-4">
        <Text variant="caption">{t("settings.noInvites")}</Text>
      </Card>
    );
  }

  const handleResend = async (id: string) => {
    try {
      await resendInvite.mutateAsync(id);
      refetch();
      Alert.alert(t("settings.inviteResent"));
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  const handleRevoke = (id: string) => {
    Alert.alert(t("settings.revokeConfirm"), "", [
      { text: t("common.buttons.cancel"), style: "cancel" },
      {
        text: t("settings.revoke"),
        style: "destructive",
        onPress: async () => {
          try {
            await revokeInvite.mutateAsync(id);
            refetch();
            Alert.alert(t("settings.inviteRevoked"));
          } catch (err: any) {
            Alert.alert(t("common.error"), err.message);
          }
        },
      },
    ]);
  };

  return (
    <View className="mb-4">
      {invites.map((invite: any) => {
        const colors = STATUS_COLORS[invite.status] || STATUS_COLORS.pending;
        const canResend =
          invite.status === "pending" || invite.status === "expired";
        const canRevoke = invite.status === "pending";

        return (
          <Card key={invite.id} variant="outlined" className="mb-2">
            <View className="flex-row items-center mb-1">
              <Text variant="body" className="flex-1 font-medium">
                {invite.email}
              </Text>
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: colors.bg }}
              >
                <Text
                  variant="caption"
                  className="text-xs font-semibold"
                  style={{ color: colors.text }}
                >
                  {t(`settings.inviteStatus.${invite.status}`)}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center mb-1">
              <View
                className="px-2 py-0.5 rounded-full bg-gray-100 mr-2"
              >
                <Text variant="caption" className="text-xs">
                  {invite.role === "student"
                    ? t("settings.inviteRoleChild")
                    : t("settings.inviteRoleParent")}
                </Text>
              </View>
              <Text variant="caption" className="text-xs">
                {new Date(invite.created_at).toLocaleDateString()}
              </Text>
            </View>
            {(canResend || canRevoke) && (
              <View className="flex-row gap-2 mt-2">
                {canResend && (
                  <TouchableOpacity
                    onPress={() => handleResend(invite.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-50"
                  >
                    <Text variant="caption" className="text-blue-600 font-semibold text-xs">
                      {t("settings.resend")}
                    </Text>
                  </TouchableOpacity>
                )}
                {canRevoke && (
                  <TouchableOpacity
                    onPress={() => handleRevoke(invite.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-50"
                  >
                    <Text variant="caption" className="text-red-600 font-semibold text-xs">
                      {t("settings.revoke")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </Card>
        );
      })}
    </View>
  );
}

export default function FamilyScreen() {
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"student" | "admin">("student");
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
        role: inviteRole,
        name: inviteName || undefined,
      });
      setInviteEmail("");
      setInviteName("");
      Alert.alert(t("settings.inviteMember"), t("settings.inviteResent"));
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
        {/* Transfer Credits Button */}
        <TouchableOpacity
          onPress={() => router.push("/family/transfer")}
          className="mb-5 rounded-2xl overflow-hidden"
          style={{ backgroundColor: accent.hex }}
          activeOpacity={0.85}
        >
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <CreditCard size={22} color="#fff" />
              <Text variant="subtitle" className="text-white ml-3">
                {t("dashboard.transferCredits")}
              </Text>
            </View>
            <Text variant="body" className="text-white font-bold text-lg">
              {Number(analytics?.creditBalance || 0).toFixed(2)}€
            </Text>
          </View>
        </TouchableOpacity>

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
            label={t("settings.inviteName")}
            value={inviteName}
            onChangeText={setInviteName}
            placeholder="..."
            autoCapitalize="words"
          />
          <View className="mt-3">
            <Input
              label={t("auth.email")}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View className="mt-3">
            <Text variant="label" className="mb-1.5">
              {t("settings.inviteRole")}
            </Text>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => setInviteRole("student")}
                className={`flex-1 py-2 rounded-xl items-center ${
                  inviteRole === "student" ? "" : "bg-gray-100"
                }`}
                style={
                  inviteRole === "student"
                    ? { backgroundColor: accent.hex }
                    : undefined
                }
              >
                <Text
                  variant="caption"
                  className={`font-semibold ${
                    inviteRole === "student"
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {t("settings.inviteRoleChild")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setInviteRole("admin")}
                className={`flex-1 py-2 rounded-xl items-center ${
                  inviteRole === "admin" ? "" : "bg-gray-100"
                }`}
                style={
                  inviteRole === "admin"
                    ? { backgroundColor: accent.hex }
                    : undefined
                }
              >
                <Text
                  variant="caption"
                  className={`font-semibold ${
                    inviteRole === "admin"
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {t("settings.inviteRoleParent")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <Button
            onPress={handleInvite}
            loading={sendInvite.isPending}
            className="mt-3"
            style={{ backgroundColor: accent.hex }}
          >
            {t("common.buttons.send")}
          </Button>
        </Card>

        {/* Pending Invites */}
        {orgId && (
          <>
            <Text variant="subtitle" className="mb-3">
              {t("settings.pendingInvites")}
            </Text>
            <InvitesList orgId={orgId} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
