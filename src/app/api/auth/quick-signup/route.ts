import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidDisplayName } from "@/lib/signup-validation";

interface QuickSignupRequest {
  firstName: string;
  lastName: string;
  email: string;
  classToken: string;
}

/**
 * Quick signup for class join - creates user without email verification
 * This is designed for classroom scenarios where students need instant access
 */
export async function POST(request: NextRequest) {
  console.log("[quick-signup] Starting request");

  try {
    const body: QuickSignupRequest = await request.json();
    const { firstName, lastName, email, classToken } = body;

    console.log("[quick-signup] Received:", { firstName, lastName, email: email?.substring(0, 5) + "...", classToken: classToken?.substring(0, 8) + "..." });

    // Validate required fields
    if (!firstName || !lastName || !email || !classToken) {
      console.log("[quick-signup] Missing fields");
      return NextResponse.json(
        { error: "All fields are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Validate display name parts
    if (!isValidDisplayName(firstName) || !isValidDisplayName(lastName)) {
      console.log("[quick-signup] Invalid display name");
      return NextResponse.json(
        { error: "Please enter a valid name", code: "INVALID_DISPLAY_NAME" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("[quick-signup] Invalid email format");
      return NextResponse.json(
        { error: "Invalid email format", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    console.log("[quick-signup] Creating admin client");
    const adminClient = createAdminClient();
    const displayName = `${firstName} ${lastName}`.trim();

    // First verify the class token is valid
    console.log("[quick-signup] Verifying class token");
    const { data: classInfo, error: classError } = await adminClient.rpc(
      "get_class_by_token",
      { p_token: classToken }
    );

    if (classError) {
      console.error("[quick-signup] Error fetching class:", classError);
      return NextResponse.json(
        { error: "Failed to verify class", code: "CLASS_ERROR" },
        { status: 500 }
      );
    }

    console.log("[quick-signup] Class info:", classInfo);

    if (!classInfo?.success) {
      console.log("[quick-signup] Class not found or invalid");
      return NextResponse.json(
        { error: "Invalid class token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    if (!classInfo.is_accessible) {
      console.log("[quick-signup] Class not accessible:", classInfo.access_message);
      return NextResponse.json(
        { error: "Class is not accessible", code: classInfo.access_message },
        { status: 400 }
      );
    }

    // Generate a random password (user won't need it - they can reset later if needed)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    // Try to create user - if they already exist, we'll get an error
    console.log("[quick-signup] Creating user");
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true, // Auto-confirm email for class join
        user_metadata: {
          display_name: displayName,
          first_name: firstName,
          last_name: lastName,
          account_type: "student",
          quick_signup: true,
          class_token: classToken,
        },
      });

    console.log("[quick-signup] Create user result:", { authData: !!authData, authError });

    let userId: string;

    if (authError) {
      console.log("[quick-signup] Auth error:", authError.message);
      // Check if user already exists
      if (authError.message.includes("already") || authError.message.includes("exists")) {
        console.log("[quick-signup] User already exists, looking up profile");
        // User exists - get their ID from profiles table
        const { data: existingProfile, error: profileError } = await adminClient
          .from("profiles")
          .select("id")
          .eq("email", email.toLowerCase())
          .single();

        console.log("[quick-signup] Profile lookup result:", { existingProfile, profileError });

        if (profileError || !existingProfile) {
          console.error("[quick-signup] Error finding existing user:", profileError);
          return NextResponse.json(
            { error: "Email already registered. Please log in.", code: "EMAIL_EXISTS" },
            { status: 400 }
          );
        }

        userId = existingProfile.id;
      } else {
        console.error("[quick-signup] Error creating user:", authError);
        return NextResponse.json(
          { error: "Failed to create account", code: "AUTH_ERROR" },
          { status: 500 }
        );
      }
    } else {
      userId = authData.user!.id;
      console.log("[quick-signup] User created with ID:", userId);
    }

    // Join the class using the RPC function
    console.log("[quick-signup] Joining class");
    const { data: joinResult, error: joinError } = await adminClient.rpc(
      "join_class",
      {
        p_token: classToken,
        p_user_id: userId,
        p_display_name: displayName,
      }
    );

    console.log("[quick-signup] Join result:", { joinResult, joinError });

    if (joinError) {
      console.error("[quick-signup] Error joining class:", joinError);
      return NextResponse.json(
        { error: "Failed to join class", code: "JOIN_ERROR" },
        { status: 500 }
      );
    }

    if (!joinResult?.success) {
      console.log("[quick-signup] Join failed:", joinResult?.error);
      return NextResponse.json(
        { error: joinResult?.error || "Failed to join class", code: joinResult?.error },
        { status: 400 }
      );
    }

    // Generate a magic link to sign the user in automatically
    console.log("[quick-signup] Generating magic link");
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${request.nextUrl.origin}/chat`,
        },
      });

    console.log("[quick-signup] Magic link result:", { linkData: !!linkData, linkError });

    if (linkError) {
      console.error("[quick-signup] Error generating sign-in link:", linkError);
      // User was created and joined, but we couldn't auto-sign them in
      // They can use password reset to get access
      return NextResponse.json({
        success: true,
        userId,
        memberId: joinResult.member_id,
        needsManualLogin: true,
        message: "Account created. Please use password reset to sign in.",
      });
    }

    console.log("[quick-signup] Success!");
    // Return the magic link token for client-side sign-in
    return NextResponse.json({
      success: true,
      userId,
      memberId: joinResult.member_id,
      creditAllocated: joinResult.credit_allocated,
      tokenHash: linkData.properties?.hashed_token,
      email,
    });
  } catch (error) {
    console.error("[quick-signup] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
