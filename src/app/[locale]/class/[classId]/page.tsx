"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Building2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  XCircle,
  CheckCircle2,
} from "lucide-react";

interface ClassInfo {
  membership_id: string;
  class_id: string;
  class_name: string;
  class_description: string | null;
  organization_id: string;
  organization_name: string;
  status: string;
  is_accessible: boolean;
  access_message: string | null;
  credits_allocated: number;
  credits_used: number;
  credits_remaining: number;
  joined_at: string;
  member_status: string;
  class_starts_at: string | null;
  class_ends_at: string | null;
  class_closed_at: string | null;
}

export default function ClassInfoPage() {
  const t = useTranslations("classInfo");
  const params = useParams();
  const classId = params.classId as string;

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassInfo = async () => {
      try {
        const response = await fetch(`/api/student/classes/${classId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Class not found or you are not a member");
          } else {
            throw new Error("Failed to fetch class info");
          }
          return;
        }
        const data = await response.json();
        setClassInfo(data);
      } catch {
        setError("Failed to load class information");
      } finally {
        setIsLoading(false);
      }
    };

    if (classId) {
      fetchClassInfo();
    }
  }, [classId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !classInfo) {
    return (
      <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">{t("error.title")}</h1>
            <p className="text-[var(--muted-foreground)] mb-6">{error || t("error.notFound")}</p>
            <Link href="/dashboard/classes">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToClasses")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (classInfo.is_accessible) {
      return (
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          {t("status.active")}
        </span>
      );
    }

    let label = t("status.closed");
    if (classInfo.access_message === "session_expired") {
      label = t("status.expired");
    } else if (classInfo.access_message === "session_not_started") {
      label = t("status.notStarted");
    }

    return (
      <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center gap-1">
        <XCircle className="w-4 h-4" />
        {label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Header */}
      <header className="bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <Link
            href="/dashboard/classes"
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("backToClasses")}
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-8">
            {/* Class header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{classInfo.class_name}</h1>
                  <div className="flex items-center gap-2 text-[var(--muted-foreground)] mt-1">
                    <Building2 className="w-4 h-4" />
                    <span>{classInfo.organization_name}</span>
                  </div>
                </div>
              </div>
              {getStatusBadge()}
            </div>

            {/* Description */}
            {classInfo.class_description && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-2">
                  {t("description")}
                </h2>
                <p className="text-[var(--foreground)]">{classInfo.class_description}</p>
              </div>
            )}

            {/* Session info */}
            {(classInfo.class_starts_at || classInfo.class_ends_at) && (
              <div className="mb-6 p-4 bg-[var(--muted)] rounded-lg">
                <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t("session")}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {classInfo.class_starts_at && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">{t("startsAt")}</p>
                      <p className="font-medium">
                        {new Date(classInfo.class_starts_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {classInfo.class_ends_at && (
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">{t("endsAt")}</p>
                      <p className="font-medium">
                        {new Date(classInfo.class_ends_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credits info */}
            <div className="mb-8 p-4 bg-[var(--muted)] rounded-lg">
              <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                {t("credits")}
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("allocated")}</p>
                  <p className="text-xl font-bold">{classInfo.credits_allocated.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("used")}</p>
                  <p className="text-xl font-bold">{classInfo.credits_used.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">{t("remaining")}</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {classInfo.credits_remaining.toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>

            {/* Joined date */}
            <div className="mb-8 text-sm text-[var(--muted-foreground)] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {t("joinedOn", { date: new Date(classInfo.joined_at).toLocaleDateString() })}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              {classInfo.is_accessible ? (
                <Link href="/chat" className="flex-1">
                  <Button className="w-full">
                    {t("goToChat")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Button className="flex-1" disabled>
                  <XCircle className="w-4 h-4 mr-2" />
                  {t("classClosed")}
                </Button>
              )}
              <Link href="/dashboard/classes">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("backToClasses")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
