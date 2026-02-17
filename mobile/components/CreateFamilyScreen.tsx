import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button, Input, MifaLogo, Text } from "@/components/ui";

export function CreateFamilyScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Prefill with last word of Google profile name (likely the family name)
  const fullName = user?.user_metadata?.full_name || "";
  const defaultName = fullName.split(" ").pop() || "";

  const [familyName, setFamilyName] = useState(defaultName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    const trimmed = familyName.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    try {
      await api.createFamily(trimmed);
      await queryClient.invalidateQueries({ queryKey: ["familyRole"] });
    } catch (err: any) {
      setError(err.message || t("onboarding.error"));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-12">
            <MifaLogo size="lg" />
            <Text variant="heading" className="mt-6 text-center">
              {t("onboarding.title")}
            </Text>
            <Text variant="caption" className="mt-2 text-center">
              {t("onboarding.subtitle")}
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label={t("onboarding.familyNameLabel")}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={t("onboarding.familyNamePlaceholder")}
              autoCapitalize="words"
              autoFocus
            />

            {error ? (
              <Text variant="caption" className="text-red-500 text-center">
                {error}
              </Text>
            ) : null}

            <Button
              onPress={handleCreate}
              loading={loading}
              disabled={!familyName.trim()}
              className="mt-2"
            >
              {t("onboarding.createButton")}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
