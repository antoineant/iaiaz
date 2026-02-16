import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { View, ActivityIndicator } from "react-native";
import {
  MessageCircle,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react-native";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";

export default function MifaLayout() {
  const { t } = useTranslation();
  const { data: family, isLoading } = useFamilyRole();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const isParent = family?.role === "parent";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f3f4f6",
          paddingBottom: 4,
          height: 84,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#fff",
        },
        headerTintColor: "#111827",
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: t("tabs.chat"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("tabs.dashboard"),
          headerShown: false,
          href: isParent ? undefined : null, // Hide for children
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          headerShown: false,
          href: isParent ? undefined : null, // Hide for children
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          headerShown: false,
          href: isParent ? null : undefined, // Hide for parents
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
