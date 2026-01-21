"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ArrowRight } from "lucide-react";

export default function OrgCreditsSuccessPage() {
  const t = useTranslations("org.credits.success");
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

          <div className="space-y-3">
            <Link href="/org" className="block">
              <Button className="w-full">
                {t("backToDashboard")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <Link href="/org/members" className="block">
              <Button variant="outline" className="w-full">
                {t("allocateCredits")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
