"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Users,
  Clock,
  QrCode,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "archived" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  closed_at: string | null;
  created_at: string;
  student_count: number;
}

function getClassStatus(classData: ClassData): {
  status: "active" | "scheduled" | "closed" | "expired" | "archived";
  label: string;
  color: string;
} {
  if (classData.status === "archived") {
    return { status: "archived", label: "archived", color: "gray" };
  }
  if (classData.closed_at) {
    return { status: "closed", label: "closed", color: "red" };
  }
  const now = new Date();
  if (classData.starts_at && new Date(classData.starts_at) > now) {
    return { status: "scheduled", label: "scheduled", color: "yellow" };
  }
  if (classData.ends_at && new Date(classData.ends_at) <= now) {
    return { status: "expired", label: "expired", color: "orange" };
  }
  return { status: "active", label: "active", color: "green" };
}

export default function ClassesListPage() {
  const t = useTranslations("org.classes");
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await fetch("/api/org/classes");
        if (!response.ok) {
          throw new Error("Failed to load classes");
        }
        const data = await response.json();
        setClasses(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load classes");
      } finally {
        setIsLoading(false);
      }
    };

    loadClasses();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{t("error")}</p>
        <p className="text-[var(--muted-foreground)]">{error}</p>
      </div>
    );
  }

  const activeClasses = classes.filter((c) => c.status !== "archived");
  const archivedClasses = classes.filter((c) => c.status === "archived");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link href="/org/classes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t("createClass")}
          </Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">{t("noClasses")}</h3>
            <p className="text-[var(--muted-foreground)] text-center max-w-md mb-6">
              {t("noClassesDescription")}
            </p>
            <Link href="/org/classes/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t("createFirstClass")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Classes */}
          <div className="space-y-4 mb-8">
            {activeClasses.map((classData) => {
              const statusInfo = getClassStatus(classData);
              return (
                <Card key={classData.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <NextLink href={`/org/classes/${classData.id}`}>
                            <h3 className="text-lg font-semibold hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                              {classData.name}
                            </h3>
                          </NextLink>
                          <StatusBadge status={statusInfo} t={t} />
                        </div>
                        {classData.description && (
                          <p className="text-[var(--muted-foreground)] text-sm mb-3">
                            {classData.description}
                          </p>
                        )}
                        <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {classData.student_count} {t("students")}
                          </span>
                          {classData.ends_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {t("endsAt", {
                                date: new Date(classData.ends_at).toLocaleDateString(),
                              })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {t("createdAt", {
                              date: new Date(classData.created_at).toLocaleDateString(),
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <NextLink href={`/org/classes/${classData.id}/qr`}>
                          <Button variant="outline" size="sm">
                            <QrCode className="w-4 h-4" />
                          </Button>
                        </NextLink>
                        <NextLink href={`/org/classes/${classData.id}/settings`}>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </NextLink>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Archived Classes */}
          {archivedClasses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-[var(--muted-foreground)]">
                {t("archivedClasses")}
              </h2>
              <div className="space-y-4">
                {archivedClasses.map((classData) => (
                  <Card key={classData.id} className="opacity-60">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{classData.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] mt-1">
                            <span>{classData.student_count} {t("students")}</span>
                            <span>
                              {t("archivedAt", {
                                date: new Date(classData.created_at).toLocaleDateString(),
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  t,
}: {
  status: { status: string; label: string; color: string };
  t: ReturnType<typeof useTranslations>;
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const icons = {
    active: <CheckCircle2 className="w-3 h-3" />,
    scheduled: <Clock className="w-3 h-3" />,
    closed: <XCircle className="w-3 h-3" />,
    expired: <AlertCircle className="w-3 h-3" />,
    archived: <XCircle className="w-3 h-3" />,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        colorClasses[status.color as keyof typeof colorClasses]
      }`}
    >
      {icons[status.status as keyof typeof icons]}
      {t(`status.${status.label}`)}
    </span>
  );
}
