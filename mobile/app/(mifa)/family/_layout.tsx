import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function FamilyLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("tabs.family"),
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="transfer"
        options={{
          title: t("dashboard.transferCredits"),
          headerBackTitle: t("common.buttons.back"),
        }}
      />
    </Stack>
  );
}
