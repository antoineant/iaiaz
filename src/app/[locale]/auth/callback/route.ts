import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_description = searchParams.get("error_description");

  console.log("[auth/callback] Starting callback", {
    hasCode: !!code,
    error_description,
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
        .select("id, account_type, terms_accepted_at")
        .eq("id", data.user.id)
        .single();

      console.log("[auth/callback] Profile lookup:", {
        hasProfile: !!profile,
        termsAccepted: !!profile?.terms_accepted_at,
        currentAccountType: profile?.account_type,
        error: profileError?.message,
      });

      // Transfer intent from user_metadata to cookie (email signup flow)
      // GoogleButton already sets the cookie for OAuth flows; this handles email confirmation flows
      // Also read ?next= param as fallback (in case cookie was lost)
      let intentToStore: string | null = null;
      if (data.user.user_metadata?.redirect_after_confirm) {
        intentToStore = data.user.user_metadata.redirect_after_confirm;
        console.log("[auth/callback] Transferring redirect from user_metadata to cookie:", intentToStore);

        await adminClient.auth.admin.updateUserById(data.user.id, {
          user_metadata: { redirect_after_confirm: null },
        });
      } else if (searchParams.get("next")) {
        intentToStore = searchParams.get("next");
        console.log("[auth/callback] Using ?next= param as intent fallback:", intentToStore);
      }

      // Helper to set intent cookie on response
      const setIntentCookie = (resp: NextResponse) => {
        if (intentToStore) {
          resp.cookies.set("auth_redirect_after", encodeURIComponent(intentToStore), {
            path: "/",
            maxAge: 600,
            sameSite: "lax",
          });
        }
      };

      // If terms not accepted, redirect to accept-terms → choose-workspace
      if (!profile?.terms_accepted_at) {
        const resp = NextResponse.redirect(
          `${origin}/auth/accept-terms?redirect=/auth/choose-workspace`
        );
        setIntentCookie(resp);
        return resp;
      }

      // Terms already accepted — go to workspace chooser
      const resp = NextResponse.redirect(`${origin}/auth/choose-workspace`);
      setIntentCookie(resp);
      return resp;
    }

    console.error("[auth/callback] Failed to exchange code:", error?.message);
  }

  // Return to login page with error
  console.log("[auth/callback] Redirecting to login with error");
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
