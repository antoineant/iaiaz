"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Users,
  CreditCard,
  TrendingUp,
  Clock,
  QrCode,
  Settings,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  BarChart3,
} from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  join_token: string;
  status: "active" | "archived" | "closed";
  starts_at: string | null;
  ends_at: string | null;
  closed_at: string | null;
  created_at: string;
  settings: {
    allowed_models: string[] | null;
    default_credit_per_student: number | null;
    daily_limit_per_student: number | null;
    allow_personal_fallback: boolean;
  };
  stats: {
    total_students: number;
    active_today: number;
    total_credit_allocated: number;
    total_credit_used: number;
    usage_today: number;
    usage_this_week: number;
  };
}

interface Student {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  credit_allocated: number;
  credit_used: number;
  credit_remaining: number;
  status: string;
  joined_at: string;
  last_activity: string | null;
  // Analytics data
  ai_literacy_score: number | null;
  domain_engagement_score: number | null;
  quadrant: "ideal" | "train_ai" | "at_risk" | "superficial" | null;
  total_messages: number;
}

export default function ClassDashboardPage() {
  const t = useTranslations("org.classes");
  const params = useParams();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [classRes, studentsRes] = await Promise.all([
        fetch(`/api/org/classes/${classId}`),
        fetch(`/api/org/classes/${classId}/students`),
      ]);

      if (!classRes.ok) {
        throw new Error("Failed to load class");
      }

      const classJson = await classRes.json();
      const studentsJson = studentsRes.ok ? await studentsRes.json() : [];

      // Ensure stats has default values to prevent toFixed errors
      const stats = {
        total_students: 0,
        active_today: 0,
        total_credit_allocated: 0,
        total_credit_used: 0,
        usage_today: 0,
        usage_this_week: 0,
        ...classJson.stats,
      };

      setClassData({ ...classJson, stats });
      setStudents(studentsJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classId]);

  const handleCloseSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/org/classes/${classId}/close`, {
        method: "POST",
      });
      if (response.ok) {
        await loadData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenSession = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/org/classes/${classId}/reopen`, {
        method: "POST",
      });
      if (response.ok) {
        await loadData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{t("error")}</p>
        <p className="text-[var(--muted-foreground)]">{error}</p>
      </div>
    );
  }

  const isSessionActive =
    classData.status === "active" &&
    !classData.closed_at &&
    (!classData.starts_at || new Date(classData.starts_at) <= new Date()) &&
    (!classData.ends_at || new Date(classData.ends_at) > new Date());

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com";
  const joinUrl = `${baseUrl}/join/class?token=${classData.join_token}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/org/classes"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToClasses")}
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{classData.name}</h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isSessionActive
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {isSessionActive ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> {t("status.active")}
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />{" "}
                    {classData.closed_at ? t("status.closed") : t("status.inactive")}
                  </>
                )}
              </span>
            </div>
            {classData.description && (
              <p className="text-[var(--muted-foreground)] mt-1">{classData.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NextLink href={`/org/classes/${classId}/analytics`}>
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                {t("analytics.title")}
              </Button>
            </NextLink>
            <NextLink href={`/org/classes/${classId}/qr`}>
              <Button variant="outline">
                <QrCode className="w-4 h-4 mr-2" />
                {t("qrCode")}
              </Button>
            </NextLink>
            <NextLink href={`/org/classes/${classId}/settings`}>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                {t("settings")}
              </Button>
            </NextLink>
            {isSessionActive ? (
              <Button
                variant="danger"
                onClick={handleCloseSession}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Pause className="w-4 h-4 mr-2" />
                )}
                {t("closeSession")}
              </Button>
            ) : classData.closed_at ? (
              <Button onClick={handleReopenSession} disabled={actionLoading}>
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {t("reopenSession")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("stats.students")}</p>
                <p className="text-2xl font-bold mt-1">{classData.stats.total_students}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {classData.stats.active_today} {t("stats.activeToday")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("stats.credits")}</p>
                <p className="text-2xl font-bold mt-1">
                  {classData.stats.total_credit_allocated.toFixed(2)}€
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {classData.stats.total_credit_used.toFixed(2)}€ {t("stats.used")}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("stats.usageToday")}</p>
                <p className="text-2xl font-bold mt-1">
                  {classData.stats.usage_today.toFixed(3)}€
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("stats.usageWeek")}</p>
                <p className="text-2xl font-bold mt-1">
                  {classData.stats.usage_this_week.toFixed(3)}€
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Join URL */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1">{t("joinLink")}</p>
              <code className="text-sm text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded">
                {joinUrl}
              </code>
            </div>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(joinUrl)}
            >
              {t("copyLink")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">{t("studentsList")}</h2>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("noStudents")}</p>
              <p className="text-sm mt-2">{t("shareQrCode")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-sm text-[var(--muted-foreground)]">
                    <th className="pb-3">{t("table.student")}</th>
                    <th className="pb-3">{t("table.aiLiteracy")}</th>
                    <th className="pb-3">{t("table.engagement")}</th>
                    <th className="pb-3">{t("table.credits")}</th>
                    <th className="pb-3">{t("table.lastActivity")}</th>
                    <th className="pb-3">{t("table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const quadrantColors: Record<string, string> = {
                      ideal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                      train_ai: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                      at_risk: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                      superficial: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                    };

                    return (
                      <tr key={student.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-medium">
                              {(student.display_name || student.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">
                                {student.display_name || t("anonymous")}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {student.email || "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          {student.ai_literacy_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    student.ai_literacy_score >= 70
                                      ? "bg-green-500"
                                      : student.ai_literacy_score >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${student.ai_literacy_score}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{Math.round(student.ai_literacy_score)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {student.domain_engagement_score !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    student.domain_engagement_score >= 70
                                      ? "bg-green-500"
                                      : student.domain_engagement_score >= 40
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${student.domain_engagement_score}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">{Math.round(student.domain_engagement_score)}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)]">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div>
                            <p className="font-mono text-sm">
                              {student.credit_remaining.toFixed(2)}€
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              / {student.credit_allocated.toFixed(2)}€
                            </p>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-[var(--muted-foreground)]">
                          {student.last_activity
                            ? new Date(student.last_activity).toLocaleString()
                            : t("never")}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                student.status === "active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                              }`}
                            >
                              {student.status}
                            </span>
                            {student.quadrant && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${quadrantColors[student.quadrant]}`}
                              >
                                {t(`quadrants.${student.quadrant}`)}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
