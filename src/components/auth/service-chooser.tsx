"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Briefcase,
  Heart,
  Loader2,
} from "lucide-react";

type ServiceType = "study" | "teach" | "school" | "business" | "mifa";

interface ServiceChooserProps {
  intent?: string | null;
}

const SERVICES: {
  id: ServiceType;
  icon: typeof GraduationCap;
  gradient: string;
  needsOrgName?: boolean;
}[] = [
  {
    id: "study",
    icon: GraduationCap,
    gradient: "from-blue-500 to-indigo-600",
  },
  { id: "teach", icon: BookOpen, gradient: "from-green-500 to-emerald-600" },
  {
    id: "school",
    icon: Building2,
    gradient: "from-indigo-500 to-violet-600",
    needsOrgName: true,
  },
  {
    id: "business",
    icon: Briefcase,
    gradient: "from-violet-500 to-purple-600",
    needsOrgName: true,
  },
  { id: "mifa", icon: Heart, gradient: "from-pink-500 to-rose-600" },
];

// Map intent query param to service type
function intentToService(intent: string | null | undefined): ServiceType | null {
  if (!intent) return null;
  const map: Record<string, ServiceType> = {
    teach: "teach",
    school: "school",
    business: "business",
    mifa: "mifa",
    study: "study",
  };
  return map[intent] ?? null;
}

export default function ServiceChooser({ intent }: ServiceChooserProps) {
  const t = useTranslations("auth.chooseService");
  const locale = useLocale();

  const [selected, setSelected] = useState<ServiceType | null>(
    intentToService(intent)
  );
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedService = SERVICES.find((s) => s.id === selected);
  const needsOrgName = selectedService?.needsOrgName ?? false;

  const handleConfirm = async () => {
    if (!selected) return;
    if (needsOrgName && !orgName.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/choose-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selected,
          orgName: needsOrgName ? orgName.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t("error"));
        setIsLoading(false);
        return;
      }

      // Clear intent cookie
      document.cookie = "auth_redirect_after=; path=/; max-age=0";

      // Redirect
      window.location.href = `/${locale}${data.redirect}`;
    } catch {
      setError(t("error"));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-3xl font-bold text-primary-600 dark:text-primary-400"
          >
            iaiaz
          </Link>
          <h1 className="text-xl font-semibold mt-4">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)] mt-2">{t("subtitle")}</p>
        </div>

        <div className="space-y-3">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            const isSelected = selected === service.id;

            return (
              <button
                key={service.id}
                onClick={() => setSelected(service.id)}
                className="w-full text-left"
              >
                <Card
                  className={`transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary-500 shadow-md ring-2 ring-primary-500/20"
                      : "hover:border-primary-500 hover:shadow-md"
                  }`}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center text-white flex-shrink-0`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {t(`services.${service.id}.title`)}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {t(`services.${service.id}.description`)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Org name input for school/business */}
        {needsOrgName && (
          <div className="mt-4">
            <Input
              id="orgName"
              type="text"
              label={t("orgName")}
              placeholder={t("orgNamePlaceholder")}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <Button
          onClick={handleConfirm}
          disabled={!selected || (needsOrgName && !orgName.trim()) || isLoading}
          className="w-full mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t("loading")}
            </>
          ) : (
            t("confirm")
          )}
        </Button>
      </div>
    </div>
  );
}
