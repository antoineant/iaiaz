import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const termsAccepted = searchParams.get("terms_accepted") === "true";
  const next = searchParams.get("next") ?? "/chat";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // If terms were accepted during signup (checkbox was checked)
      if (termsAccepted) {
        // Use admin client to update terms acceptance
        const adminClient = createAdminClient();
        await adminClient
          .from("profiles")
          .update({ terms_accepted_at: new Date().toISOString() })
          .eq("id", data.user.id);

        return NextResponse.redirect(`${origin}${next}`);
      }

      // Check if user has already accepted terms
      const { data: profile } = await supabase
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
