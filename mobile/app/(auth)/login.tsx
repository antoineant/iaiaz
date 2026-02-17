import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "@/lib/auth";
import { Button, Input, Text } from "@/components/ui";
import { useTranslation } from "react-i18next";

export default function LoginScreen() {
  const { signIn, signInWithGoogle } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
    }
    setGoogleLoading(false);
  };

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

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-gray-200" />
              <Text variant="caption" className="mx-4 text-gray-400">
                {t("auth.or")}
              </Text>
              <View className="flex-1 h-px bg-gray-200" />
            </View>

            <TouchableOpacity
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              className="flex-row items-center justify-center border border-gray-300 rounded-xl py-3 px-4"
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24">
                  <Path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <Path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <Path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <Path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </Svg>
              )}
              <Text className="ml-3 text-base font-medium text-gray-700">
                {t("auth.continueWithGoogle")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
