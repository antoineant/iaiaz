import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  if (body.account_type && !["personal", "trainer", "admin"].includes(body.account_type)) {
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
