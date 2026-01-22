"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Download,
  Apple,
  Monitor,
  CheckCircle,
  ExternalLink,
  Copy,
  Check,
  Key,
  Cpu,
  Lock,
  Cloud,
  Loader2,
  Crown,
} from "lucide-react";

export default function AnonymisePage() {
  const t = useTranslations("org.anonymise");
  const router = useRouter();
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get user's organization membership
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .in("role", ["owner", "admin"])
        .single();

      if (!membership) {
        setIsLoading(false);
        return;
      }

      // Check organization subscription
      const { data: org } = await supabase
        .from("organizations")
        .select("subscription_plan_id, type")
        .eq("id", membership.organization_id)
        .single();

      // Only business-pro subscribers have access
      const hasPro = org?.subscription_plan_id === "business-pro";
      setHasAccess(hasPro);
      setIsLoading(false);
    };

    checkAccess();
  }, [router]);

  const handleCopy = (text: string, step: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const features = [
    {
      icon: Lock,
      title: t("features.localProcessing.title"),
      description: t("features.localProcessing.description"),
    },
    {
      icon: Cpu,
      title: t("features.mistralNER.title"),
      description: t("features.mistralNER.description"),
    },
    {
      icon: Cloud,
      title: t("features.seamlessSync.title"),
      description: t("features.seamlessSync.description"),
    },
  ];

  const steps = [
    {
      number: 1,
      title: t("steps.download.title"),
      description: t("steps.download.description"),
    },
    {
      number: 2,
      title: t("steps.install.title"),
      description: t("steps.install.description"),
      command: "ollama pull mistral-nemo",
    },
    {
      number: 3,
      title: t("steps.apiKey.title"),
      description: t("steps.apiKey.description"),
    },
    {
      number: 4,
      title: t("steps.start.title"),
      description: t("steps.start.description"),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Show upgrade prompt if no access
  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-primary-200 dark:border-primary-800">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("upgrade.title")}</h2>
              <p className="text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                {t("upgrade.description")}
              </p>

              <div className="bg-[var(--muted)] rounded-lg p-4 mb-6 text-left max-w-sm mx-auto">
                <p className="font-semibold mb-2">{t("upgrade.features")}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    {t("upgrade.feature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    {t("upgrade.feature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    {t("upgrade.feature3")}
                  </li>
                </ul>
              </div>

              <Button onClick={() => router.push("/org/subscription")} size="lg">
                <Crown className="w-5 h-5 mr-2" />
                {t("upgrade.button")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary-600" />
          {t("title")}
        </h1>
        <p className="text-[var(--muted-foreground)] mt-2 max-w-2xl">
          {t("subtitle")}
        </p>
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>{t("howItWorks.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 py-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="font-medium">{t("howItWorks.step1")}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step1Sub")}</p>
            </div>
            <div className="text-2xl text-[var(--muted-foreground)]">→</div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-2">
                <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="font-medium">{t("howItWorks.step2")}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step2Sub")}</p>
            </div>
            <div className="text-2xl text-[var(--muted-foreground)]">→</div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <Cloud className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium">{t("howItWorks.step3")}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step3Sub")}</p>
            </div>
            <div className="text-2xl text-[var(--muted-foreground)]">→</div>
            <div className="text-center p-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="font-medium">{t("howItWorks.step4")}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step4Sub")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t("download.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--muted-foreground)] mb-6">
            {t("download.description")}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex items-center justify-center gap-3"
              onClick={() => window.open("https://iaiaz.com/downloads/iaiaz-anonyme-mac.dmg", "_blank")}
            >
              <Apple className="w-6 h-6" />
              <div className="text-left">
                <p className="font-medium">{t("download.mac")}</p>
                <p className="text-sm text-[var(--muted-foreground)]">macOS 11+</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex items-center justify-center gap-3"
              onClick={() => window.open("https://iaiaz.com/downloads/iaiaz-anonyme-win.exe", "_blank")}
            >
              <Monitor className="w-6 h-6" />
              <div className="text-left">
                <p className="font-medium">{t("download.windows")}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Windows 10+</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <feature.icon className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle>{t("setup.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {step.description}
                  </p>
                  {step.command && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-md text-sm font-mono">
                        {step.command}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(step.command!, index)}
                      >
                        {copiedStep === index ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  {step.number === 3 && (
                    <button
                      className="mt-2 flex items-center text-sm text-primary-600 hover:text-primary-700 hover:underline"
                      onClick={() => window.open("/dashboard/settings", "_blank")}
                    >
                      <Key className="w-4 h-4 mr-1" />
                      {t("setup.getApiKey")}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Team Deployment Note */}
      <Card className="bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                {t("teamDeployment.title")}
              </h3>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                {t("teamDeployment.description")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
