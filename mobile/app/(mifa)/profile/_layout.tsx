import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function ProfileLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: t("tabs.profile"),
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
