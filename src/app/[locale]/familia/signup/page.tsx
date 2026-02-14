"use client";

import { Suspense, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Check, Loader2, Users, Shield, CreditCard } from "lucide-react";
import { calculateFamiliaPrice } from "@/lib/stripe/familia-plans";

type Step = "family" | "members" | "payment";

interface FamilyMember {
  name: string;
  email: string;
  role: "admin" | "student";
  birthdate?: string;
  schoolYear?: string;
}

export default function FamiliaSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" /></div>}>
      <FamiliaSignupContent />
    </Suspense>
  );
}

function FamiliaSignupContent() {
  const t = useTranslations("familia.signup");
  const locale = useLocale();

  const [step, setStep] = useState<Step>("family");
  const [familyName, setFamilyName] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const childCount = members.filter((m) => m.role === "student").length;
  const pricing = calculateFamiliaPrice(childCount);

  const addMember = () => {
    setMembers([...members, { name: "", email: "", role: "student" }]);
  };

  const updateMember = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    setMembers(updated);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Create the family org (with pending members stored for post-payment invites)
      const validMembers = members.filter((m) => m.email.trim());
      const createRes = await fetch("/api/familia/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName,
          members: validMembers,
          locale,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        setError(createData.error || "Erreur lors de la creation");
        setIsLoading(false);
        return;
      }

      const { organizationId } = createData;

      // Step 2: Redirect to Stripe checkout with childCount
      const checkoutRes = await fetch("/api/stripe/checkout/familia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childCount, organizationId }),
      });

      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        setError(checkoutData.error || "Erreur lors du paiement");
        setIsLoading(false);
      }
    } catch {
      setError("Une erreur est survenue");
      setIsLoading(false);
    }
  };

  const steps: { id: Step; icon: typeof Users; label: string }[] = [
    { id: "family", icon: Users, label: t("steps.family") },
    { id: "members", icon: Shield, label: t("steps.members") },
    { id: "payment", icon: CreditCard, label: t("steps.payment") },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const formatPrice = (price: number) => {
    return locale === "fr"
      ? price.toFixed(2).replace(".", ",")
      : price.toFixed(2);
  };

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

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${i <= currentStepIndex
                  ? "bg-primary-600 text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                }`}>
                {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < currentStepIndex ? "bg-primary-600" : "bg-[var(--muted)]"}`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Step: Family Setup */}
        {step === "family" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("familyTitle")}</h2>
            <div>
              <label className="block text-sm font-medium mb-1">{t("familyName")}</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder={t("familyNamePlaceholder")}
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep("members")}
                disabled={!familyName.trim()}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                {t("next")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Add Members */}
        {step === "members" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("membersTitle")}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">{t("membersDesc")}</p>

            {members.map((member, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <select
                      value={member.role}
                      onChange={(e) => updateMember(i, "role", e.target.value)}
                      className="px-3 py-1.5 rounded border border-[var(--border)] bg-[var(--background)] text-sm"
                    >
                      <option value="student">{t("roleChild")}</option>
                      <option value="admin">{t("roleParent")}</option>
                    </select>
                    <button onClick={() => removeMember(i)} className="text-red-500 text-sm hover:underline">
                      {t("remove")}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => updateMember(i, "name", e.target.value)}
                      placeholder={t("namePlaceholder")}
                      className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                    />
                    <input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(i, "email", e.target.value)}
                      placeholder="email@exemple.com"
                      className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                    />
                  </div>
                  {member.role === "student" && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--muted-foreground)] mb-1">{t("birthdate")}</label>
                        <input
                          type="date"
                          value={member.birthdate || ""}
                          onChange={(e) => updateMember(i, "birthdate", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--muted-foreground)] mb-1">{t("schoolYear")}</label>
                        <select
                          value={member.schoolYear || ""}
                          onChange={(e) => updateMember(i, "schoolYear", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                        >
                          <option value="">{t("selectYear")}</option>
                          <option value="6eme">6ème</option>
                          <option value="5eme">5ème</option>
                          <option value="4eme">4ème</option>
                          <option value="3eme">3ème</option>
                          <option value="seconde">Seconde</option>
                          <option value="premiere">Première</option>
                          <option value="terminale">Terminale</option>
                          <option value="superieur">Supérieur</option>
                        </select>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("schoolYearHelp")}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={addMember} className="w-full border-dashed">
              + {t("addMember")}
            </Button>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("family")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
              </Button>
              <Button
                onClick={() => setStep("payment")}
                disabled={childCount < 1}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                {t("next")} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {childCount < 1 && members.length > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">{t("noChildren")}</p>
            )}
          </div>
        )}

        {/* Step: Payment Summary */}
        {step === "payment" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("paymentTitle")}</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t("family")}</span>
                    <span className="font-medium">{familyName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">{t("childCount")}</span>
                    <span className="font-medium">{childCount} {t("children")}</span>
                  </div>
                  <hr className="border-[var(--border)]" />

                  {/* Itemized breakdown */}
                  {pricing.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">
                        {item.label === "child"
                          ? t("priceLine", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })
                          : t("extraLine", { quantity: item.quantity, unitPrice: formatPrice(item.unitPrice) })
                        }
                      </span>
                      <span className="font-medium">{formatPrice(item.subtotal)}&#x20AC;</span>
                    </div>
                  ))}

                  <hr className="border-[var(--border)]" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t("total")}</span>
                    <span>{formatPrice(pricing.total)}&#x20AC;/{locale === "fr" ? "mois" : "month"}</span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("trialNote")}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("members")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white px-8"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t("processing")}</>
                ) : (
                  <>{t("subscribe")} <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
