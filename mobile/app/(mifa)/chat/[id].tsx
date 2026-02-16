import { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Audio } from "expo-av";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useTranslation } from "react-i18next";
import { Send, Mic, Square, ChevronDown, MessageCircle } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { Text } from "@/components/ui";
import { MifaAvatar } from "@/components/MifaAvatar";
import { api } from "@/lib/api";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useAssistants } from "@/lib/hooks/useMifa";
import { useChatSession } from "@/lib/chatSession";
import {
  RecorderState,
  requestMicPermission,
  startRecording,
  stopAndTranscribe,
} from "@/lib/audio";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function stripMifaMeta(content: string): string {
  return content.replace(/<mifa_meta>[\s\S]*?<\/mifa_meta>/g, "").trim();
}

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current, useRef(new Animated.Value(0.3)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View className="mb-3 px-4 items-start">
      <View className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-5 py-4 flex-row items-center gap-2">
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={{ opacity: dot, width: 8, height: 8, borderRadius: 4, backgroundColor: "#6366f1" }}
          />
        ))}
      </View>
    </View>
  );
}

const mdStylesUser = {
  body: { color: "#fff", fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  strong: { fontWeight: "700" as const, color: "#fff" },
  em: { fontStyle: "italic" as const },
  heading1: { fontSize: 20, fontWeight: "700" as const, color: "#fff", marginBottom: 4 },
  heading2: { fontSize: 18, fontWeight: "700" as const, color: "#fff", marginBottom: 4 },
  heading3: { fontSize: 16, fontWeight: "600" as const, color: "#fff", marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  code_inline: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 4, paddingHorizontal: 4, fontSize: 14, color: "#fff" },
  fence: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 8, padding: 8, fontSize: 13, color: "#fff" },
};

const mdStylesAssistant = {
  body: { color: "#1f2937", fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 4 },
  strong: { fontWeight: "700" as const, color: "#111827" },
  em: { fontStyle: "italic" as const },
  heading1: { fontSize: 20, fontWeight: "700" as const, color: "#111827", marginBottom: 4 },
  heading2: { fontSize: 18, fontWeight: "700" as const, color: "#111827", marginBottom: 4 },
  heading3: { fontSize: 16, fontWeight: "600" as const, color: "#374151", marginBottom: 4 },
  bullet_list: { marginBottom: 4 },
  ordered_list: { marginBottom: 4 },
  list_item: { marginBottom: 2 },
  code_inline: { backgroundColor: "#f3f4f6", borderRadius: 4, paddingHorizontal: 4, fontSize: 14, color: "#7c3aed" },
  fence: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 8, fontSize: 13, color: "#1f2937" },
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const content = stripMifaMeta(message.content);
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
        {isUser ? (
          <Text variant="body" className="text-white">
            {content}
          </Text>
        ) : (
          <Markdown style={mdStylesAssistant}>{content}</Markdown>
        )}
      </View>
    </View>
  );
}

export default function ChatConversationScreen() {
  const { id, assistantId: initialAssistantId } = useLocalSearchParams<{
    id: string;
    assistantId?: string;
  }>();
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();
  const navigation = useNavigation();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    id === "new" ? null : id
  );
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | undefined>(
    initialAssistantId || undefined
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { data: assistantsData } = useAssistants();
  const { startSession } = useChatSession();

  // Resolve assistant info
  const assistants = assistantsData?.assistants || [];
  const activeAssistant = selectedAssistantId
    ? assistants.find((a: any) => a.id === selectedAssistantId)
    : null;

  const canChangePicker = messages.length === 0 && !conversationId;

  // Show assistant name in header
  useEffect(() => {
    if (activeAssistant) {
      const isEmoji = !activeAssistant.avatar_type || activeAssistant.avatar_type === "emoji";
      const prefix = isEmoji ? `${activeAssistant.avatar} ` : "";
      navigation.setOptions({ title: `${prefix}${activeAssistant.name}` });
    } else if (id === "new") {
      navigation.setOptions({ title: t("chat.newConversation") });
    }
  }, [activeAssistant, id]);

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

    try {
      const result = await api.sendMessage(
        conversationId,
        text,
        selectedAssistantId || undefined
      );

      if (result.conversationId) {
        setConversationId(result.conversationId);
        startSession({
          conversationId: result.conversationId,
          assistantId: selectedAssistantId || undefined,
          assistantName: activeAssistant?.name,
          assistantAvatar: activeAssistant?.avatar,
        });
      }

      // Typewriter effect: reveal words progressively
      const msgId = (Date.now() + 1).toString();
      const words = result.content.split(/(\s+)/); // keep whitespace
      let revealed = "";

      setMessages((prev) => [
        ...prev,
        { id: msgId, role: "assistant", content: "", timestamp: new Date() },
      ]);

      for (let i = 0; i < words.length; i++) {
        revealed += words[i];
        const snapshot = revealed;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.id === msgId) last.content = snapshot;
          return updated;
        });
        if (i % 4 === 0) {
          scrollRef.current?.scrollToEnd({ animated: false });
          await new Promise((r) => setTimeout(r, 30));
        }
      }
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: err.message || t("common.error"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, selectedAssistantId]);

  const toggleRecording = useCallback(async () => {
    if (recorderState === "transcribing") return;

    if (recorderState === "recording") {
      // Stop and transcribe
      const recording = recordingRef.current;
      if (!recording) return;
      recordingRef.current = null;
      setRecorderState("transcribing");
      try {
        const text = await stopAndTranscribe(recording);
        if (text) setInput((prev) => (prev ? prev + " " + text : text));
      } catch (err: any) {
        console.error("Transcription error:", err);
      } finally {
        setRecorderState("idle");
      }
      return;
    }

    // Start recording
    const granted = await requestMicPermission();
    if (!granted) return;
    try {
      const recording = await startRecording();
      recordingRef.current = recording;
      setRecorderState("recording");
    } catch (err: any) {
      console.error("Recording error:", err);
      setRecorderState("idle");
    }
  }, [recorderState]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={90}
    >
      {/* Assistant picker chip — only before first message */}
      {canChangePicker && (
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          className="mx-4 mt-2 mb-1 px-4 py-2.5 rounded-full bg-white border border-gray-200 flex-row items-center self-start"
          activeOpacity={0.7}
        >
          {activeAssistant ? (
            <>
              <View className="mr-1.5">
                <MifaAvatar avatar={activeAssistant.avatar} avatarType={activeAssistant.avatar_type} size={20} />
              </View>
              <Text variant="label" className="text-gray-800">{activeAssistant.name}</Text>
            </>
          ) : (
            <>
              <MessageCircle size={16} color="#6366f1" />
              <Text variant="label" className="text-gray-500 ml-1.5">{t("chat.pickAssistant")}</Text>
            </>
          )}
          <ChevronDown size={16} color="#9ca3af" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      )}

      {/* Assistant picker modal */}
      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setPickerOpen(false)}
        >
          <Pressable
            className="bg-white rounded-t-3xl px-4 pt-5 pb-10"
            onPress={(e) => e.stopPropagation()}
          >
            <Text variant="subtitle" className="mb-4 text-center">
              {t("chat.pickAssistant")}
            </Text>
            <FlatList
              data={[{ id: "none", name: t("chat.noAssistant"), avatar: null, color: null }, ...assistants]}
              keyExtractor={(item: any) => item.id}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedAssistantId(item.id === "none" ? undefined : item.id);
                    setPickerOpen(false);
                  }}
                  className={`flex-row items-center py-3 px-3 rounded-xl mb-1 ${
                    (item.id === "none" && !selectedAssistantId) ||
                    item.id === selectedAssistantId
                      ? "bg-primary-50"
                      : ""
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: item.color ? item.color + "20" : "#f3f4f6" }}
                  >
                    {item.avatar ? (
                      <MifaAvatar avatar={item.avatar} avatarType={item.avatar_type} size={28} />
                    ) : (
                      <MessageCircle size={18} color="#6366f1" />
                    )}
                  </View>
                  <Text variant="body" className="flex-1">{item.name}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 350 }}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
            {activeAssistant && (
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: (activeAssistant.color || "#6366f1") + "20" }}
              >
                <MifaAvatar avatar={activeAssistant.avatar} avatarType={activeAssistant.avatar_type} size={40} />
              </View>
            )}
            <Text variant="title" className="text-primary-600 mb-2">
              {activeAssistant
                ? activeAssistant.name
                : t("chat.assistantReady", { name: family?.displayName || "" })}
            </Text>
            <Text variant="caption">{t("chat.startTyping")}</Text>
          </View>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {sending && <TypingIndicator />}
      </ScrollView>

      {/* Input bar */}
      <View className="border-t border-gray-200 bg-white px-4 py-3 flex-row items-end gap-2">
        {recorderState === "recording" ? (
          <View className="flex-1 bg-red-50 rounded-2xl px-4 py-3 flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text variant="body" className="text-red-600">
              {t("chat.recording")}
            </Text>
          </View>
        ) : recorderState === "transcribing" ? (
          <View className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 flex-row items-center">
            <ActivityIndicator size="small" color="#6366f1" />
            <Text variant="body" className="text-gray-500 ml-2">
              {t("chat.transcribing")}
            </Text>
          </View>
        ) : (
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
        )}
        {/* Mic button */}
        <TouchableOpacity
          onPress={toggleRecording}
          disabled={sending || recorderState === "transcribing"}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            recorderState === "recording"
              ? "bg-red-500"
              : "bg-gray-200"
          }`}
        >
          {recorderState === "recording" ? (
            <Square size={16} color="#fff" />
          ) : (
            <Mic
              size={18}
              color={recorderState === "transcribing" ? "#d1d5db" : "#6366f1"}
            />
          )}
        </TouchableOpacity>
        {/* Send button */}
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!input.trim() || sending || recorderState !== "idle"}
          className={`w-11 h-11 rounded-full items-center justify-center ${
            input.trim() && !sending && recorderState === "idle"
              ? "bg-primary-600"
              : "bg-gray-200"
          }`}
        >
          <Send
            size={18}
            color={
              input.trim() && !sending && recorderState === "idle"
                ? "#fff"
                : "#9ca3af"
            }
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
