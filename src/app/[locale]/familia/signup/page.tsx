"use client";

import { Suspense, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Gift, Shield, Clock, Mail, Minus, Plus } from "lucide-react";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateFamiliaPrice } from "@/lib/stripe/familia-plans";
import type { User } from "@supabase/supabase-js";

export default function FamiliaSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <FamiliaSignupContent />
    </Suspense>
  );
}

function FamiliaSignupContent() {
  const t = useTranslations("familia.signup");
  const tAuth = useTranslations("auth.signup");
  const locale = useLocale();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Family form state
  const [familyName, setFamilyName] = useState("");
  const [childCount, setChildCount] = useState(1);
  const [extraParentCount, setExtraParentCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const pricing = calculateFamiliaPrice(childCount);
  const welcomeCredits = childCount * 1.0;

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (password !== confirmPassword) {
      setAuthError(tAuth("errors.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setAuthError(tAuth("errors.passwordTooShort"));
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          accountType: "student",
          displayName: displayName.trim() || undefined,
          redirectUrl: "/familia/signup",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DISPOSABLE_EMAIL") setAuthError(tAuth("errors.disposableEmail"));
        else if (data.code === "RATE_LIMITED") setAuthError(tAuth("errors.tooManyAttempts"));
        else if (data.code === "EMAIL_EXISTS") setAuthError(tAuth("errors.emailInUse"));
        else setAuthError(data.error || tAuth("errors.generic"));
        setIsSigningUp(false);
        return;
      }
      setEmailSent(true);
    } catch {
      setAuthError(tAuth("errors.generic"));
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleCreateFamily = async () => {
    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/familia/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName, childCount, extraParentCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Erreur lors de la creation");
        setIsCreating(false);
        return;
      }
      // Redirect to dashboard with welcome modal
      window.location.href = `/${locale}/familia/dashboard?welcome=true`;
    } catch {
      setCreateError("Une erreur est survenue");
      setIsCreating(false);
    }
  };

  const formatPrice = (price: number) =>
    locale === "fr" ? price.toFixed(2).replace(".", ",") : price.toFixed(2);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Email verification success screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950">
        <div className="max-w-md mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">{t("verifyEmail.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-2">
                {t("verifyEmail.description", { email })}
              </p>
              <div className="bg-[var(--muted)] rounded-lg px-4 py-2 mb-4 inline-block">
                <span className="font-medium">{email}</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("verifyEmail.hint")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            Familia by iaiaz
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2">{t("subtitle")}</p>
        </div>

        <div className="space-y-6">
          {/* Section A: Account Creation (only shown when not logged in) */}
          {!user && (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-bold mb-4">{t("createAccount")}</h2>

                <GoogleButton mode="signup" redirectAfter="/familia/signup" />
                <Divider />

                <form onSubmit={handleEmailSignup} className="space-y-4">
                  {authError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                      {authError}
                    </div>
                  )}

                  <Input
                    id="displayName"
                    type="text"
                    label={tAuth("displayName")}
                    placeholder={tAuth("displayNamePlaceholder")}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    autoComplete="name"
                  />

                  <Input
                    id="email"
                    type="email"
                    label={tAuth("email")}
                    placeholder={tAuth("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />

                  <Input
                    id="password"
                    type="password"
                    label={tAuth("password")}
                    placeholder={tAuth("passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />

                  <Input
                    id="confirmPassword"
                    type="password"
                    label={tAuth("confirmPassword")}
                    placeholder={tAuth("confirmPasswordPlaceholder")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />

                  <Button type="submit" className="w-full" isLoading={isSigningUp}>
                    {tAuth("submit")}
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
                  {t("alreadyHaveAccount")}{" "}
                  <Link
                    href={{ pathname: "/auth/login", query: { redirect: `/${locale}/familia/signup` } } as never}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    {t("loginLink")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Welcome back message when logged in */}
          {user && (
            <div className="text-center">
              <p className="text-lg font-medium text-[var(--foreground)]">
                {t("welcomeBack", { name: user.user_metadata?.full_name || user.email?.split("@")[0] || "" })}
              </p>
            </div>
          )}

          {/* Section B: Family Form */}
          <Card className={!user ? "opacity-60 pointer-events-none" : ""}>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">{t("familyTitle")}</h2>

              <div className="space-y-5">
                {/* Family Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t("familyName")}</label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder={t("familyNamePlaceholder")}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={!user}
                  />
                </div>

                {/* Child Count Stepper */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t("childCount")}</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setChildCount(Math.max(1, childCount - 1))}
                      disabled={childCount <= 1 || !user}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold w-8 text-center">{childCount}</span>
                    <button
                      type="button"
                      onClick={() => setChildCount(Math.min(6, childCount + 1))}
                      disabled={childCount >= 6 || !user}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Extra Parent Count Stepper */}
                <div>
                  <label className="block text-sm font-medium mb-1">{t("extraParentCount")}</label>
                  <p className="text-xs text-[var(--muted-foreground)] mb-2">{t("extraParentNote")}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExtraParentCount(Math.max(0, extraParentCount - 1))}
                      disabled={extraParentCount <= 0 || !user}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold w-8 text-center">{extraParentCount}</span>
                    <button
                      type="button"
                      onClick={() => setExtraParentCount(Math.min(2, extraParentCount + 1))}
                      disabled={extraParentCount >= 2 || !user}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trial Checkout Summary */}
          <Card className={!user ? "opacity-60" : ""}>
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">{t("trialSummary.title")}</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">{t("trialSummary.freeCredits", { amount: welcomeCredits.toFixed(0) })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm">{t("trialSummary.trialDays")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary-600 flex-shrink-0" />
                  <span className="text-sm">{t("trialSummary.noCard")}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-accent-600 flex-shrink-0" />
                  <span className="text-sm">{t("trialSummary.cancelAnytime")}</span>
                </div>

                <hr className="border-[var(--border)]" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold">{t("trialSummary.todayPrice")}</span>
                  <span className="text-2xl font-bold text-green-600">0€</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("trialSummary.monthlyPrice", { price: formatPrice(pricing.total) })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Error */}
          {createError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {createError}
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleCreateFamily}
            disabled={!user || !familyName.trim() || isCreating}
            className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white py-6 text-lg"
          >
            {isCreating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("processing")}</>
            ) : (
              t("startTrial")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
