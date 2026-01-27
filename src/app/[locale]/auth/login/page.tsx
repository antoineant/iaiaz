"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Loader2, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/chat";
  const t = useTranslations("auth.login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailNotConfirmed(false);
    setResendSuccess(false);
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if error is about email not being confirmed
      const isEmailNotConfirmed =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email is not confirmed");

      setEmailNotConfirmed(isEmailNotConfirmed);
      setError(
        error.message === "Invalid login credentials"
          ? t("errors.invalidCredentials")
          : isEmailNotConfirmed
          ? t("errors.emailNotConfirmed")
          : error.message
      );
      setIsLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  const handleResendConfirmation = async () => {
    if (!email) return;

    setResendingEmail(true);
    setResendSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    setResendingEmail(false);

    if (error) {
      setError(error.message);
    } else {
      setResendSuccess(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </CardHeader>
      <CardContent>
        <GoogleButton mode="login" />

        <Divider />

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {emailNotConfirmed && !resendSuccess && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-amber-700 dark:text-amber-400 text-sm mb-2">
                {t("errors.confirmationRequired")}
              </p>
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendingEmail}
                className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 disabled:opacity-50"
              >
                {resendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                {t("resendConfirmation")}
              </button>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
              {t("confirmationSent")}
            </div>
          )}

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
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/auth/forgot-password"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t("submit")}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          {t("noAccount")}{" "}
          <NextLink
            href={redirect !== "/chat" ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : "/auth/signup"}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            {t("createAccount")}
          </NextLink>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth.login");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <p className="text-[var(--muted-foreground)] mt-2">
            {t("subtitle")}
          </p>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardContent className="py-8 text-center">
                {t("loading")}
              </CardContent>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
