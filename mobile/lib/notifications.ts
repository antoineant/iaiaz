import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = (
    await Notifications.getExpoPushTokenAsync({ projectId })
  ).data;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return token;
}

async function savePushToken(token: string) {
  // Save via API (bypasses RLS via admin client on server)
  const { api } = await import("./api");
  await api.savePushToken(token);
  console.log("📱 Push token saved via API");
}

export async function setupNotifications() {
  try {
    const token = await registerForPushNotifications();
    if (token) {
      console.log("📱 Got push token:", token.substring(0, 30) + "...");
      await savePushToken(token);
    } else {
      console.log("📱 No push token obtained");
    }
  } catch (err) {
    console.error("📱 setupNotifications error:", err);
  }
}
