import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { isValidDisplayName } from "@/lib/validation";
import { Button, Input, MifaLogo, Text } from "@/components/ui";

export default function SignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (displayName.trim() && !isValidDisplayName(displayName.trim())) {
      setError(t("auth.invalidDisplayName"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.signup({
        email,
        password,
        displayName: displayName.trim() || undefined,
        redirectUrl: "/auth/choose-service?intent=mifa",
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || t("auth.signupError"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View className="flex-1 bg-white justify-center px-6">
        <View className="items-center">
          <MifaLogo size="lg" />
          <Text variant="heading" className="mt-6 text-center">
            {t("auth.checkEmail")}
          </Text>
          <Text variant="caption" className="mt-3 text-center px-4">
            {t("auth.checkEmailSubtitle")}
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/(auth)/login")}
            className="mt-8"
          >
            <Text className="text-indigo-600 font-semibold text-base">
              {t("auth.backToLogin")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          <View className="items-center mb-8">
            <MifaLogo size="lg" />
            <Text variant="caption" className="mt-3">
              {t("auth.signupSubtitle")}
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label={t("auth.displayName")}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t("auth.displayNamePlaceholder")}
              autoCapitalize="words"
              autoComplete="name"
            />

            <Input
              label={t("auth.email")}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label={t("auth.password")}
              value={password}
              onChangeText={setPassword}
              placeholder={t("auth.passwordPlaceholder")}
              secureTextEntry
              autoComplete="new-password"
            />

            <Input
              label={t("auth.confirmPassword")}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? (
              <Text variant="caption" className="text-red-500 text-center">
                {error}
              </Text>
            ) : null}

            <Button onPress={handleSignup} loading={loading} className="mt-2">
              {t("auth.createAccount")}
            </Button>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/login")}
              className="items-center mt-4"
            >
              <Text variant="caption" className="text-gray-500">
                {t("auth.alreadyHaveAccount")}{" "}
                <Text className="text-indigo-600 font-semibold">
                  {t("auth.signIn")}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
