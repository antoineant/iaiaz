import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (classError) {
      console.error("Error fetching class:", classError);
      return NextResponse.json(
        { error: "Failed to verify class", code: "CLASS_ERROR" },
        { status: 500 }
      );
    }

    if (!classInfo?.success) {
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

    // Try to create user - if they already exist, we'll get an error
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

    let userId: string;

    if (authError) {
      // Check if user already exists
      if (authError.message.includes("already") || authError.message.includes("exists")) {
        // User exists - get their ID by email
        const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers({
          filter: `email.eq.${email}`,
          page: 1,
          perPage: 1,
        });

        if (listError || !existingUsers?.users?.length) {
          console.error("Error finding existing user:", listError);
          return NextResponse.json(
            { error: "Email already registered. Please log in.", code: "EMAIL_EXISTS" },
            { status: 400 }
          );
        }

        userId = existingUsers.users[0].id;
      } else {
        console.error("Error creating user:", authError);
        return NextResponse.json(
          { error: "Failed to create account", code: "AUTH_ERROR" },
          { status: 500 }
        );
      }
    } else {
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
    return NextResponse.json({
      success: true,
      userId,
      memberId: joinResult.member_id,
      creditAllocated: joinResult.credit_allocated,
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
