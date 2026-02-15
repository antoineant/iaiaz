"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { GraduationCap, Briefcase, Heart } from "lucide-react";
import type { Workspace } from "@/app/[locale]/auth/choose-workspace/page";

interface WorkspaceChooserProps {
  workspaces: Workspace[];
  locale: string;
}

export default function WorkspaceChooser({
  workspaces,
  locale,
}: WorkspaceChooserProps) {
  const t = useTranslations("auth.chooseWorkspace");

  const handleSelect = (href: string) => {
    // Clear the intent cookie
    document.cookie = "auth_redirect_after=; path=/; max-age=0";
    window.location.href = `/${locale}${href}`;
  };

  const getIcon = (type: Workspace["type"]) => {
    switch (type) {
      case "study":
        return <GraduationCap className="w-7 h-7" />;
      case "business":
        return <Briefcase className="w-7 h-7" />;
      case "familia":
        return <Heart className="w-7 h-7" />;
    }
  };

  const getGradient = (type: Workspace["type"]) => {
    switch (type) {
      case "study":
        return "from-blue-500 to-indigo-600";
      case "business":
        return "from-indigo-500 to-violet-600";
      case "familia":
        return "from-pink-500 to-rose-600";
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
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => handleSelect(w.href)}
              className="w-full text-left"
            >
              <Card className="hover:border-primary-500 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center gap-4 py-4">
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getGradient(w.type)} flex items-center justify-center text-white flex-shrink-0`}
                  >
                    {getIcon(w.type)}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {t(`types.${w.type}.title`)}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {w.type === "business" || w.type === "familia"
                        ? t(`types.${w.type}.description`, { orgName: w.name })
                        : t(`types.${w.type}.description`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
