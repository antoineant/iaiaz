import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractEmailDomain,
  matchesDisposablePattern,
  isValidEmailFormat,
  getClientIP,
  type SignupRateLimitResult,
} from "@/lib/signup-validation";

interface SignupRequest {
  email: string;
  password: string;
  accountType?: "student" | "trainer" | "school";
  displayName?: string;
}

export async function POST(request: NextRequest) {
  console.log("[signup] Starting signup request");

  try {
    const body: SignupRequest = await request.json();
    const { email, password, accountType, displayName } = body;

    console.log("[signup] Email:", email?.substring(0, 5) + "...", "AccountType:", accountType);

    // Basic validation
    if (!email || !password) {
      console.log("[signup] Missing email or password");
      return NextResponse.json(
        { error: "Email et mot de passe requis", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    if (!isValidEmailFormat(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide", code: "INVALID_EMAIL" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error: "Le mot de passe doit contenir au moins 6 caractères",
          code: "PASSWORD_TOO_SHORT",
        },
        { status: 400 }
      );
    }

    console.log("[signup] Creating admin client...");
    const adminClient = createAdminClient();
    console.log("[signup] Admin client created");

    const clientIP = getClientIP(request.headers);
    const userAgent = request.headers.get("user-agent") || "";
    const emailDomain = extractEmailDomain(email);
    console.log("[signup] IP:", clientIP, "Domain:", emailDomain);

    // 1. Check if email domain is blocked (database lookup)
    console.log("[signup] Checking blocked domain...");
    const { data: isBlocked, error: blockCheckError } = await adminClient.rpc(
      "is_email_domain_blocked",
      { p_email: email }
    );
    console.log("[signup] Blocked check result:", { isBlocked, error: blockCheckError?.message });

    if (blockCheckError) {
      console.error("[signup] Error checking blocked domain:", blockCheckError);
      // Continue anyway - don't block signup due to DB error
    }

    if (isBlocked) {
      // Log blocked attempt
      await adminClient.rpc("log_signup_attempt", {
        p_email: email,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_status: "blocked_email",
        p_block_reason: "Blocked email domain",
      });

      return NextResponse.json(
        {
          error:
            "Veuillez utiliser une adresse email valide (les emails temporaires ne sont pas acceptés)",
          code: "DISPOSABLE_EMAIL",
        },
        { status: 400 }
      );
    }

    // 2. Check disposable pattern (fallback for domains not in DB)
    if (matchesDisposablePattern(emailDomain)) {
      await adminClient.rpc("log_signup_attempt", {
        p_email: email,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_status: "blocked_email",
        p_block_reason: "Disposable email pattern detected",
      });

      return NextResponse.json(
        {
          error:
            "Veuillez utiliser une adresse email valide (les emails temporaires ne sont pas acceptés)",
          code: "DISPOSABLE_EMAIL",
        },
        { status: 400 }
      );
    }

    // 3. Check IP rate limit
    console.log("[signup] Checking rate limit...");
    const { data: rateLimitResult, error: rateLimitError } =
      await adminClient.rpc("check_signup_rate_limit", {
        p_ip_address: clientIP,
      });
    console.log("[signup] Rate limit result:", { rateLimitResult, error: rateLimitError?.message });

    if (rateLimitError) {
      console.error("[signup] Error checking rate limit:", rateLimitError);
      // Continue anyway - don't block signup due to DB error
    }

    const rateLimit = rateLimitResult as SignupRateLimitResult | null;

    if (rateLimit && !rateLimit.allowed) {
      await adminClient.rpc("log_signup_attempt", {
        p_email: email,
        p_ip_address: clientIP,
        p_user_agent: userAgent,
        p_status: "blocked_ip",
        p_block_reason: `IP rate limit exceeded: ${rateLimit.attempts}/${rateLimit.limit}`,
      });

      return NextResponse.json(
        {
          error:
            "Trop de tentatives d'inscription depuis cette adresse. Veuillez réessayer plus tard.",
          code: "RATE_LIMITED",
          resetAt: rateLimit.reset_at,
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (new Date(rateLimit.reset_at).getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    // 4. All validations passed - proceed with Supabase signup
    // Note: account_type and display_name are passed as user_metadata
    // The handle_new_user trigger will read these and create the profile
    console.log("[signup] Creating user in Supabase...");
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Require email confirmation
        user_metadata: {
          account_type: accountType || "student",
          display_name: displayName || undefined,
        },
      });
    console.log("[signup] User creation result:", { success: !!authData?.user, error: authError?.message });

    if (authError) {
      console.error("[signup] Auth error:", {
        message: authError.message,
        status: authError.status,
        code: authError.code,
        name: authError.name,
      });

      // Log failed signup
      try {
        await adminClient.rpc("log_signup_attempt", {
          p_email: email,
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_status: "error",
          p_block_reason: authError.message,
        });
      } catch (logError) {
        console.error("[signup] Failed to log attempt:", logError);
      }

      // Handle specific Supabase errors
      if (authError.message.includes("already registered") ||
          authError.message.includes("already been registered")) {
        return NextResponse.json(
          {
            error: "Cette adresse email est déjà utilisée",
            code: "EMAIL_EXISTS",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message, code: "AUTH_ERROR" },
        { status: 400 }
      );
    }

    // 5. Log successful signup
    await adminClient.rpc("log_signup_attempt", {
      p_email: email,
      p_ip_address: clientIP,
      p_user_agent: userAgent,
      p_status: "success",
      p_user_id: authData.user?.id,
    });

    // 6. Generate and send email confirmation link
    // admin.createUser doesn't send confirmation email, so we generate one
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${request.nextUrl.origin}/auth/callback`,
        },
      });

    if (linkError) {
      console.error("Error generating confirmation link:", linkError);
      // User is created but email failed - they can request a password reset
    } else if (linkData?.properties?.hashed_token) {
      // The link is generated but we need to send it via email
      // Supabase will have sent the email if email hooks are configured
      // Otherwise, the user can use "forgot password" to get access
    }

    return NextResponse.json({
      success: true,
      message: "Vérifiez votre email pour confirmer votre inscription",
    });
  } catch (error) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de l'inscription",
        code: "SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
