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
import { Loader2, Mail, User, Baby } from "lucide-react";

type LoginMode = "parent" | "child";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const modeParam = searchParams.get("mode");
  const redirect = redirectParam || "/chat";
  const hasExplicitRedirect = !!redirectParam;
  const t = useTranslations("auth.login");

  const [mode, setMode] = useState<LoginMode>(modeParam === "child" ? "child" : "parent");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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

    const loginEmail = mode === "child" ? `${username.trim()}@mifa.iaiaz.com` : email;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      // Check if error is about email not being confirmed
      const isEmailNotConfirmed =
        error.message.toLowerCase().includes("email not confirmed") ||
        error.message.toLowerCase().includes("email is not confirmed");

      setEmailNotConfirmed(isEmailNotConfirmed && mode === "parent");
      setError(
        error.message === "Invalid login credentials"
          ? mode === "child" ? t("errors.invalidChildCredentials") : t("errors.invalidCredentials")
          : isEmailNotConfirmed
          ? t("errors.emailNotConfirmed")
          : error.message
      );
      setIsLoading(false);
      return;
    }

    // Preserve redirect intent in cookie so choose-workspace can read it
    if (hasExplicitRedirect) {
      document.cookie = `auth_redirect_after=${encodeURIComponent(redirect)}; path=/; max-age=600; SameSite=Lax`;
    }

    // Always route through choose-workspace to enforce family child routing
    router.push("/auth/choose-workspace");
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

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
    setEmailNotConfirmed(false);
    setResendSuccess(false);
  };

  return (
    <Card>
      <CardHeader>
        {/* Mode Toggle Tabs */}
        <div className="flex rounded-lg bg-[var(--muted)] p-1 mb-4">
          <button
            type="button"
            onClick={() => switchMode("parent")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "parent"
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <User className="w-4 h-4" />
            {t("modeParent")}
          </button>
          <button
            type="button"
            onClick={() => switchMode("child")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === "child"
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Baby className="w-4 h-4" />
            {t("modeChild")}
          </button>
        </div>

        <h1 className="text-xl font-semibold">
          {mode === "child" ? t("titleChild") : t("title")}
        </h1>
      </CardHeader>
      <CardContent>
        {mode === "parent" && (
          <>
            <GoogleButton mode="login" redirectAfter={hasExplicitRedirect ? redirect : undefined} />
            <Divider />
          </>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {emailNotConfirmed && !resendSuccess && mode === "parent" && (
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

          {mode === "parent" ? (
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
          ) : (
            <Input
              id="username"
              type="text"
              label={t("childUsername")}
              placeholder={t("childUsernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          )}

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

          {mode === "parent" && (
            <div className="flex items-center justify-between text-sm">
              <Link
                href="/auth/forgot-password"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          )}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t("submit")}
          </Button>
        </form>

        {mode === "parent" && (
          <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
            {t("noAccount")}{" "}
            <NextLink
              href={redirect !== "/chat" ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : "/auth/signup"}
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              {t("createAccount")}
            </NextLink>
          </div>
        )}

        {mode === "child" && (
          <div className="mt-6 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-blue-700 dark:text-blue-400 text-sm">
              {t("childLoginHint")}
            </p>
          </div>
        )}
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
