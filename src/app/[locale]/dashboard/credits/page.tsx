"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CREDIT_PACKS } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, CreditCard, Shield, Pencil } from "lucide-react";

const MIN_CUSTOM_AMOUNT = 1;
const MAX_CUSTOM_AMOUNT = 100;

export default function CreditsPage() {
  const t = useTranslations("credits");

  const [selectedPack, setSelectedPack] = useState<string>("regular");
  const [customAmount, setCustomAmount] = useState<number>(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isCustom = selectedPack === "custom";

  const getSelectedPrice = () => {
    if (isCustom) return customAmount;
    return CREDIT_PACKS.find((p) => p.id === selectedPack)?.price || 0;
  };

  const getSelectedCredits = () => {
    if (isCustom) return customAmount;
    return CREDIT_PACKS.find((p) => p.id === selectedPack)?.credits || 0;
  };

  const handleCustomAmountChange = (value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      setCustomAmount(MIN_CUSTOM_AMOUNT);
    } else {
      setCustomAmount(Math.min(MAX_CUSTOM_AMOUNT, Math.max(MIN_CUSTOM_AMOUNT, num)));
    }
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    setError("");

    try {
      const body = isCustom
        ? { customAmount }
        : { packId: selectedPack };

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du paiement");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={cn(
                "cursor-pointer transition-all",
                selectedPack === pack.id
                  ? "ring-2 ring-primary-500 shadow-lg"
                  : "hover:shadow-md"
              )}
              onClick={() => setSelectedPack(pack.id)}
            >
              <CardContent className="pt-6 text-center relative">
                {pack.popular && (
                  <span className="absolute top-2 right-2 text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
                    {t("popular")}
                  </span>
                )}
                {selectedPack === pack.id && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <h3 className="text-lg font-semibold mt-1">{pack.name}</h3>
                <p className="text-3xl font-bold my-3">{pack.price}€</p>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {pack.description}
                </p>
                <ul className="text-xs text-left space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {t("creditAmount", { amount: pack.credits })}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {t("allModels")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {t("noExpiration")}
                  </li>
                </ul>
              </CardContent>
            </Card>
          ))}

          {/* Custom amount card */}
          <Card
            className={cn(
              "cursor-pointer transition-all",
              isCustom
                ? "ring-2 ring-primary-500 shadow-lg"
                : "hover:shadow-md"
            )}
            onClick={() => setSelectedPack("custom")}
          >
            <CardContent className="pt-6 text-center relative">
              <span className="absolute top-2 right-2 text-xs font-medium text-accent-600 bg-accent-100 px-2 py-0.5 rounded-full">
                {t("free")}
              </span>
              {isCustom && (
                <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="flex items-center justify-center gap-1 mt-1">
                <Pencil className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h3 className="text-lg font-semibold">{t("customAmount")}</h3>
              </div>
              <div className="my-3">
                <div className="flex items-center justify-center gap-1">
                  <Input
                    type="number"
                    min={MIN_CUSTOM_AMOUNT}
                    max={MAX_CUSTOM_AMOUNT}
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPack("custom");
                    }}
                    className="w-20 text-center text-2xl font-bold h-12 px-2"
                  />
                  <span className="text-2xl font-bold">€</span>
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                {t("customRange", { min: MIN_CUSTOM_AMOUNT, max: MAX_CUSTOM_AMOUNT })}
              </p>
              <ul className="text-xs text-left space-y-1.5">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {t("creditAmount", { amount: customAmount })}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {t("allModels")}
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  {t("noExpiration")}
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">{t("summary.title")}</h2>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-medium">
                  {isCustom
                    ? t("summary.customAmount")
                    : t("summary.pack", { name: CREDIT_PACKS.find((p) => p.id === selectedPack)?.name || "" })}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("creditAmount", { amount: getSelectedCredits() })}
                </p>
              </div>
              <p className="text-2xl font-bold">{getSelectedPrice()}€</p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handlePurchase}
              isLoading={isLoading}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {t("payByCard")}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Shield className="w-4 h-4" />
              {t("securedByStripe")}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
          <p>
            {t("legalNotice").split("CGU").map((part, i) => (
              i === 0 ? (
                <span key={i}>
                  {part}
                  <Link href="/legal/cgu" className="text-primary-600 hover:underline">
                    CGU
                  </Link>
                </span>
              ) : (
                <span key={i}>
                  {part.split("CGV").map((p, j) => (
                    j === 0 ? (
                      <span key={j}>
                        {p}
                        <Link href="/legal/cgv" className="text-primary-600 hover:underline">
                          CGV
                        </Link>
                      </span>
                    ) : p
                  ))}
                </span>
              )
            ))}
          </p>
        </div>
      </main>
    </div>
  );
}
