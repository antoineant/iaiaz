import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, type CreditPreference } from "@/lib/credits";

// GET /api/profile - Get full profile with credits
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, credit_preference, credits_balance, conversation_retention_days, marketing_consent, is_admin, account_type, created_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    // Get full credit info
    const credits = await getUserCredits(user.id);

    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email, // Use auth email as source of truth
      },
      credits,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update profile fields
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { display_name, credit_preference, conversation_retention_days, marketing_consent } = body;

    // Validate credit_preference if provided
    const validPreferences: CreditPreference[] = [
      "auto",
      "org_first",
      "personal_first",
      "org_only",
      "personal_only",
    ];

    if (credit_preference && !validPreferences.includes(credit_preference)) {
      return NextResponse.json(
        { error: "Invalid credit preference" },
        { status: 400 }
      );
    }

    // Validate conversation_retention_days if provided
    const validRetentionDays = [null, 7, 30, 90, 365];
    if (conversation_retention_days !== undefined && !validRetentionDays.includes(conversation_retention_days)) {
      return NextResponse.json(
        { error: "Invalid retention period" },
        { status: 400 }
      );
    }

    // Build update object
    const updates: Record<string, string | number | boolean | null> = {};
    if (display_name !== undefined) {
      updates.display_name = display_name?.trim() || null;
    }
    if (credit_preference !== undefined) {
      updates.credit_preference = credit_preference;
    }
    if (conversation_retention_days !== undefined) {
      updates.conversation_retention_days = conversation_retention_days;
    }
    if (marketing_consent !== undefined && typeof marketing_consent === "boolean") {
      updates.marketing_consent = marketing_consent;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select("id, email, display_name, avatar_url, credit_preference, conversation_retention_days, marketing_consent")
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
