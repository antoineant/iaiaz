// Server-side Expo push notification sender
import { createAdminClient } from "@/lib/supabase/admin";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to a user by their user ID.
 * Looks up the push_token from profiles. No-ops if no token found.
 */
export async function sendPushToUser(
  userId: string,
  message: PushMessage
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("push_token")
      .eq("id", userId)
      .single();

    if (!profile?.push_token) {
      console.log(`📱 No push token for user ${userId}`);
      return;
    }

    console.log(`📱 Sending push to user ${userId}: "${message.title}"`);
    await sendExpoPush(profile.push_token, message);
  } catch (err) {
    console.error("Push notification error for user", userId, err);
  }
}

/**
 * Send push notifications to multiple users by their IDs.
 * Looks up tokens in bulk and sends in a single batch request.
 */
export async function sendPushToUsers(
  userIds: string[],
  message: PushMessage
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const admin = createAdminClient();
    const { data: profiles } = await admin
      .from("profiles")
      .select("push_token")
      .in("id", userIds)
      .not("push_token", "is", null);

    const tokens = profiles
      ?.map((p) => p.push_token)
      .filter(Boolean) as string[];

    if (!tokens || tokens.length === 0) {
      console.log(`📱 No push tokens for users ${userIds.join(", ")}`);
      return;
    }

    console.log(`📱 Sending push to ${tokens.length} device(s): "${message.title}"`);
    await sendExpoPushBatch(tokens, message);
  } catch (err) {
    console.error("Push notification error for users", userIds, err);
  }
}

async function sendExpoPush(
  token: string,
  message: PushMessage
): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data,
    }),
  });
  const json = await res.json();
  if (json.data?.[0]?.status === "error") {
    console.error("📱 Expo push error:", json.data[0].message);
  }
}

async function sendExpoPushBatch(
  tokens: string[],
  message: PushMessage
): Promise<void> {
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title: message.title,
    body: message.body,
    data: message.data,
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
  const json = await res.json();
  const errors = json.data?.filter((d: any) => d.status === "error");
  if (errors?.length > 0) {
    console.error("📱 Expo push errors:", errors.map((e: any) => e.message));
  }
}
