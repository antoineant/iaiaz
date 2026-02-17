import { View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageCircle, Shield, ArrowRight, Users } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useFamilyAnalytics, useAssistants, useMyStats } from "@/lib/hooks/useMifa";
import { useChatSession } from "@/lib/chatSession";
import { useAccentColor } from "@/lib/AccentColorContext";
import { MifaAvatar } from "@/components/MifaAvatar";

function ParentWelcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const { data: analytics } = useFamilyAnalytics(family?.orgId || undefined);
  const accent = useAccentColor();

  // One personalized chip per child, then generic suggestions
  const children = (analytics?.members || []).filter(
    (m: any) => m.role === "student" || m.role === "child"
  );

  const suggestions = [
    ...children.map((c: any) =>
      t("chat.parentSuggestion1", { name: c.display_name || "..." })
    ),
    t("chat.parentSuggestion2"),
    t("chat.parentSuggestion3"),
    t("chat.parentSuggestion4"),
  ];

  const onSuggestionTap = (message: string) => {
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: { id: "new", initialMessage: message },
    });
  };

  return (
    <View className="flex-1 items-center justify-center px-6">
      <View
        className="w-16 h-16 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: accent.light }}
      >
        <Users size={28} color={accent.hex} />
      </View>

      {family?.orgName && (
        <Text
          variant="caption"
          className="mb-1 uppercase tracking-wider"
          style={{ color: accent.hex }}
        >
          {family.orgName}
        </Text>
      )}

      <Text
        variant="title"
        className="mb-1 text-center"
        style={{ color: accent.hex, fontSize: 22 }}
      >
        {t("chat.parentGreeting")}
      </Text>
      <Text variant="caption" className="mb-8 text-center">
        {t("chat.parentSubtitle")}
      </Text>

      <View className="w-full gap-3">
        {suggestions.map((suggestion, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSuggestionTap(suggestion)}
            className="w-full rounded-2xl px-5 py-4 bg-white border border-gray-200 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text variant="body" className="text-gray-800 flex-1">
              {suggestion}
            </Text>
            <ArrowRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      <Text variant="caption" className="mt-6 text-center text-gray-400">
        {t("chat.parentHint")}
      </Text>

      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(mifa)/chat/[id]",
            params: { id: "new" },
          })
        }
        className="mt-3 w-full rounded-2xl px-6 py-4 flex-row items-center justify-center"
        style={{ backgroundColor: accent.hex }}
        activeOpacity={0.8}
      >
        <MessageCircle size={20} color="#fff" />
        <Text variant="body" className="text-white font-semibold ml-3">
          {t("chat.startChatting")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ChildWelcome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const { data: assistantsData } = useAssistants();
  const { data: statsData } = useMyStats();
  const accent = useAccentColor();
  const { session } = useChatSession();

  const assistants = assistantsData?.assistants || [];
  const topSubject = (statsData?.subjects || [])[0];

  // Build suggestion pool: mifa chip, subject chip, then generic fallbacks
  type Suggestion = { label: string; assistantId?: string };
  const pool: Suggestion[] = [];

  if (assistants.length > 0) {
    pool.push({
      label: t("chat.childSuggestionMifa", { name: assistants[0].name }),
      assistantId: assistants[0].id,
    });
  }
  if (topSubject) {
    pool.push({
      label: t("chat.childSuggestionSubject", { subject: topSubject.name }),
    });
  }
  pool.push({ label: t("chat.childSuggestionHomework") });
  pool.push({ label: t("chat.childSuggestionExplain") });
  pool.push({ label: t("chat.childSuggestionCreative") });

  const suggestions = pool.slice(0, 3);

  const onSuggestionTap = (suggestion: Suggestion) => {
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: {
        id: "new",
        initialMessage: suggestion.label,
        ...(suggestion.assistantId ? { assistantId: suggestion.assistantId } : {}),
      },
    });
  };

  const continueChat = () => {
    if (!session) return;
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: {
        id: session.conversationId,
        assistantId: session.assistantId || "",
      },
    });
  };

  const startNewChat = () => {
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: { id: "new" },
    });
  };

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text style={{ fontSize: 44, lineHeight: 56 }} className="mb-3">
        👋
      </Text>
      <Text
        variant="title"
        className="mb-1 text-center"
        style={{ color: accent.hex, fontSize: 22 }}
      >
        {t("chat.assistantReady", {
          name: family?.displayName || "",
        })}
      </Text>
      <Text variant="caption" className="mb-6 text-center">
        {t("chat.startTyping")}
      </Text>

      <View className="w-full gap-3 mb-6">
        {suggestions.map((suggestion, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSuggestionTap(suggestion)}
            className="w-full rounded-2xl px-5 py-4 bg-white border border-gray-200 flex-row items-center"
            activeOpacity={0.7}
          >
            <Text variant="body" className="text-gray-800 flex-1">
              {suggestion.label}
            </Text>
            <ArrowRight size={16} color="#9ca3af" />
          </TouchableOpacity>
        ))}
      </View>

      {session && (
        <TouchableOpacity
          onPress={continueChat}
          className="w-full rounded-2xl px-6 py-4 flex-row items-center mb-3"
          style={{ backgroundColor: accent.hex }}
          activeOpacity={0.8}
        >
          {session.assistantAvatar ? (
            <MifaAvatar avatar={session.assistantAvatar} size={24} />
          ) : (
            <MessageCircle size={20} color="#fff" />
          )}
          <Text variant="body" className="text-white font-semibold ml-3 flex-1">
            {session.assistantName || t("chat.continueChat")}
          </Text>
          <ArrowRight size={18} color="#fff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={startNewChat}
        className={`w-full rounded-2xl px-6 py-4 flex-row items-center ${session ? "bg-white border border-gray-200" : ""}`}
        style={!session ? { backgroundColor: accent.hex } : undefined}
        activeOpacity={0.8}
      >
        <MessageCircle size={20} color={session ? accent.hex : "#fff"} />
        <Text
          variant="body"
          className={`${session ? "text-gray-800" : "text-white"} font-semibold ml-3`}
        >
          {session ? t("chat.newConversation") : t("chat.startChatting")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatIndexScreen() {
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const insets = useSafeAreaInsets();

  const isChild = family?.role === "child";
  const isParent = family?.role === "parent";

  return (
    <View
      className="flex-1 bg-gray-50"
      style={{ paddingTop: insets.top }}
    >
      {/* Supervision badge */}
      {isChild && family?.supervisionMode && (
        <TouchableOpacity
          className="mx-4 mt-2 px-3 py-2 rounded-xl flex-row items-center"
          style={{ backgroundColor: accent.light }}
          activeOpacity={0.7}
          onPress={() => {
            const title = family.supervisionMode === "guided"
              ? t("chat.guidedBadge")
              : t("chat.trustedBadge");
            const message = family.supervisionMode === "guided"
              ? t("chat.guidedExplain")
              : t("chat.trustedExplain");
            Alert.alert(title, message);
          }}
        >
          <Shield size={14} color={accent.hex} />
          <Text variant="caption" className="ml-2 flex-1" style={{ color: accent.dark }}>
            {family.supervisionMode === "guided"
              ? t("chat.guidedBadge")
              : t("chat.trustedBadge")}
          </Text>
        </TouchableOpacity>
      )}

      {isParent ? <ParentWelcome /> : <ChildWelcome />}
    </View>
  );
}
