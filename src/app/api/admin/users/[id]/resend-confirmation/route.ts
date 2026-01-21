import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

type RouteParams = { params: Promise<{ id: string }> };

// POST - Resend confirmation email to user
export async function POST(_request: Request, { params }: RouteParams) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminClient = createAdminClient();

  try {
    // Get user email from profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already confirmed
    const { data: authUser } = await adminClient.auth.admin.getUserById(id);

    if (authUser?.user?.email_confirmed_at) {
      return NextResponse.json({ error: "Email already confirmed" }, { status: 400 });
    }

    // Generate a new confirmation link and send email
    const { error: resendError } = await adminClient.auth.resend({
      type: "signup",
      email: profile.email,
    });

    if (resendError) {
      console.error("Resend confirmation error:", resendError);
      return NextResponse.json({ error: resendError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Confirmation email sent" });
  } catch (error) {
    console.error("Resend confirmation error:", error);
    return NextResponse.json({ error: "Failed to resend confirmation email" }, { status: 500 });
  }
}
