"use client";

import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Check, User, GraduationCap, Building2, Mail, RefreshCw, Clock, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AccountType = "student" | "trainer" | "school";

function SignupForm() {
  const t = useTranslations("auth.signup");
  const searchParams = useSearchParams();

  // Read initial account type and redirect from URL params
  const initialType = searchParams.get("type") as AccountType | null;
  const redirectUrl = searchParams.get("redirect");
  const paramBirthdate = searchParams.get("birthdate");
  const paramSchoolYear = searchParams.get("schoolYear");

  // Detect mifa child mode: redirect points to a mifa join page
  const isMifaChild = redirectUrl?.startsWith("/mifa/join/") ?? false;

  const [accountType, setAccountType] = useState<AccountType>(
    isMifaChild
      ? "student"
      : initialType && ["student", "trainer", "school"].includes(initialType)
        ? initialType
        : "student"
  );
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

    setIsLoading(true);

    try {
      // Build the redirect URL, including birthdate/schoolYear for mifa children
      let finalRedirectUrl = redirectUrl || undefined;
      if (isMifaChild && redirectUrl) {
        const joinParams = new URLSearchParams();
        if (paramBirthdate) joinParams.set("birthdate", paramBirthdate);
        if (paramSchoolYear) joinParams.set("schoolYear", paramSchoolYear);
        const qs = joinParams.toString();
        finalRedirectUrl = qs ? `${redirectUrl}?${qs}` : redirectUrl;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accountType: isMifaChild ? "student" : accountType,
          displayName: displayName.trim() || undefined,
          marketingConsent: isMifaChild ? false : marketingConsent,
          redirectUrl: finalRedirectUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes with translations
        if (data.code === "DISPOSABLE_EMAIL") {
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
            <h1 className="text-3xl font-extrabold">
              <span className="text-[var(--foreground)]">m</span><span className="text-primary-600">i</span><span className="text-[var(--foreground)]">f</span><span className="text-accent-600">a</span>
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
                <GoogleButton mode="signup" accountType={accountType} />
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

              {/* Account Type Selection - hidden for mifa children */}
              {!isMifaChild && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("accountType.label")}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType("student")}
                      className={`relative p-3 rounded-lg border-2 transition-all text-center ${
                        accountType === "student"
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        accountType === "student"
                          ? "bg-primary-600 text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-sm">{t("accountType.student")}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                        {t("accountType.studentDesc")}
                      </p>
                      {accountType === "student" && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary-600" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("trainer")}
                      className={`relative p-3 rounded-lg border-2 transition-all text-center ${
                        accountType === "trainer"
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        accountType === "trainer"
                          ? "bg-primary-600 text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-sm">{t("accountType.trainer")}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                        {t("accountType.trainerDesc")}
                      </p>
                      {accountType === "trainer" && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary-600" />
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setAccountType("school")}
                      className={`relative p-3 rounded-lg border-2 transition-all text-center ${
                        accountType === "school"
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                        accountType === "school"
                          ? "bg-primary-600 text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <p className="font-medium text-sm">{t("accountType.school")}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">
                        {t("accountType.schoolDesc")}
                      </p>
                      {accountType === "school" && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary-600" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Display Name (optional but encouraged for trainers) */}
              <Input
                id="displayName"
                type="text"
                label={t("displayName")}
                placeholder={t("displayNamePlaceholder")}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
              />

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

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
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
