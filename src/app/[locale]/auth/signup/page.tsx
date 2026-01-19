"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Check, User, GraduationCap } from "lucide-react";

type AccountType = "personal" | "trainer";

export default function SignupPage() {
  const t = useTranslations("auth.signup");

  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [displayName, setDisplayName] = useState("");
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

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accountType,
          displayName: displayName.trim() || undefined,
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

              {/* Account Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("accountType.label")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType("personal")}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      accountType === "personal"
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        accountType === "personal"
                          ? "bg-primary-600 text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t("accountType.personal")}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {t("accountType.personalDesc")}
                        </p>
                      </div>
                    </div>
                    {accountType === "personal" && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary-600" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType("trainer")}
                    className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                      accountType === "trainer"
                        ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                        : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        accountType === "trainer"
                          ? "bg-primary-600 text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t("accountType.trainer")}</p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {t("accountType.trainerDesc")}
                        </p>
                      </div>
                    </div>
                    {accountType === "trainer" && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary-600" />
                      </div>
                    )}
                  </button>
                </div>
              </div>

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
