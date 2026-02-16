import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageCircle, Shield, ArrowRight } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useChatSession } from "@/lib/chatSession";
import { useAccentColor } from "@/lib/AccentColorContext";

export default function ChatIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();

  const { session } = useChatSession();
  const isChild = family?.role === "child";

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
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {/* Supervision badge for children */}
      {isChild && family?.supervisionMode && (
        <TouchableOpacity
          className="mx-4 mt-3 px-3 py-2 rounded-xl flex-row items-center"
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

      {/* Welcome empty state */}
      <View className="flex-1 items-center justify-center px-6">
        <Text variant="title" className="mb-2 text-center" style={{ color: accent.hex }}>
          {t("chat.assistantReady", {
            name: family?.displayName || "",
          })}
        </Text>
        <Text variant="caption" className="mb-8 text-center">
          {t("chat.startTyping")}
        </Text>

        {session && (
          <TouchableOpacity
            onPress={continueChat}
            className="rounded-2xl px-8 py-4 flex-row items-center mb-4"
            style={{ backgroundColor: accent.hex }}
            activeOpacity={0.8}
          >
            {session.assistantAvatar ? (
              <Text className="text-xl">{session.assistantAvatar}</Text>
            ) : (
              <MessageCircle size={22} color="#fff" />
            )}
            <Text variant="body" className="text-white font-semibold ml-3 text-lg flex-1">
              {session.assistantName || t("chat.continueChat")}
            </Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={startNewChat}
          className={`${session ? "bg-white border border-gray-200" : ""} rounded-2xl px-8 py-4 flex-row items-center`}
          style={!session ? { backgroundColor: accent.hex } : undefined}
          activeOpacity={0.8}
        >
          <MessageCircle size={22} color={session ? accent.hex : "#fff"} />
          <Text variant="body" className={`${session ? "text-gray-800" : "text-white"} font-semibold ml-3 text-lg`}>
            {session ? t("chat.newConversation") : t("chat.startChatting")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
