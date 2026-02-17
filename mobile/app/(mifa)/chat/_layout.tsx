import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useFamilyRole } from "@/lib/hooks/useFamilyRole";

export default function ChatLayout() {
  const { t } = useTranslation();
  const { data: family } = useFamilyRole();

  const greeting = family?.displayName
    ? t("chat.greeting", { name: family.displayName })
    : t("tabs.chat");

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "",
          headerBackTitle: t("common.buttons.back"),
        }}
      />
    </Stack>
  );
}
