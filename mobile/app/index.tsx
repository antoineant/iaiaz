import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(mifa)/chat" />;
  }

  return <Redirect href="/(auth)/login" />;
}
