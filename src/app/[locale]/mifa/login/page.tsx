"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Loader2, User, Baby } from "lucide-react";

type LoginMode = "parent" | "child";

function MifaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const t = useTranslations("mifa.login");

  const [mode, setMode] = useState<LoginMode>(modeParam === "child" ? "child" : "parent");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const loginEmail = mode === "child" ? `${username.trim()}@mifa.iaiaz.com` : email;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? mode === "child" ? t("errors.invalidChildCredentials") : t("errors.invalidCredentials")
          : error.message
      );
      setIsLoading(false);
      return;
    }

    // Route through choose-workspace (will redirect children to /mifa/chat)
    document.cookie = `auth_redirect_after=${encodeURIComponent("/mifa/chat")}; path=/; max-age=600; SameSite=Lax`;
    router.push("/auth/choose-workspace");
    router.refresh();
  };

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError("");
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="pt-6">
        {/* Mode Toggle Tabs */}
        <div className="flex rounded-xl bg-[var(--muted)] p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode("parent")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
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
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
              mode === "child"
                ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Baby className="w-4 h-4" />
            {t("modeChild")}
          </button>
        </div>

        <h1 className="text-xl font-semibold mb-5">
          {mode === "child" ? t("titleChild") : t("titleParent")}
        </h1>

        {mode === "parent" && (
          <>
            <GoogleButton mode="login" redirectAfter="/mifa/chat" />
            <Divider />
          </>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
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
              href="/auth/signup?intent=mifa"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              {t("createAccount")}
            </NextLink>
          </div>
        )}

        {mode === "child" && (
          <div className="mt-6 p-3 rounded-lg bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 border border-primary-100 dark:border-primary-800">
            <p className="text-primary-700 dark:text-primary-300 text-sm text-center">
              {t("childLoginHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MifaLoginPage() {
  const t = useTranslations("mifa.login");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary-50/50 via-white to-accent-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        {/* Mifa Branding Header */}
        <div className="text-center mb-8">
          <Link href="/mifa" className="inline-flex flex-col items-center gap-3">
            <Image
              src="/mifa-logo.png"
              alt="mifa"
              width={64}
              height={64}
              className="rounded-2xl shadow-lg"
            />
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                m&#299;f&#257;
              </span>
              <span className="text-sm text-[var(--muted-foreground)] font-medium">
                by iaiaz
              </span>
            </div>
          </Link>
          <p className="text-[var(--muted-foreground)] mt-2">
            {t("subtitle")}
          </p>
        </div>

        <Suspense
          fallback={
            <Card className="border-0 shadow-xl">
              <CardContent className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                <p className="text-sm text-[var(--muted-foreground)] mt-2">{t("loading")}</p>
              </CardContent>
            </Card>
          }
        >
          <MifaLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
