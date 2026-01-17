import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has already accepted terms
      // Use admin client to bypass RLS (session cookies may not be set yet)
      const adminClient = createAdminClient();
      const { data: profile } = await adminClient
        .from("profiles")
        .select("terms_accepted_at")
        .eq("id", data.user.id)
        .single();

      // If terms not accepted, redirect to accept-terms page
      if (!profile?.terms_accepted_at) {
        return NextResponse.redirect(`${origin}/auth/accept-terms`);
      }

      // Terms already accepted, proceed to destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
