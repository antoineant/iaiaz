import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { MessageSquare, Share2, Trash2, Copy } from "lucide-react-native";
import { Text, Button } from "@/components/ui";
import { MifaAvatar } from "@/components/MifaAvatar";
import { GaugeGroup, DEFAULT_GAUGES } from "@/components/GaugeSlider";
import type { Gauges } from "@/components/GaugeSlider";
import {
  useAssistants,
  useAssistantXp,
  useUpdateAssistant,
  useDeleteAssistant,
  useGenerateShareCode,
} from "@/lib/hooks/useMifa";

const XP_LEVELS = [
  { name: "novice", minXp: 0 },
  { name: "apprenti", minXp: 50 },
  { name: "expert", minXp: 200 },
  { name: "maitre", minXp: 500 },
  { name: "legende", minXp: 1000 },
];

function getLevel(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) {
      return { name: XP_LEVELS[i].name, minXp: XP_LEVELS[i].minXp, nextMinXp: XP_LEVELS[i + 1]?.minXp ?? null, index: i };
    }
  }
  return { name: "novice", minXp: 0, nextMinXp: 50, index: 0 };
}

export default function MifaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();

  const { data: assistantsData } = useAssistants();
  const { data: xpData } = useAssistantXp(id);
  const updateAssistant = useUpdateAssistant();
  const deleteAssistant = useDeleteAssistant();
  const generateShareCode = useGenerateShareCode();

  const assistant = (assistantsData?.assistants || []).find((a: any) => a.id === id);
  const [gauges, setGauges] = useState<Gauges>(assistant?.gauges || DEFAULT_GAUGES);
  const [shareCode, setShareCode] = useState<string | null>(assistant?.share_code || null);

  useEffect(() => {
    if (assistant?.gauges) setGauges(assistant.gauges);
    if (assistant?.share_code) setShareCode(assistant.share_code);
  }, [assistant]);

  if (!assistant) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-400">Loading...</Text>
      </View>
    );
  }

  const color = assistant.color || "#818CF8";
  const xp = xpData?.xp || 0;
  const level = getLevel(xp);
  const xpProgress = level.nextMinXp
    ? (xp - level.minXp) / (level.nextMinXp - level.minXp)
    : 1;

  const hasChanges = JSON.stringify(gauges) !== JSON.stringify(assistant.gauges);

  const gaugeLabels = {
    creativity: t("mifas.gauges.creativity"),
    patience: t("mifas.gauges.patience"),
    humor: t("mifas.gauges.humor"),
    rigor: t("mifas.gauges.rigor"),
    curiosity: t("mifas.gauges.curiosity"),
  };

  const handleSaveGauges = async () => {
    try {
      await updateAssistant.mutateAsync({ id: assistant.id, data: { gauges } });
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  const handleStartChat = () => {
    router.push({
      pathname: "/(mifa)/chat/[id]",
      params: { id: "new", assistantId: assistant.id },
    });
  };

  const handleShare = async () => {
    if (!shareCode) {
      try {
        const result = await generateShareCode.mutateAsync(assistant.id);
        const code = result?.assistant?.share_code;
        if (code) setShareCode(code);
      } catch (err: any) {
        Alert.alert(t("common.error"), err.message);
      }
      return;
    }

    const code = `MIFA-${shareCode}`;
    try {
      await Share.share({ message: `${t("mifas.shareCode")}: ${code}` });
    } catch {}
  };

  const handleCopyCode = async () => {
    if (shareCode) {
      await Share.share({ message: `MIFA-${shareCode}` });
    }
  };

  const handleDelete = () => {
    Alert.alert(t("mifas.deleteConfirm"), "", [
      { text: t("common.buttons.cancel"), style: "cancel" },
      {
        text: t("common.buttons.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAssistant.mutateAsync(assistant.id);
            router.back();
          } catch (err: any) {
            Alert.alert(t("common.error"), err.message);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header gradient */}
      <View
        className="pt-24 pb-8 px-6 items-center"
        style={{ backgroundColor: color }}
      >
        <View
          className="w-24 h-24 rounded-3xl items-center justify-center mb-3"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <MifaAvatar avatar={assistant.avatar} avatarType={assistant.avatar_type} size={72} />
        </View>
        <Text className="text-xl font-bold text-white mb-1">{assistant.name}</Text>
        <View className="px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
          <Text className="text-xs text-white font-medium">
            {t(`mifas.levels.${level.name}`)}
          </Text>
        </View>

        {/* XP Bar */}
        <View className="w-full mt-4">
          <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            <View
              className="h-full rounded-full"
              style={{ width: `${Math.round(xpProgress * 100)}%`, backgroundColor: "rgba(255,255,255,0.8)" }}
            />
          </View>
          <Text className="text-xs text-white/70 mt-1 text-center">
            {t("mifas.xp", { xp })} — {t(`mifas.levels.${level.name}`)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="px-4 pt-6">
        {/* Gauges */}
        <Text className="text-sm font-semibold mb-3">{t("mifas.gauges.creativity").replace("Créativité", "Personnalité").replace("Creativity", "Personality")}</Text>
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <GaugeGroup gauges={gauges} labels={gaugeLabels} onChange={setGauges} color={color} />
          {hasChanges && (
            <Button
              variant="primary"
              onPress={handleSaveGauges}
              loading={updateAssistant.isPending}
              className="mt-3"
            >
              {t("common.buttons.save")}
            </Button>
          )}
        </View>

        {/* System prompt */}
        <Text className="text-sm font-semibold mb-2">{t("mifas.instructions")}</Text>
        <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
          <Text className="text-xs text-gray-500">{assistant.system_prompt}</Text>
        </View>

        {/* Share */}
        <Text className="text-sm font-semibold mb-2">{t("mifas.share")}</Text>
        <View className="bg-white rounded-xl p-4 mb-6 border border-gray-100">
          {shareCode ? (
            <View className="flex-row items-center gap-3">
              <View className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                <Text className="text-sm font-mono">MIFA-{shareCode}</Text>
              </View>
              <TouchableOpacity onPress={handleCopyCode} className="p-2">
                <Copy size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} className="p-2">
                <Share2 size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleShare}
              className="flex-row items-center gap-2"
            >
              <Share2 size={18} color={color} />
              <Text className="text-sm" style={{ color }}>{t("mifas.share")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            onPress={handleStartChat}
            className="flex-1 flex-row items-center justify-center gap-2 py-4 rounded-xl"
            style={{ backgroundColor: color }}
          >
            <MessageSquare size={18} color="#fff" />
            <Text className="text-white font-semibold">{t("mifas.startChat")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            className="p-4 rounded-xl border border-red-200"
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
