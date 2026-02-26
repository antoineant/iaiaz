/**
 * Server-side Cloudflare Turnstile token verification.
 * Gracefully skips when TURNSTILE_SECRET_KEY is not set (dev environment).
 */
export async function verifyTurnstileToken(token: string | undefined): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Graceful skip in dev / when not configured
  if (!secret) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "CAPTCHA verification required" };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const data = await res.json();
    if (data.success) {
      return { success: true };
    }
    return { success: false, error: "CAPTCHA verification failed" };
  } catch (err) {
    console.error("[turnstile] Verification error:", err);
    // Fail open — don't block signups if Cloudflare is unreachable
    return { success: true };
  }
}
