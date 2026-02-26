"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Mail, RefreshCw, Clock, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidDisplayName } from "@/lib/signup-validation";
import { Turnstile } from "react-turnstile";

function SignupForm() {
  const t = useTranslations("auth.signup");
  const searchParams = useSearchParams();

  // Read redirect and intent from URL params
  const redirectUrl = searchParams.get("redirect");
  const intent = searchParams.get("intent");
  // Backward compat: ?type=trainer → intent=teach, ?type=school → intent=school
  const legacyType = searchParams.get("type");
  const paramBirthdate = searchParams.get("birthdate");
  const paramSchoolYear = searchParams.get("schoolYear");

  // Detect mifa child mode: redirect points to a mifa join page
  const isMifaChild = redirectUrl?.startsWith("/mifa/join/") ?? false;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [displayNameError, setDisplayNameError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("Resend error:", error);
      } else {
        setResendSuccess(true);
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (err) {
      console.error("Resend error:", err);
    } finally {
      setIsResending(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    if (displayName.trim() && !isValidDisplayName(displayName.trim())) {
      setError(t("errors.invalidDisplayName"));
      return;
    }

    setIsLoading(true);

    try {
      // Build the redirect URL
      let finalRedirectUrl: string | undefined;
      if (isMifaChild && redirectUrl) {
        // For mifa children, preserve birthdate/schoolYear in the join URL
        const joinParams = new URLSearchParams();
        if (paramBirthdate) joinParams.set("birthdate", paramBirthdate);
        if (paramSchoolYear) joinParams.set("schoolYear", paramSchoolYear);
        const qs = joinParams.toString();
        finalRedirectUrl = qs ? `${redirectUrl}?${qs}` : redirectUrl;
      } else if (redirectUrl) {
        finalRedirectUrl = redirectUrl;
      } else {
        // Resolve intent (from ?intent= or legacy ?type=)
        const resolvedIntent = intent || (legacyType === "trainer" ? "teach" : legacyType) || undefined;
        if (resolvedIntent) {
          finalRedirectUrl = `/auth/choose-service?intent=${resolvedIntent}`;
        } else {
          finalRedirectUrl = "/auth/choose-service";
        }
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accountType: "student",
          displayName: displayName.trim() || undefined,
          marketingConsent: isMifaChild ? false : marketingConsent,
          redirectUrl: finalRedirectUrl,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes with translations
        if (data.code === "CAPTCHA_FAILED") {
          setError(data.error || t("errors.generic"));
          setTurnstileToken(null); // Reset so widget re-renders
        } else if (data.code === "INVALID_DISPLAY_NAME") {
          setError(t("errors.invalidDisplayName"));
        } else if (data.code === "DISPOSABLE_EMAIL") {
          setError(t("errors.disposableEmail"));
        } else if (data.code === "RATE_LIMITED") {
          setError(t("errors.tooManyAttempts"));
        } else if (data.code === "EMAIL_EXISTS") {
          setError(t("errors.emailInUse"));
        } else {
          setError(data.error || t("errors.generic"));
        }
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">{t("success.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-2">
                {t("success.description", { email })}
              </p>

              {/* Email display */}
              <div className="bg-[var(--muted)] rounded-lg px-4 py-2 mb-4 inline-block">
                <span className="font-medium">{email}</span>
              </div>

              {/* Delivery time notice */}
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] mb-4">
                <Clock className="w-4 h-4" />
                <span>{t("success.deliveryTime")}</span>
              </div>

              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                {t("success.hint")}
              </p>

              {/* Resend success message */}
              {resendSuccess && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm mb-4">
                  {t("success.resendSuccess")}
                </div>
              )}

              {/* Resend button */}
              <div className="space-y-3">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0 || isResending}
                  className="w-full"
                >
                  {isResending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {resendCooldown > 0
                    ? t("success.resendCooldown", { seconds: resendCooldown })
                    : t("success.resendButton")
                  }
                </Button>

                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full">
                    {t("success.backToLogin")}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {isMifaChild ? (
            <h1 className="text-4xl font-extrabold">
              <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">m&#299;f&#257;</span>
              <span className="text-[var(--muted-foreground)] font-medium text-lg ml-2">by iaiaz</span>
            </h1>
          ) : (
            <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              iaiaz
            </Link>
          )}
          <p className="text-[var(--muted-foreground)] mt-2">
            {isMifaChild ? t("mifaChild.subtitle") : t("subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </CardHeader>
          <CardContent>
            {!isMifaChild && (
              <>
                <GoogleButton mode="signup" intent={intent || (legacyType === "trainer" ? "teach" : legacyType) || undefined} />
                <Divider />
              </>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Parental consent note for mifa children */}
              {isMifaChild && (
                <div className="flex gap-3 p-4 bg-accent-50 dark:bg-accent-950/30 rounded-lg border border-accent-200 dark:border-accent-800">
                  <Heart className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-accent-700 dark:text-accent-300">
                    {t("mifaChild.parentalNote")}
                  </p>
                </div>
              )}

              {/* Display Name */}
              <div>
                <Input
                  id="displayName"
                  type="text"
                  label={t("displayName")}
                  placeholder={t("displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (displayNameError) setDisplayNameError("");
                  }}
                  onBlur={() => {
                    if (displayName.trim() && !isValidDisplayName(displayName.trim())) {
                      setDisplayNameError(t("errors.invalidDisplayName"));
                    } else {
                      setDisplayNameError("");
                    }
                  }}
                  autoComplete="name"
                />
                {displayNameError && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{displayNameError}</p>
                )}
              </div>

              <Input
                id="email"
                type="email"
                label={t("email")}
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                id="password"
                type="password"
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                type="password"
                label={t("confirmPassword")}
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              {/* Marketing consent checkbox - hidden for mifa children (minors) */}
              {!isMifaChild && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-[var(--border)] text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                  <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                    {t("marketingConsent")}
                  </span>
                </label>
              )}

              {turnstileSiteKey && (
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading || (!!turnstileSiteKey && !turnstileToken)}
              >
                {t("submit")}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              {t("hasAccount")}{" "}
              <NextLink
                href={redirectUrl ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}` : "/auth/login"}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                {t("login")}
              </NextLink>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
