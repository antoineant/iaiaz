"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Check } from "lucide-react";

export default function SignupPage() {
  const t = useTranslations("auth.signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError(t("errors.emailInUse"));
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">{t("success.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("success.description", { email })}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("success.hint")}
              </p>
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
          <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <p className="text-[var(--muted-foreground)] mt-2">
            {t("subtitle")}
          </p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
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
              <Link
                href="/auth/login"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                {t("login")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
