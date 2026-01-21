"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ArrowRight, CreditCard } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const t = useTranslations("org.subscription.success");
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Give Stripe webhook time to process
    const timer = setTimeout(() => {
      setIsVerifying(false);
      setVerified(!!sessionId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-[var(--muted-foreground)]">{t("verifying")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="pt-8 pb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-xl font-semibold mb-2">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)] mb-6">{t("description")}</p>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-sm mb-2">{t("nextSteps")}</h3>
            <ul className="text-sm text-[var(--muted-foreground)] space-y-1">
              <li>1. {t("step1")}</li>
              <li>2. {t("step2")}</li>
              <li>3. {t("step3")}</li>
            </ul>
          </div>

          <div className="space-y-3">
            <NextLink href="/org" className="block">
              <Button className="w-full">
                {t("backToDashboard")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </NextLink>

            <NextLink href="/org/credits" className="block">
              <Button variant="outline" className="w-full">
                <CreditCard className="w-4 h-4 mr-2" />
                {t("purchaseCredits")}
              </Button>
            </NextLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
