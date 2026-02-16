import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { Button, Input, Text } from "@/components/ui";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    setLoading(true);
    setError("");
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
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
            <Text variant="title" className="text-primary-600 text-3xl">
              Mifa
            </Text>
            <Text variant="caption" className="mt-2">
              {t("auth.subtitle")}
            </Text>
          </View>

          <View className="gap-4">
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
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
            />

            {error ? (
              <Text variant="caption" className="text-red-500 text-center">
                {error}
              </Text>
            ) : null}

            <Button onPress={handleLogin} loading={loading} className="mt-2">
              {t("auth.signIn")}
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
