import { View, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react-native";
import { Text } from "@/components/ui";
import { useConversations } from "@/lib/hooks/useMifa";

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

function ConversationRow({
  conversation,
  onPress,
  untitledLabel,
}: {
  conversation: any;
  onPress: () => void;
  untitledLabel: string;
}) {
  const date = new Date(conversation.updated_at || conversation.created_at);
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-4 px-4 border-b border-gray-100 bg-white"
    >
      <View className="flex-1">
        <Text variant="body" numberOfLines={1}>
          {conversation.title || untitledLabel}
        </Text>
        <Text variant="caption" className="mt-1">
          {getTimeAgo(date)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: conversationsData, refetch } = useConversations();

  const conversations = conversationsData?.conversations || [];

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item: any) => item.id}
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={
        conversations.length === 0 ? { flex: 1 } : { paddingBottom: 32 }
      }
      onRefresh={refetch}
      refreshing={false}
      renderItem={({ item }) => (
        <ConversationRow
          conversation={item}
          untitledLabel={t("history.untitled")}
          onPress={() =>
            router.push({
              pathname: "/(mifa)/chat/[id]",
              params: { id: item.id },
            })
          }
        />
      )}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center">
          <Clock size={48} color="#d1d5db" />
          <Text variant="caption" className="mt-4 text-gray-400">
            {t("history.noConversations")}
          </Text>
        </View>
      }
    />
  );
}
