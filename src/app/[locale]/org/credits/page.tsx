"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CreditCard,
  Check,
  Loader2,
  Wallet,
  TrendingUp,
  Users,
  Percent,
} from "lucide-react";

interface OrgCreditsInfo {
  organization_id: string;
  organization_name: string;
  credit_balance: number;
  credit_allocated: number;
  total_members: number;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  popular: boolean;
  discount: number;
}

const ORG_CREDIT_PACKS: CreditPack[] = [
  {
    id: "org-starter",
    name: "Classe",
    credits: 50,
    price: 50,
    description: "Pour une classe (~25 étudiants)",
    popular: false,
    discount: 0,
  },
  {
    id: "org-standard",
    name: "Formation",
    credits: 100,
    price: 95,
    description: "Pour plusieurs classes",
    popular: true,
    discount: 5,
  },
  {
    id: "org-premium",
    name: "Établissement",
    credits: 200,
    price: 180,
    description: "Pour un département",
    popular: false,
    discount: 10,
  },
  {
    id: "org-enterprise",
    name: "Institution",
    credits: 500,
    price: 425,
    description: "Pour tout l'établissement",
    popular: false,
    discount: 15,
  },
];

function calculateOrgDiscount(amount: number): { price: number; discount: number } {
  if (amount >= 500) {
    return { price: Math.round(amount * 0.85), discount: 15 };
  } else if (amount >= 200) {
    return { price: Math.round(amount * 0.90), discount: 10 };
  } else if (amount >= 100) {
    return { price: Math.round(amount * 0.95), discount: 5 };
  }
  return { price: amount, discount: 0 };
}

export default function OrgCreditsPage() {
  const t = useTranslations("org.credits");
  const [orgInfo, setOrgInfo] = useState<OrgCreditsInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
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
      const { data: orgMember } = await supabase.rpc("get_user_organization", {
        p_user_id: user.id,
      });

      if (!orgMember || orgMember.length === 0) return;

      const orgId = orgMember[0].organization_id;

      // Get organization details
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, credit_balance")
        .eq("id", orgId)
        .single();

      // Get member stats
      const { data: members } = await supabase
        .from("organization_members")
        .select("credit_allocated")
        .eq("organization_id", orgId)
        .eq("status", "active");

      const totalAllocated = members?.reduce((sum, m) => sum + (m.credit_allocated || 0), 0) || 0;

      setOrgInfo({
        organization_id: org?.id || "",
        organization_name: org?.name || "",
        credit_balance: org?.credit_balance || 0,
        credit_allocated: totalAllocated,
        total_members: members?.length || 0,
      });

      setIsLoading(false);
    };

    loadOrgInfo();
  }, []);

  const handlePurchase = async () => {
    setError("");
    setIsProcessing(true);

    try {
      const body: { packId?: string; customAmount?: number } = {};

      if (selectedPack) {
        body.packId = selectedPack;
      } else if (customAmount) {
        const amount = parseInt(customAmount, 10);
        if (isNaN(amount) || amount < 50 || amount > 2000) {
          setError(t("errors.invalidAmount"));
          setIsProcessing(false);
          return;
        }
        body.customAmount = amount;
      } else {
        setError(t("errors.selectPack"));
        setIsProcessing(false);
        return;
      }

      const response = await fetch("/api/stripe/checkout/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const customAmountValue = parseInt(customAmount, 10) || 0;
  const customDiscount = calculateOrgDiscount(customAmountValue);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const availableCredits = (orgInfo?.credit_balance || 0) - (orgInfo?.credit_allocated || 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-[var(--muted-foreground)] mb-6">{t("subtitle")}</p>

      {/* Current Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("balance")}</p>
                <p className="text-2xl font-bold mt-1">
                  {orgInfo?.credit_balance.toFixed(2)}€
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("available")}</p>
                <p className="text-2xl font-bold mt-1">{availableCredits.toFixed(2)}€</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("members")}</p>
                <p className="text-2xl font-bold mt-1">{orgInfo?.total_members}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 mb-6 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Credit Packs */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="font-semibold">{t("choosePack")}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{t("volumeDiscounts")}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {ORG_CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                onClick={() => {
                  setSelectedPack(pack.id);
                  setCustomAmount("");
                }}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  selectedPack === pack.id
                    ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30"
                    : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-3 px-2 py-0.5 text-xs font-medium bg-primary-600 text-white rounded-full">
                    {t("popular")}
                  </span>
                )}
                {pack.discount > 0 && (
                  <span className="absolute -top-2 left-3 px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    -{pack.discount}%
                  </span>
                )}

                <div className="mb-3">
                  <h3 className="font-semibold">{pack.name}</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">{pack.description}</p>
                </div>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold">{pack.price}€</span>
                  {pack.discount > 0 && (
                    <span className="text-sm text-[var(--muted-foreground)] line-through">
                      {pack.credits}€
                    </span>
                  )}
                </div>

                <p className="text-sm text-[var(--muted-foreground)]">
                  {pack.credits}€ {t("creditsLabel")}
                </p>

                {selectedPack === pack.id && (
                  <div className="absolute top-3 right-3">
                    <Check className="w-5 h-5 text-primary-600" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="border-t border-[var(--border)] pt-6">
            <h3 className="font-medium mb-3">{t("customAmount")}</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  min={50}
                  max={2000}
                  step={10}
                  placeholder="50 - 2000"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPack(null);
                  }}
                  className="text-lg"
                />
              </div>
              {customAmountValue >= 50 && (
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("youPay")}</p>
                    <p className="text-xl font-bold">{customDiscount.price}€</p>
                  </div>
                  {customDiscount.discount > 0 && (
                    <span className="px-2 py-1 text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                      -{customDiscount.discount}%
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">{t("discountTiers")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Button */}
      <div className="flex justify-end">
        <Button
          onClick={handlePurchase}
          disabled={isProcessing || (!selectedPack && !customAmount)}
          size="lg"
          className="min-w-[200px]"
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="w-5 h-5 mr-2" />
          )}
          {t("purchase")}
        </Button>
      </div>
    </div>
  );
}
