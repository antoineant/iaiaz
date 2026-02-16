import { useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react-native";
import { Text, Button } from "@/components/ui";
import { useAdoptAssistant } from "@/lib/hooks/useMifa";

export default function AdoptScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const adoptAssistant = useAdoptAssistant();

  const [code, setCode] = useState("");

  const handleAdopt = async () => {
    if (!code.trim()) return;

    try {
      await adoptAssistant.mutateAsync(code.trim());
      Alert.alert(t("mifas.adopted"));
      router.back();
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-8">
      <View className="items-center mb-8">
        <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mb-4">
          <Download size={36} color="#6366f1" />
        </View>
        <Text className="text-lg font-bold text-center mb-1">{t("mifas.adopt")}</Text>
        <Text className="text-sm text-gray-500 text-center">
          {t("mifas.adoptPlaceholder")}
        </Text>
      </View>

      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-lg text-center text-gray-900 mb-6 font-mono tracking-widest"
        placeholder="MIFA-XXXXXXXX"
        placeholderTextColor="#9ca3af"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={15}
      />

      <Button
        variant="primary"
        onPress={handleAdopt}
        loading={adoptAssistant.isPending}
        disabled={!code.trim() || adoptAssistant.isPending}
      >
        {adoptAssistant.isPending ? "..." : t("mifas.adopt")}
      </Button>
    </View>
  );
}
