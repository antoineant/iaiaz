import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function AssistantsLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("mifas.title"),
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: t("mifas.create"),
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "",
          headerTransparent: true,
          headerTintColor: "#fff",
        }}
      />
      <Stack.Screen
        name="adopt"
        options={{
          title: t("mifas.adopt"),
          presentation: "modal",
        }}
      />
    </Stack>
  );
}
