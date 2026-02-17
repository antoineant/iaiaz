import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ push_token: token })
      .eq("id", user.id);

    if (error) {
      console.error("Error saving push token:", error);
      return NextResponse.json({ error: "Failed to save token" }, { status: 500 });
    }

    console.log(`📱 Push token saved for user ${user.id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push token error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
