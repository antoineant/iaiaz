"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Building2,
  CreditCard,
  ArrowRight,
  Loader2,
  Calendar,
  Clock,
  ChevronRight,
  Keyboard,
} from "lucide-react";
import type { StudentClass } from "@/app/api/student/classes/route";

interface ClassesData {
  classes: StudentClass[];
  active_classes: StudentClass[];
  past_classes: StudentClass[];
  stats: {
    total_joined: number;
    active_classes: number;
    total_credits_used: number;
    total_credits_allocated: number;
  };
}

export default function StudentClassesPage() {
  const t = useTranslations("dashboard.classes");
  const tCommon = useTranslations("common");

  const [data, setData] = useState<ClassesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch("/api/student/classes");
        if (!response.ok) {
          throw new Error("Failed to fetch classes");
        }
        const result = await response.json();
        setData(result);
      } catch {
        setError("Failed to load classes");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClasses();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/dashboard">
              <Button variant="outline">{tCommon("buttons.back")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { active_classes, past_classes, stats } = data || {
    active_classes: [],
    past_classes: [],
    stats: { total_joined: 0, active_classes: 0, total_credits_used: 0, total_credits_allocated: 0 },
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {tCommon("nav.chat") || "Chat"}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-[var(--muted-foreground)]">{t("subtitle")}</p>
          </div>
          <Link href="/join/class">
            <Button>
              <Keyboard className="w-4 h-4 mr-2" />
              {t("joinClass")}
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_joined}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("stats.totalJoined")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active_classes}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("stats.activeClasses")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_credits_allocated.toFixed(2)}€</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("stats.creditsAllocated")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_credits_used.toFixed(2)}€</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("stats.creditsUsed")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Empty state */}
        {stats.total_joined === 0 && (
          <Card className="mb-8">
            <CardContent className="pt-8 pb-8 text-center">
              <GraduationCap className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">{t("empty.title")}</h2>
              <p className="text-[var(--muted-foreground)] mb-6">{t("empty.description")}</p>
              <Link href="/join/class">
                <Button>
                  {t("empty.cta")}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Active Classes */}
        {active_classes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {t("activeSection")}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {active_classes.map((cls) => (
                <ClassCard key={cls.membership_id} classData={cls} t={t} />
              ))}
            </div>
          </div>
        )}

        {/* Past Classes */}
        {past_classes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 text-[var(--muted-foreground)]">
              {t("pastSection")}
            </h2>
            <div className="space-y-2">
              {past_classes.map((cls) => (
                <PastClassRow key={cls.membership_id} classData={cls} t={t} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ClassCard({
  classData,
  t,
}: {
  classData: StudentClass;
  t: ReturnType<typeof useTranslations>;
}) {
  const creditsRemaining = classData.credits_remaining;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold">{classData.class_name}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{classData.organization_name}</p>
            </div>
          </div>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            {t("status.active")}
          </span>
        </div>

        {classData.class_description && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
            {classData.class_description}
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">{t("card.credits")}</p>
            <p className="font-semibold">
              {creditsRemaining.toFixed(2)}€{" "}
              <span className="text-xs text-[var(--muted-foreground)] font-normal">
                {t("card.remaining")}
              </span>
            </p>
          </div>
          {classData.class_ends_at && (
            <div className="text-right">
              <p className="text-xs text-[var(--muted-foreground)]">{t("card.endsAt")}</p>
              <p className="text-sm">
                {new Date(classData.class_ends_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <Link href="/chat">
          <Button className="w-full">
            {t("card.goToChat")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function PastClassRow({
  classData,
  t,
}: {
  classData: StudentClass;
  t: ReturnType<typeof useTranslations>;
}) {
  const statusLabel =
    classData.status === "closed"
      ? t("status.closed")
      : classData.status === "archived"
        ? t("status.archived")
        : t("status.expired");

  return (
    <Link href={`/class/${classData.class_id}`}>
      <Card className="hover:bg-[var(--muted)] transition-colors cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="font-medium">{classData.class_name}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{classData.organization_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm">{classData.credits_used.toFixed(2)}€ {t("card.used")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(classData.joined_at).toLocaleDateString()}
                </p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                {statusLabel}
              </span>
              <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
