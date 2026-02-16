import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react-native";
import { Text } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function stripMifaMeta(content: string): string {
  return content.replace(/<mifa_meta>[\s\S]*?<\/mifa_meta>/g, "").trim();
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <View
      className={`mb-3 px-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary-600 rounded-br-md"
            : "bg-white border border-gray-100 rounded-bl-md"
        }`}
      >
        <Text
          variant="body"
          className={isUser ? "text-white" : "text-gray-800"}
        >
          {stripMifaMeta(message.content)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatConversationScreen() {
  const { id, assistantId } = useLocalSearchParams<{
    id: string;
    assistantId?: string;
  }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    id === "new" ? null : id
  );

  // Load existing conversation
  useEffect(() => {
    if (id !== "new") {
      loadConversation(id);
    }
  }, [id]);

  const loadConversation = async (convoId: string) => {
    try {
      const data = await api.getConversation(convoId);
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at),
          }))
        );
        if (data.title) {
          navigation.setOptions({ title: data.title });
        }
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const stream = api.sendMessage(
        conversationId,
        text,
        assistantId || undefined
      );

      for await (const chunk of stream) {
        if (chunk.type === "content") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              last.content += chunk.content;
            }
            return updated;
          });
          scrollRef.current?.scrollToEnd({ animated: false });
        }

        if (chunk.type === "conversation_id" && chunk.conversationId) {
          setConversationId(chunk.conversationId);
        }

        if (chunk.type === "title" && chunk.title) {
          navigation.setOptions({ title: chunk.title });
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          last.content = err.message || t("common.error");
        }
        return updated;
      });
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, assistantId]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={90}
    >
      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16 }}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.length === 0 && (
          <View className="flex-1 items-center justify-center py-20">
            <Text variant="title" className="text-primary-600 mb-2">
              {t("chat.assistantReady", {
                name: user?.user_metadata?.display_name || "",
              })}
            </Text>
            <Text variant="caption">{t("chat.startTyping")}</Text>
          </View>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {sending && messages[messages.length - 1]?.content === "" && (
          <View className="px-4 py-2">
            <ActivityIndicator size="small" color="#6366f1" />
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View className="border-t border-gray-200 bg-white px-4 py-3 flex-row items-end gap-2">
        <TextInput
          className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-base text-gray-900 max-h-32"
          placeholder={t("chat.inputPlaceholder")}
          placeholderTextColor="#9ca3af"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!sending}
          onSubmitEditing={sendMessage}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || sending}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            input.trim() && !sending ? "bg-primary-600" : "bg-gray-200"
          }`}
        >
          <Send
            size={18}
            color={input.trim() && !sending ? "#fff" : "#9ca3af"}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
