import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

function generatePassword(): string {
  const words = ["Mifa", "Star", "Luna", "Nova", "Ciel", "Soleil", "Pixel", "Astro"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = crypto.randomInt(100, 999);
  const special = ["!", "#", "+", "="][Math.floor(Math.random() * 4)];
  return `${word}-${digits}${special}`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { childUserId } = await request.json();
    if (!childUserId) {
      return NextResponse.json({ error: "childUserId required" }, { status: 400 });
    }

    // Verify parent is owner/admin of a family org
    const { data: parentMembership } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        organization_id,
        organization:organizations (id, type)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .single();

    if (!parentMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const org = parentMembership.organization as unknown as { id: string; type: string };
    if (org.type !== "family") {
      return NextResponse.json({ error: "Not a Mifa plan" }, { status: 400 });
    }

    // Verify the child belongs to this family org
    const adminClient = createAdminClient();
    const { data: childMembership } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", parentMembership.organization_id)
      .eq("user_id", childUserId)
      .eq("status", "active")
      .single();

    if (!childMembership) {
      return NextResponse.json({ error: "Child not in family" }, { status: 403 });
    }

    // Get child's auth info
    const { data: childUser, error: userError } = await adminClient.auth.admin.getUserById(childUserId);
    if (userError || !childUser?.user?.email) {
      return NextResponse.json({ error: "Could not find child account" }, { status: 404 });
    }

    // Generate new password and update via admin API
    const newPassword = generatePassword();
    const { error: updateError } = await adminClient.auth.admin.updateUserById(childUserId, {
      password: newPassword,
    });

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }

    // Extract username from email (remove @mifa.iaiaz.com)
    const username = childUser.user.email.replace(/@mifa\.iaiaz\.com$/, "");

    return NextResponse.json({
      success: true,
      username,
      password: newPassword,
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
