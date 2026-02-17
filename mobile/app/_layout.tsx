import "../global.css";
import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth";
import { QueryProvider, queryClient } from "@/lib/query";
import { setupNotifications } from "@/lib/notifications";
import * as Notifications from "expo-notifications";
import "@/lib/i18n";

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(mifa)/chat");
    }

    // Register push notifications whenever we have a session
    if (session) {
      setupNotifications().catch(console.error);
    }
  }, [session, loading, segments]);

  // Refetch relevant data when a push notification is received
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const type = notification.request.content.data?.type;
      if (type === "credit_transfer") {
        queryClient.invalidateQueries({ queryKey: ["myStats"] });
        queryClient.invalidateQueries({ queryKey: ["familyRole"] });
      } else if (type === "credit_request") {
        queryClient.invalidateQueries({ queryKey: ["familyAnalytics"] });
      } else if (type === "content_flag") {
        queryClient.invalidateQueries({ queryKey: ["familyAnalytics"] });
      }
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AuthGate />
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
