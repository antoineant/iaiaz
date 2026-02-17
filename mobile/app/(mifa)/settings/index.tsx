import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { Globe, GraduationCap, Palette } from "lucide-react-native";
import { Text, Card, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { useUpdateTheme } from "@/lib/hooks/useMifa";
import { useAccentColor } from "@/lib/AccentColorContext";
import { useSchoolSystem } from "@/lib/SchoolSystemContext";
import { ACCENT_COLORS } from "@/lib/theme";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { data: family } = useFamilyRole();
  const accent = useAccentColor();
  const { schoolSystem, setSchoolSystem } = useSchoolSystem();
  const updateTheme = useUpdateTheme();
  const queryClient = useQueryClient();

  const currentColor = family?.accentColor || "cobalt";

  const currentLang = i18n.language?.startsWith("fr") ? "fr" : "en";

  const toggleLanguage = () => {
    const next = currentLang === "fr" ? "en" : "fr";
    i18n.changeLanguage(next);
  };

  const handleColorChange = async (color: string) => {
    try {
      await updateTheme.mutateAsync(color);
      queryClient.invalidateQueries({ queryKey: ["familyRole"] });
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="px-4 pt-4">
        {/* Language Toggle */}
        <Text variant="subtitle" className="mb-3">
          {t("settings.language")}
        </Text>
        <TouchableOpacity onPress={toggleLanguage}>
          <Card variant="outlined" className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Globe size={20} color={accent.hex} />
              <Text variant="body" className="ml-3">
                {currentLang === "fr" ? "Français" : "English"}
              </Text>
            </View>
            <View
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: `${accent.hex}15` }}
            >
              <Text
                variant="caption"
                className="font-semibold"
                style={{ color: accent.hex }}
              >
                {currentLang === "fr" ? "EN" : "FR"}
              </Text>
            </View>
          </Card>
        </TouchableOpacity>

        {/* School System Toggle */}
        <Text variant="subtitle" className="mb-3">
          {t("settings.schoolSystem")}
        </Text>
        <Card variant="outlined" className="mb-6">
          <View className="flex-row items-center mb-3">
            <GraduationCap size={20} color={accent.hex} />
            <Text variant="body" className="ml-3">
              {t("settings.schoolSystem")}
            </Text>
          </View>
          <View className="flex-row gap-2">
            {(["fr", "uk"] as const).map((sys) => (
              <TouchableOpacity
                key={sys}
                onPress={() => setSchoolSystem(sys)}
                className={`flex-1 py-2 px-3 rounded-xl items-center ${
                  schoolSystem === sys ? "" : "bg-gray-100"
                }`}
                style={
                  schoolSystem === sys
                    ? { backgroundColor: accent.hex }
                    : undefined
                }
              >
                <Text
                  variant="caption"
                  className={`font-semibold ${
                    schoolSystem === sys ? "text-white" : "text-gray-600"
                  }`}
                >
                  {t(`settings.schoolSystems.${sys}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Theme Color */}
        <Text variant="subtitle" className="mb-3">
          <Palette size={18} color={accent.hex} />{" "}
          {t("childSettings.theme.title")}
        </Text>
        <Card variant="outlined" className="mb-6">
          <Text variant="label" className="mb-3">
            {t("childSettings.theme.chooseColor")}
          </Text>
          <View className="flex-row flex-wrap gap-2 justify-center">
            {ACCENT_COLORS.map((c) => (
              <TouchableOpacity
                key={c.name}
                onPress={() => handleColorChange(c.name)}
                className="items-center"
                style={{ width: 56 }}
              >
                <View
                  className={`w-11 h-11 rounded-full mb-1 ${
                    currentColor === c.name ? "border-[3px] border-gray-800" : ""
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
                <Text className="text-[9px] text-gray-500 text-center">{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Sign Out */}
        <Button variant="outline" onPress={signOut} className="mb-8">
          {t("settings.signOut")}
        </Button>
      </View>
    </ScrollView>
  );
}
