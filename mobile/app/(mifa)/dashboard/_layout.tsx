import { Stack } from "expo-router";

export default function DashboardLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Mifa",
          headerLargeTitle: true,
        }}
      />
      <Stack.Screen
        name="[childId]"
        options={{
          title: "",
          headerBackTitle: "Back",
        }}
      />
    </Stack>
  );
}
