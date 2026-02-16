import { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, Card, Button } from "@/components/ui";
import { GaugeGroup, DEFAULT_GAUGES } from "@/components/GaugeSlider";
import type { Gauges } from "@/components/GaugeSlider";
import { useCreateAssistant } from "@/lib/hooks/useMifa";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

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

const EMOJI_SUGGESTIONS = [
  "\u{1F4DA}", "\u{1F9EE}", "\u{1F3A8}", "\u{1F3B5}", "\u{1F30D}", "\u{1F52C}", "\u{1F4DD}", "\u{1F9D1}\u{200D}\u{1F3EB}",
  "\u{1F680}", "\u{1F916}", "\u{1F4A1}", "\u{2728}", "\u{1F3AF}", "\u{1F9E0}", "\u{1F4AC}", "\u{1F31F}",
];

export default function CreateAssistantScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const createAssistant = useCreateAssistant();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("\u{1F916}");
  const [color, setColor] = useState("purple");
  const [instructions, setInstructions] = useState("");
  const [gauges, setGauges] = useState<Gauges>({ ...DEFAULT_GAUGES });
  const [avatarMode, setAvatarMode] = useState<"emoji" | "generated">("emoji");
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const selectedColorHex =
    ACCENT_COLORS.find((c) => c.name === color)?.hex || "#a855f7";

  const gaugeLabels = {
    creativity: t("mifas.gauges.creativity"),
    patience: t("mifas.gauges.patience"),
    humor: t("mifas.gauges.humor"),
    rigor: t("mifas.gauges.rigor"),
    curiosity: t("mifas.gauges.curiosity"),
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_URL}/api/mifa/assistants/generate-avatar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          purpose: instructions.trim().slice(0, 200),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        Alert.alert(t("common.error"), data.error || "Error");
        return;
      }
      const { imageUrl } = await res.json();
      setGeneratedAvatarUrl(imageUrl);
      setAvatarMode("generated");
    } catch {
      Alert.alert(t("common.error"), "Connection error");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const isGenerated = avatarMode === "generated" && generatedAvatarUrl;

    try {
      await createAssistant.mutateAsync({
        name: name.trim(),
        avatar: isGenerated ? generatedAvatarUrl : avatar,
        avatar_type: isGenerated ? "generated" : "emoji",
        color: selectedColorHex,
        system_prompt: instructions.trim(),
        gauges,
      });
      Alert.alert(t("mifas.created"));
      router.back();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Preview */}
      <View className="items-center mb-6">
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-2 overflow-hidden"
          style={{ backgroundColor: selectedColorHex + "20" }}
        >
          {avatarMode === "generated" && generatedAvatarUrl ? (
            <Image
              source={{ uri: generatedAvatarUrl }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
              resizeMode="cover"
            />
          ) : (
            <Text className="text-4xl">{avatar}</Text>
          )}
        </View>
        <Text variant="subtitle">{name || t("mifas.namePlaceholder")}</Text>
      </View>

      {/* Name */}
      <Text variant="label" className="mb-2">
        {t("mifas.name")}
      </Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
        placeholder={t("mifas.namePlaceholder")}
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={(text) => setName(text.slice(0, 50))}
        maxLength={50}
      />

      {/* Avatar mode toggle */}
      <Text variant="label" className="mb-2">
        {t("mifas.avatar")}
      </Text>
      <View className="flex-row gap-2 mb-3">
        <TouchableOpacity
          onPress={() => setAvatarMode("emoji")}
          className={`flex-1 py-2 px-3 rounded-lg items-center ${
            avatarMode === "emoji" ? "bg-primary-500" : "bg-gray-200"
          }`}
        >
          <Text className={avatarMode === "emoji" ? "text-white font-medium text-sm" : "text-gray-600 text-sm"}>
            Emoji
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAvatarMode("generated")}
          className={`flex-1 py-2 px-3 rounded-lg items-center flex-row justify-center gap-1 ${
            avatarMode === "generated" ? "bg-primary-500" : "bg-gray-200"
          }`}
        >
          <Text className={avatarMode === "generated" ? "text-white font-medium text-sm" : "text-gray-600 text-sm"}>
            {"\u2728"} AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Emoji grid */}
      {avatarMode === "emoji" && (
        <Card variant="outlined" className="mb-4">
          <View className="flex-row flex-wrap gap-3">
            {EMOJI_SUGGESTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setAvatar(emoji)}
                className={`w-11 h-11 rounded-full items-center justify-center ${
                  avatar === emoji ? "bg-primary-100" : "bg-gray-50"
                }`}
              >
                <Text className="text-xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      )}

      {/* AI generation */}
      {avatarMode === "generated" && (
        <Card variant="outlined" className="mb-4">
          <View className="items-center gap-3 py-2">
            {generatedAvatarUrl ? (
              <>
                <Image
                  source={{ uri: generatedAvatarUrl }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={handleGenerate}
                  disabled={generating}
                  className="flex-row items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
                >
                  {generating ? (
                    <ActivityIndicator size="small" />
                  ) : null}
                  <Text className="text-sm text-gray-700">
                    {generating ? t("mifas.generating") || "Generating..." : t("mifas.regenerate") || "Regenerate"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleGenerate}
                disabled={generating || !name.trim()}
                className="w-full py-6 items-center gap-2"
              >
                {generating ? (
                  <>
                    <ActivityIndicator size="large" color={selectedColorHex} />
                    <Text className="text-sm text-gray-500">{t("mifas.generating") || "Generating..."}</Text>
                  </>
                ) : (
                  <>
                    <Text className="text-3xl">{"\u2728"}</Text>
                    <Text className="text-sm font-medium text-gray-700">{t("mifas.generateAvatar") || "Generate with AI"}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* Color */}
      <Text variant="label" className="mb-2">
        {t("mifas.color")}
      </Text>
      <Card variant="outlined" className="mb-4">
        <View className="flex-row flex-wrap gap-3">
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c.name}
              onPress={() => setColor(c.name)}
              className={`w-10 h-10 rounded-full ${
                color === c.name ? "border-2 border-gray-800" : ""
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </View>
      </Card>

      {/* Instructions */}
      <Text variant="label" className="mb-2">
        {t("mifas.instructions")}
      </Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 min-h-[120px]"
        placeholder={t("mifas.instructionsPlaceholder")}
        placeholderTextColor="#9ca3af"
        value={instructions}
        onChangeText={(text) => setInstructions(text.slice(0, 2000))}
        maxLength={2000}
        multiline
        textAlignVertical="top"
      />

      {/* Gauges */}
      <Text variant="label" className="mb-2">
        {t("mifas.gauges.creativity").includes("réa") ? "Personnalité" : "Personality"}
      </Text>
      <Card variant="outlined" className="mb-6">
        <GaugeGroup gauges={gauges} labels={gaugeLabels} onChange={setGauges} color={selectedColorHex} />
      </Card>

      {/* Submit */}
      <Button
        variant="primary"
        onPress={handleSubmit}
        loading={createAssistant.isPending}
        disabled={!name.trim() || createAssistant.isPending}
      >
        {createAssistant.isPending
          ? t("mifas.creating")
          : t("mifas.create")}
      </Button>
    </ScrollView>
  );
}
