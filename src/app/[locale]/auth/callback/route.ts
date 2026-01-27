import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error_description = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/chat";
  const accountType = searchParams.get("account_type"); // For Google OAuth signup

  console.log("[auth/callback] Starting callback", {
    hasCode: !!code,
    error_description,
    next,
    origin,
    accountType,
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
        requestedAccountType: accountType,
        error: profileError?.message,
      });

      // If user signed up via Google with a specific account type (trainer/school/business),
      // update their profile since the DB trigger defaults to 'student'
      if (
        accountType &&
        ["trainer", "school", "business"].includes(accountType) &&
        profile &&
        profile.account_type === "student"
      ) {
        console.log("[auth/callback] Upgrading account type from student to:", accountType);

        // Update profile account type
        const { error: updateError } = await adminClient
          .from("profiles")
          .update({ account_type: accountType })
          .eq("id", data.user.id);

        if (updateError) {
          console.error("[auth/callback] Failed to update account type:", updateError);
        } else {
          // Create organization for trainer/school/business (mimics DB trigger behavior)
          // Organization types: individual (trainer), training_center (school), business
          let orgType: string;
          let initialCredits: number;

          if (accountType === "school") {
            orgType = "training_center";
            initialCredits = 10; // Schools get 10€
          } else if (accountType === "business") {
            orgType = "business";
            initialCredits = 10; // Businesses get 10€
          } else {
            orgType = "individual";
            initialCredits = 5; // Trainers get 5€
          }

          const { data: newOrg, error: orgError } = await adminClient
            .from("organizations")
            .insert({
              name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Mon organisation",
              type: orgType,
              owner_id: data.user.id,
              credit_balance: initialCredits,
            })
            .select("id")
            .single();

          if (orgError) {
            console.error("[auth/callback] Failed to create organization:", orgError);
          } else if (newOrg) {
            // Add user as owner of the organization
            const { error: memberError } = await adminClient
              .from("organization_members")
              .insert({
                organization_id: newOrg.id,
                user_id: data.user.id,
                role: "owner",
                display_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0],
              });

            if (memberError) {
              console.error("[auth/callback] Failed to add owner to organization:", memberError);
            } else {
              console.log("[auth/callback] Created organization and added owner:", newOrg.id);
            }
          }
        }
      }

      // Determine final redirect: URL param > user_metadata > default
      let finalRedirect = next;
      if (next === "/chat" && data.user.user_metadata?.redirect_after_confirm) {
        finalRedirect = data.user.user_metadata.redirect_after_confirm;
        console.log("[auth/callback] Using redirect from user_metadata:", finalRedirect);

        // Clear the redirect from metadata (one-time use)
        await adminClient.auth.admin.updateUserById(data.user.id, {
          user_metadata: { redirect_after_confirm: null },
        });
      }

      // If terms not accepted, redirect to accept-terms page (with final redirect stored)
      if (!profile?.terms_accepted_at) {
        // Pass the final redirect to accept-terms so it can redirect after
        const acceptTermsUrl = finalRedirect !== "/chat"
          ? `${origin}/auth/accept-terms?redirect=${encodeURIComponent(finalRedirect)}`
          : `${origin}/auth/accept-terms`;
        return NextResponse.redirect(acceptTermsUrl);
      }

      // Terms already accepted, proceed to destination
      return NextResponse.redirect(`${origin}${finalRedirect}`);
    }

    console.error("[auth/callback] Failed to exchange code:", error?.message);
  }

  // Return to login page with error
  console.log("[auth/callback] Redirecting to login with error");
  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
