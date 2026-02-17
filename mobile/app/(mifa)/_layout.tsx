import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { View, ActivityIndicator } from "react-native";
import {
  MessageCircle,
  BarChart3,
  Settings,
  User,
  Sparkles,
  Clock,
  Users,
} from "lucide-react-native";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";
import { ChatSessionProvider } from "@/lib/chatSession";
import { AccentColorProvider } from "@/lib/AccentColorContext";
import { CreateFamilyScreen } from "@/components/CreateFamilyScreen";
import { SchoolSystemProvider } from "@/lib/SchoolSystemContext";
import { getAccentTheme } from "@/lib/theme";

export default function MifaLayout() {
  const { t } = useTranslation();
  const { data: family, isLoading } = useFamilyRole();

  const accent = getAccentTheme(family?.accentColor);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color={accent.hex} />
      </View>
    );
  }

  // New user with no family org — show onboarding
  if (!family?.orgId) {
    return (
      <AccentColorProvider value={accent}>
        <CreateFamilyScreen />
      </AccentColorProvider>
    );
  }

  const isParent = family.role !== "child";

  return (
    <AccentColorProvider value={accent}>
    <SchoolSystemProvider>
    <ChatSessionProvider>
    <Tabs
      initialRouteName={isParent ? "dashboard" : "chat"}
      screenOptions={{
        tabBarActiveTintColor: accent.hex,
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
      {/* Parent tabs: Stats, Family, Settings, Chat */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("tabs.stats"),
          headerShown: false,
          href: isParent ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t("tabs.family"),
          headerShown: false,
          href: isParent ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          headerShown: false,
          href: isParent ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
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

      {/* Child-only tabs */}
      <Tabs.Screen
        name="assistants"
        options={{
          title: t("tabs.assistants"),
          headerShown: false,
          href: isParent ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Sparkles size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          headerShown: false,
          href: isParent ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Clock size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          headerShown: false,
          href: isParent ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </ChatSessionProvider>
    </SchoolSystemProvider>
    </AccentColorProvider>
  );
}
