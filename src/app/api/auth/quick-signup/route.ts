import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  try {
    const body: QuickSignupRequest = await request.json();
    const { firstName, lastName, email, classToken } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !classToken) {
      return NextResponse.json(
        { error: "All fields are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();
    const displayName = `${firstName} ${lastName}`.trim();

    // First verify the class token is valid
    const { data: classInfo, error: classError } = await adminClient.rpc(
      "get_class_by_token",
      { p_token: classToken }
    );

    if (classError || !classInfo?.success) {
      return NextResponse.json(
        { error: "Invalid class token", code: "INVALID_TOKEN" },
        { status: 400 }
      );
    }

    if (!classInfo.is_accessible) {
      return NextResponse.json(
        { error: "Class is not accessible", code: classInfo.access_message },
        { status: 400 }
      );
    }

    // Generate a random password (user won't need it - they can reset later if needed)
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists - just use their ID
      userId = existingUser.id;

      // Update their display name if not set
      if (!existingUser.user_metadata?.display_name) {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingUser.user_metadata,
            display_name: displayName,
          },
        });
      }
    } else {
      // Create new user without email confirmation
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

      if (authError) {
        console.error("Error creating user:", authError);

        if (authError.message.includes("already registered")) {
          return NextResponse.json(
            { error: "Email already registered", code: "EMAIL_EXISTS" },
            { status: 400 }
          );
        }

        return NextResponse.json(
          { error: "Failed to create account", code: "AUTH_ERROR" },
          { status: 500 }
        );
      }

      userId = authData.user!.id;
    }

    // Join the class using the RPC function
    const { data: joinResult, error: joinError } = await adminClient.rpc(
      "join_class",
      {
        p_token: classToken,
        p_user_id: userId,
        p_display_name: displayName,
      }
    );

    if (joinError) {
      console.error("Error joining class:", joinError);
      return NextResponse.json(
        { error: "Failed to join class", code: "JOIN_ERROR" },
        { status: 500 }
      );
    }

    if (!joinResult?.success) {
      return NextResponse.json(
        { error: joinResult?.error || "Failed to join class", code: joinResult?.error },
        { status: 400 }
      );
    }

    // Generate a magic link to sign the user in automatically
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${request.nextUrl.origin}/chat`,
        },
      });

    if (linkError) {
      console.error("Error generating sign-in link:", linkError);
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

    // Return the magic link token for client-side sign-in
    // The hashed_token from generateLink can be used with verifyOtp
    return NextResponse.json({
      success: true,
      userId,
      memberId: joinResult.member_id,
      creditAllocated: joinResult.credit_allocated,
      // Return the token hash for client-side verification
      tokenHash: linkData.properties?.hashed_token,
      email,
    });
  } catch (error) {
    console.error("Quick signup error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
