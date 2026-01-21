import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, avatar_url, account_type, is_admin, credits_balance, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH - Update user profile (account_type, credits, etc.)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Get current admin user to prevent self-demotion
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (currentUser?.id === id && body.account_type && body.account_type !== "admin") {
    return NextResponse.json(
      { error: "Cannot change your own admin status" },
      { status: 400 }
    );
  }

  // Validate account_type if provided
  if (body.account_type && !["student", "trainer", "admin"].includes(body.account_type)) {
    return NextResponse.json(
      { error: "Invalid account type" },
      { status: 400 }
    );
  }

  // Build update object - only include allowed fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.account_type !== undefined) {
    updateData.account_type = body.account_type;
    // Sync is_admin flag for backwards compatibility
    updateData.is_admin = body.account_type === "admin";
  }

  if (body.display_name !== undefined) {
    updateData.display_name = body.display_name;
  }

  if (body.credits_balance !== undefined && typeof body.credits_balance === "number") {
    updateData.credits_balance = body.credits_balance;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE - Delete user and all related data
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get current admin user to prevent self-deletion
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (currentUser?.id === id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  // Check if user exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    // 1. Delete user's files from storage buckets
    const buckets = ["chat-attachments", "avatars"];

    for (const bucket of buckets) {
      const { data: files } = await adminClient.storage
        .from(bucket)
        .list(id);

      if (files && files.length > 0) {
        const filePaths = files.map(f => `${id}/${f.name}`);
        await adminClient.storage.from(bucket).remove(filePaths);
      }
    }

    // 2. Delete organization-related data that might not cascade
    // Delete organization transactions for this user
    await adminClient
      .from("organization_transactions")
      .delete()
      .eq("user_id", id);

    // Delete organization memberships (will cascade to transactions via member_id)
    await adminClient
      .from("organization_members")
      .delete()
      .eq("user_id", id);

    // 3. Delete from auth.users - this cascades to profiles and all related tables
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Error deleting auth user:", authError);
      return NextResponse.json(
        { error: "Failed to delete user from auth system" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${profile.email} and all related data deleted`
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
