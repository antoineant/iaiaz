import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_description = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/chat";

  console.log("[auth/callback] Starting callback", {
    hasCode: !!code,
    error_description,
    next,
    origin,
  });

  // Handle OAuth errors from provider
  if (error_description) {
    console.error("[auth/callback] OAuth error:", error_description);
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error_description)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] Exchange result:", {
      success: !error,
      hasUser: !!data?.user,
      error: error?.message,
    });

    if (!error && data.user) {
      // Check if user has already accepted terms
      // Use admin client to bypass RLS (session cookies may not be set yet)
      const adminClient = createAdminClient();
      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", data.user.id)
        .single();

      console.log("[auth/callback] Profile lookup:", {
        hasProfile: !!profile,
        termsAccepted: !!profile?.terms_accepted_at,
        error: profileError?.message,
      });

      // If terms not accepted, redirect to accept-terms page
      if (!profile?.terms_accepted_at) {
        return NextResponse.redirect(`${origin}/auth/accept-terms`);
      }

      // Terms already accepted, proceed to destination
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] Failed to exchange code:", error?.message);
  }

  // Return to login page with error
  console.log("[auth/callback] Redirecting to login with error");
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
