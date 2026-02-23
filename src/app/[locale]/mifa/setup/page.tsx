"use client";

import { Suspense, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Gift, Shield, Clock, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculateMifaPrice } from "@/lib/stripe/mifa-plans";
import { useRouter } from "next/navigation";

function MifaSetupContent() {
  const t = useTranslations("mifa.signup");
  const locale = useLocale();
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);

  // Family form state
  const [familyName, setFamilyName] = useState("");
  const [childCount, setChildCount] = useState(1);
  const [extraParentCount, setExtraParentCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const pricing = calculateMifaPrice(childCount);
  const welcomeCredits = childCount * 1.0;

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push(`/${locale}/auth/login`);
        return;
      }
      setAuthLoading(false);
    });
  }, [locale, router]);

  const handleCreateFamily = async () => {
    setIsCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/mifa/create", {
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
      window.location.href = `/${locale}/mifa/dashboard?welcome=true`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              m&#299;f&#257;
            </span>
            <span className="text-[var(--muted-foreground)] font-medium text-lg ml-2">
              by iaiaz
            </span>
          </h1>
          <p className="text-[var(--muted-foreground)] mt-2">{t("subtitle")}</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">{t("familyTitle")}</h2>

              <div className="space-y-5">
                {/* Family Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("familyName")}
                  </label>
                  <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder={t("familyNamePlaceholder")}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Child Count Stepper */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("childCount")}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setChildCount(Math.max(1, childCount - 1))
                      }
                      disabled={childCount <= 1}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold w-8 text-center">
                      {childCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setChildCount(Math.min(6, childCount + 1))
                      }
                      disabled={childCount >= 6}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Extra Parent Count Stepper */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("extraParentCount")}
                  </label>
                  <p className="text-xs text-[var(--muted-foreground)] mb-2">
                    {t("extraParentNote")}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExtraParentCount(
                          Math.max(0, extraParentCount - 1)
                        )
                      }
                      disabled={extraParentCount <= 0}
                      className="w-10 h-10 rounded-lg border border-[var(--border)] flex items-center justify-center hover:bg-[var(--muted)] disabled:opacity-30"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold w-8 text-center">
                      {extraParentCount}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExtraParentCount(
                          Math.min(2, extraParentCount + 1)
                        )
                      }
                      disabled={extraParentCount >= 2}
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
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-bold mb-4">
                {t("trialSummary.title")}
              </h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm">
                    {t("trialSummary.freeCredits", {
                      amount: welcomeCredits.toFixed(0),
                    })}
                  </span>
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
                  <span className="text-sm">
                    {t("trialSummary.cancelAnytime")}
                  </span>
                </div>

                <hr className="border-[var(--border)]" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold">
                    {t("trialSummary.todayPrice")}
                  </span>
                  <span className="text-2xl font-bold text-green-600">0€</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("trialSummary.monthlyPrice", {
                    price: formatPrice(pricing.total),
                  })}
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
            disabled={!familyName.trim() || isCreating}
            className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white py-6 text-lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />{" "}
                {t("processing")}
              </>
            ) : (
              t("startTrial")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MifaSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <MifaSetupContent />
    </Suspense>
  );
}
