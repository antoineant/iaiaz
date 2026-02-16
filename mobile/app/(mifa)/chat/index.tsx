import { View, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Shield } from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { useAssistants, useConversations } from "@/lib/hooks/useMifa";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";

function AssistantCard({
  assistant,
  onPress,
}: {
  assistant: any;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card className="w-32 mr-3 items-center py-5">
        <View
          className="w-14 h-14 rounded-full items-center justify-center mb-2"
          style={{ backgroundColor: assistant.color + "20" }}
        >
          <Text className="text-2xl">{assistant.avatar}</Text>
        </View>
        <Text variant="label" className="text-center" numberOfLines={1}>
          {assistant.name}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

function ConversationRow({
  conversation,
  onPress,
}: {
  conversation: any;
  onPress: () => void;
}) {
  const date = new Date(conversation.updated_at || conversation.created_at);
  const timeAgo = getTimeAgo(date);

  return (
    <TouchableOpacity onPress={onPress}>
      <View className="flex-row items-center py-3 px-4 border-b border-gray-100">
        <View className="flex-1">
          <Text variant="body" numberOfLines={1}>
            {conversation.title || "Sans titre"}
          </Text>
          <Text variant="caption">{timeAgo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}j`;
}

export default function ChatIndexScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: family } = useFamilyRole();
  const { data: assistantsData } = useAssistants();
  const { data: conversationsData } = useConversations();

  const isChild = family?.role === "child";
  const assistants = assistantsData?.assistants || [];
  const conversations = conversationsData?.conversations || [];

  const startNewChat = (assistantId?: string) => {
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: { id: "new", assistantId: assistantId || "" },
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Supervision badge for children */}
      {isChild && family?.supervisionMode && (
        <View className="mx-4 mt-3 px-3 py-2 rounded-xl bg-primary-50 flex-row items-center">
          <Shield size={14} color="#6366f1" />
          <Text variant="caption" className="ml-2 text-primary-700 flex-1">
            {family.supervisionMode === "guided"
              ? t("chat.guidedBadge")
              : t("chat.trustedBadge")}
          </Text>
        </View>
      )}

      {/* Assistants */}
      <View className="px-4 pt-4 pb-2">
          <Text variant="subtitle" className="mb-3">
            {t("chat.myAssistants")}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* New chat button */}
            <TouchableOpacity onPress={() => startNewChat()}>
              <Card className="w-32 mr-3 items-center py-5">
                <View className="w-14 h-14 rounded-full bg-primary-100 items-center justify-center mb-2">
                  <Plus size={24} color="#6366f1" />
                </View>
                <Text variant="label" className="text-primary-600 text-center">
                  {t("chat.newChat")}
                </Text>
              </Card>
            </TouchableOpacity>

            {assistants.map((assistant: any) => (
              <AssistantCard
                key={assistant.id}
                assistant={assistant}
                onPress={() => startNewChat(assistant.id)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Recent Conversations */}
        <View className="mt-4">
          <Text variant="subtitle" className="px-4 mb-2">
            {t("chat.recentConversations")}
          </Text>
          <Card variant="outlined" className="mx-4 p-0 overflow-hidden">
            {conversations.length === 0 ? (
              <View className="py-8 items-center">
                <Text variant="caption">{t("chat.noConversations")}</Text>
              </View>
            ) : (
              conversations.slice(0, 20).map((convo: any) => (
                <ConversationRow
                  key={convo.id}
                  conversation={convo}
                  onPress={() =>
                    router.push({
                      pathname: "/(mifa)/chat/[id]",
                      params: { id: convo.id },
                    })
                  }
                />
              ))
            )}
          </Card>
        </View>

      <View className="h-8" />
    </ScrollView>
  );
}
