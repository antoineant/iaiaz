"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Mail, RefreshCw, Clock, Building2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BusinessSignupPage() {
  const t = useTranslations("auth.signup");
  const tBusiness = useTranslations("auth.signupBusiness");

  const [companyName, setCompanyName] = useState("");
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
        setResendCooldown(60);
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accountType: "business",
          displayName: companyName.trim() || undefined,
          marketingConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
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

              <div className="bg-[var(--muted)] rounded-lg px-4 py-2 mb-4 inline-block">
                <span className="font-medium">{email}</span>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] mb-4">
                <Clock className="w-4 h-4" />
                <span>{t("success.deliveryTime")}</span>
              </div>

              <p className="text-sm text-[var(--muted-foreground)] mb-6">
                {t("success.hint")}
              </p>

              {resendSuccess && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm mb-4">
                  {t("success.resendSuccess")}
                </div>
              )}

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
          <NextLink href="/business" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz <span className="text-lg font-normal text-[var(--muted-foreground)]">Business</span>
          </NextLink>
          <p className="text-[var(--muted-foreground)] mt-2">
            {tBusiness("subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{tBusiness("title")}</h1>
                <p className="text-sm text-[var(--muted-foreground)]">{tBusiness("trialNote")}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <GoogleButton mode="signup" />

            <Divider />

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                id="companyName"
                type="text"
                label={tBusiness("companyName")}
                placeholder={tBusiness("companyNamePlaceholder")}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoComplete="organization"
              />

              <Input
                id="email"
                type="email"
                label={tBusiness("email")}
                placeholder={tBusiness("emailPlaceholder")}
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

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                {tBusiness("submit")}
              </Button>

              {/* Benefits */}
              <div className="pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-2">{tBusiness("includes")}</p>
                <ul className="space-y-1">
                  <li className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="w-3 h-3 text-green-500" />
                    {tBusiness("benefit1")}
                  </li>
                  <li className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="w-3 h-3 text-green-500" />
                    {tBusiness("benefit2")}
                  </li>
                  <li className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <Check className="w-3 h-3 text-green-500" />
                    {tBusiness("benefit3")}
                  </li>
                </ul>
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              {t("hasAccount")}{" "}
              <Link
                href="/auth/login"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                {t("login")}
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
          {tBusiness("notBusiness")}{" "}
          <Link href="/auth/signup" className="text-primary-600 dark:text-primary-400 hover:underline">
            {tBusiness("personalSignup")}
          </Link>
        </p>
      </div>
    </div>
  );
}
