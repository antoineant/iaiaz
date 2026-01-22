"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Loader2,
  Crown,
  Users,
  Calendar,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  SUBSCRIPTION_PLANS,
  getSubscriptionPlan,
  calculateSubscriptionPrice,
  type SubscriptionPlan,
} from "@/lib/models";

interface OrgInfo {
  id: string;
  name: string;
  type: string;
  subscription_plan_id: string | null;
  subscription_status: string;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean;
  subscription_trial_end: string | null;
}

interface MemberCount {
  students: number;
  total: number;
}

export default function OrgSubscriptionPage() {
  const t = useTranslations("org.subscription");
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [memberCount, setMemberCount] = useState<MemberCount>({ students: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [seatCount, setSeatCount] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrgInfo = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Get user's organization
      const { data: membership } = await supabase
        .from("organization_members")
        .select(`
          organization:organizations (
            id,
            name,
            type,
            subscription_plan_id,
            subscription_status,
            subscription_current_period_end,
            subscription_cancel_at_period_end,
            subscription_trial_end
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .single();

      if (!membership?.organization) return;

      const org = membership.organization as unknown as OrgInfo;
      setOrgInfo(org);

      // Get member count
      const { data: members } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", org.id)
        .eq("status", "active");

      const students = members?.filter((m) => m.role === "student").length || 0;
      setMemberCount({
        students,
        total: members?.length || 0,
      });

      // Set initial seat count based on current members and org type
      const minSeats = org.type === "business" ? 5 : 10;
      setSeatCount(Math.max(students, minSeats));

      setIsLoading(false);
    };

    loadOrgInfo();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError(t("errors.selectPlan"));
      return;
    }

    setError("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          billingPeriod,
          seatCount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("errors.generic"));
        setIsProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError(t("errors.generic"));
      setIsProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError(t("errors.generic"));
    }
    setIsProcessing(false);
  };

  // Determine which plans to show based on org type
  const isSchool = orgInfo?.type === "school" || orgInfo?.type === "university" || orgInfo?.type === "business_school";
  const isBusiness = orgInfo?.type === "business";
  const availablePlans = SUBSCRIPTION_PLANS.filter((p) =>
    isBusiness
      ? p.accountType === "business"
      : isSchool
        ? p.accountType === "school"
        : p.accountType === "trainer"
  );

  const currentPlan = orgInfo?.subscription_plan_id
    ? getSubscriptionPlan(orgInfo.subscription_plan_id)
    : null;

  const hasActiveSubscription =
    orgInfo?.subscription_status === "active" ||
    orgInfo?.subscription_status === "trialing";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-[var(--muted-foreground)] mb-6">{t("subtitle")}</p>

      {/* Current Subscription Status */}
      {hasActiveSubscription && currentPlan && (
        <Card className="mb-8 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <Crown className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{currentPlan.name}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {orgInfo.subscription_status === "trialing"
                      ? t("status.trial")
                      : t("status.active")}
                  </p>
                  {orgInfo.subscription_current_period_end && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {orgInfo.subscription_cancel_at_period_end
                        ? t("status.cancelsAt", {
                            date: new Date(orgInfo.subscription_current_period_end).toLocaleDateString(),
                          })
                        : t("status.renewsAt", {
                            date: new Date(orgInfo.subscription_current_period_end).toLocaleDateString(),
                          })}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleManageSubscription} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {t("manageSubscription")}
              </Button>
            </div>

            {orgInfo.subscription_cancel_at_period_end && (
              <div className="mt-4 p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {t("status.cancelWarning")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {orgInfo?.subscription_status === "past_due" && (
        <Card className="mb-8 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg text-red-700 dark:text-red-400">
                  {t("status.pastDue")}
                </h2>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t("status.pastDueDescription")}
                </p>
              </div>
              <Button onClick={handleManageSubscription} disabled={isProcessing}>
                {t("updatePayment")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Subscription Plans */}
      {!hasActiveSubscription && (
        <>
          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center p-1 rounded-lg bg-[var(--muted)]">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "monthly"
                    ? "bg-[var(--background)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t("monthly")}
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingPeriod === "yearly"
                    ? "bg-[var(--background)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t("yearly")}
                <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                  {t("yearlyDiscount")}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
            {availablePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                billingPeriod={billingPeriod}
                seatCount={seatCount}
                isSelected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
                memberCount={memberCount}
              />
            ))}
          </div>

          {/* Seat Count for per-seat plans */}
          {selectedPlan && getSubscriptionPlan(selectedPlan)?.pricingModel === "per_seat" && (
            <Card className="mb-8 max-w-md mx-auto">
              <CardHeader>
                <h3 className="font-semibold">
                  {isBusiness ? t("seatCount.titleEmployees") : t("seatCount.title")}
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {isBusiness ? t("seatCount.descriptionEmployees") : t("seatCount.description")}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                    <Input
                      type="number"
                      min={getSubscriptionPlan(selectedPlan)?.includedSeats || 5}
                      max={1000}
                      value={seatCount}
                      onChange={(e) => {
                        const minSeats = getSubscriptionPlan(selectedPlan)?.includedSeats || 5;
                        setSeatCount(Math.max(minSeats, parseInt(e.target.value) || minSeats));
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {isBusiness ? t("seatCount.employees") : t("seatCount.students")}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {calculateSubscriptionPrice(
                        getSubscriptionPlan(selectedPlan)!,
                        seatCount,
                        billingPeriod
                      ).price.toFixed(2)}€
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      /{billingPeriod === "monthly" ? t("perMonth") : t("perYear")}
                    </p>
                  </div>
                </div>
                {memberCount.students > seatCount && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    {isBusiness
                      ? t("seatCount.warningEmployees", { current: memberCount.students })
                      : t("seatCount.warning", { current: memberCount.students })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Subscribe Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing || !selectedPlan}
              size="lg"
              className="min-w-[200px]"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-5 h-5 mr-2" />
              )}
              {t("subscribe")}
            </Button>
          </div>

          <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
            {t("trialInfo")}
          </p>
        </>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  billingPeriod,
  seatCount,
  isSelected,
  onSelect,
  memberCount,
}: {
  plan: SubscriptionPlan;
  billingPeriod: "monthly" | "yearly";
  seatCount: number;
  isSelected: boolean;
  onSelect: () => void;
  memberCount: MemberCount;
}) {
  const t = useTranslations("org.subscription");
  const pricing = calculateSubscriptionPrice(plan, seatCount, billingPeriod);

  return (
    <button
      onClick={onSelect}
      className={`relative p-6 rounded-xl border-2 text-left transition-all ${
        isSelected
          ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30"
          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
      }`}
    >
      <div className="mb-4">
        <h3 className="text-xl font-semibold">{plan.name}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{plan.description}</p>
      </div>

      <div className="mb-4">
        {plan.pricingModel === "flat" ? (
          <>
            <span className="text-3xl font-bold">
              {billingPeriod === "monthly" ? plan.monthlyPrice.toFixed(2) : plan.yearlyPrice}€
            </span>
            <span className="text-[var(--muted-foreground)]">
              /{billingPeriod === "monthly" ? t("perMonth") : t("perYear")}
            </span>
          </>
        ) : (
          <>
            <span className="text-3xl font-bold">{plan.monthlyPrice.toFixed(2)}€</span>
            <span className="text-[var(--muted-foreground)]">
              /{plan.accountType === "business" ? t("perEmployee") : t("perStudent")}
            </span>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {plan.accountType === "business"
                ? t("minimumEmployees", { min: plan.includedSeats || 5 })
                : t("minimum", { min: plan.includedSeats || 10 })}
            </p>
          </>
        )}
      </div>

      <ul className="space-y-2 mb-4">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      {isSelected && (
        <div className="absolute top-4 right-4">
          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </button>
  );
}
