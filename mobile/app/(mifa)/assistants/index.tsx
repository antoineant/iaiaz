import { useEffect, useState, useCallback } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Plus, Download } from "lucide-react-native";
import { Text, Card } from "@/components/ui";
import { MifaAvatar } from "@/components/MifaAvatar";
import { useAssistants } from "@/lib/hooks/useMifa";
import { api } from "@/lib/api";
import { getAccentTheme } from "@/lib/theme";

interface AssistantItem {
  id: string;
  type: "assistant" | "create" | "adopt";
  name?: string;
  avatar?: string;
  avatarType?: string;
  color?: string;
}

function XpBar({ assistantId, color }: { assistantId: string; color: string }) {
  const [xpData, setXpData] = useState<{ xp: number; level: string } | null>(null);

  useEffect(() => {
    api.getAssistantXp(assistantId).then(setXpData).catch(() => {});
  }, [assistantId]);

  if (!xpData) return null;

  const LEVELS = [
    { name: "novice", minXp: 0 },
    { name: "apprenti", minXp: 50 },
    { name: "expert", minXp: 200 },
    { name: "maitre", minXp: 500 },
    { name: "legende", minXp: 1000 },
  ];

  let levelIdx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xpData.xp >= LEVELS[i].minXp) { levelIdx = i; break; }
  }
  const nextMin = LEVELS[levelIdx + 1]?.minXp;
  const progress = nextMin
    ? (xpData.xp - LEVELS[levelIdx].minXp) / (nextMin - LEVELS[levelIdx].minXp)
    : 1;

  return (
    <View className="w-full mt-1">
      <View className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${color}30` }}>
        <View
          className="h-full rounded-full"
          style={{ width: `${Math.max(5, Math.round(progress * 100))}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

function LevelBadge({ assistantId, color }: { assistantId: string; color: string }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("novice");

  useEffect(() => {
    api.getAssistantXp(assistantId).then((data) => {
      setLevel(data.level);
    }).catch(() => {});
  }, [assistantId]);

  return (
    <View
      className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full"
      style={{ backgroundColor: color }}
    >
      <Text className="text-[8px] text-white font-bold">
        {t(`mifas.levels.${level}`)}
      </Text>
    </View>
  );
}

function MifaGridCard({
  item,
  onPress,
}: {
  item: AssistantItem;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  if (item.type === "create") {
    return (
      <TouchableOpacity onPress={onPress} className="flex-1 m-2">
        <Card variant="outlined" className="items-center py-6 border-dashed">
          <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
            <Plus size={24} color="#9ca3af" />
          </View>
          <Text variant="label" className="text-gray-500 text-center">
            {t("mifas.create")}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  }

  if (item.type === "adopt") {
    return (
      <TouchableOpacity onPress={onPress} className="flex-1 m-2">
        <Card variant="outlined" className="items-center py-6 border-dashed">
          <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
            <Download size={24} color="#9ca3af" />
          </View>
          <Text variant="label" className="text-gray-500 text-center">
            {t("mifas.adopt")}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  }

  const color = getAccentTheme(item.color).hex;

  return (
    <TouchableOpacity onPress={onPress} className="flex-1 m-2">
      <Card className="items-center py-5 relative overflow-hidden">
        <LevelBadge assistantId={item.id} color={color} />
        <View
          className="w-22 h-22 rounded-2xl items-center justify-center mb-2"
          style={{ backgroundColor: `${color}20`, width: 88, height: 88 }}
        >
          <MifaAvatar avatar={item.avatar || "🤖"} avatarType={item.avatar_type} size={68} />
        </View>
        <Text variant="label" className="text-center mb-1" numberOfLines={1}>
          {item.name}
        </Text>
        <XpBar assistantId={item.id} color={color} />
      </Card>
    </TouchableOpacity>
  );
}

export default function AssistantsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: assistantsData, refetch } = useAssistants();

  const assistants = assistantsData?.assistants || [];

  const gridItems: AssistantItem[] = [
    ...assistants.map((a: any) => ({
      id: a.id,
      type: "assistant" as const,
      name: a.name,
      avatar: a.avatar,
      avatarType: a.avatar_type,
      color: a.color,
    })),
    { id: "create", type: "create", name: t("mifas.create") },
    { id: "adopt", type: "adopt", name: t("mifas.adopt") },
  ];

  // Ensure even number for 2-column grid
  if (gridItems.length % 2 !== 0) {
    gridItems.push({ id: "spacer", type: "create", name: "" });
  }

  const handlePress = useCallback((item: AssistantItem) => {
    if (item.type === "create") {
      router.push("/(mifa)/assistants/create");
    } else if (item.type === "adopt") {
      router.push("/(mifa)/assistants/adopt");
    } else {
      router.push({
        pathname: "/(mifa)/assistants/[id]",
        params: { id: item.id },
      });
    }
  }, [router]);

  return (
    <FlatList
      data={gridItems}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={{ padding: 8, paddingBottom: 32 }}
      contentInsetAdjustmentBehavior="automatic"
      className="flex-1 bg-gray-50"
      onRefresh={refetch}
      refreshing={false}
      renderItem={({ item }) => {
        if (item.id === "spacer") {
          return <View className="flex-1 m-2" />;
        }
        return (
          <MifaGridCard item={item} onPress={() => handlePress(item)} />
        );
      }}
    />
  );
}
