"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, Trash2, Info, Check } from "lucide-react";

interface ClassData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  settings: {
    allowed_models: string[] | null;
    default_credit_per_student: number | null;
    daily_limit_per_student: number | null;
    allow_personal_fallback: boolean;
  };
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
}

export default function ClassSettingsPage() {
  const t = useTranslations("org.classes");
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [restrictModels, setRestrictModels] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    starts_at: "",
    ends_at: "",
    default_credit_per_student: "",
    daily_limit_per_student: "",
    allow_personal_fallback: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load class data and available models in parallel
        const [classResponse, modelsResponse] = await Promise.all([
          fetch(`/api/org/classes/${classId}`),
          fetch("/api/admin/models"),
        ]);

        if (!classResponse.ok) throw new Error("Failed to load class");

        const data = await classResponse.json();
        setClassData(data);

        // Load available models
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          setAvailableModels(modelsData);
        }

        // Format dates for datetime-local input
        const formatDate = (date: string | null) => {
          if (!date) return "";
          return new Date(date).toISOString().slice(0, 16);
        };

        setFormData({
          name: data.name,
          description: data.description || "",
          starts_at: formatDate(data.starts_at),
          ends_at: formatDate(data.ends_at),
          default_credit_per_student: data.settings?.default_credit_per_student?.toString() || "",
          daily_limit_per_student: data.settings?.daily_limit_per_student?.toString() || "",
          allow_personal_fallback: data.settings?.allow_personal_fallback ?? true,
        });

        // Set up model restrictions
        const allowedModels = data.settings?.allowed_models;
        if (allowedModels && allowedModels.length > 0) {
          setRestrictModels(true);
          setSelectedModels(allowedModels);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load class");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [classId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        ends_at: formData.ends_at ? new Date(formData.ends_at).toISOString() : null,
        settings: {
          ...classData?.settings,
          allowed_models: restrictModels && selectedModels.length > 0 ? selectedModels : null,
          default_credit_per_student: formData.default_credit_per_student
            ? parseFloat(formData.default_credit_per_student)
            : null,
          daily_limit_per_student: formData.daily_limit_per_student
            ? parseFloat(formData.daily_limit_per_student)
            : null,
          allow_personal_fallback: formData.allow_personal_fallback,
        },
      };

      const response = await fetch(`/api/org/classes/${classId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update class");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update class");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm(t("confirmArchive"))) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/org/classes/${classId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to archive class");
      }

      router.push("/org/classes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to archive class");
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && !classData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{t("error")}</p>
        <p className="text-[var(--muted-foreground)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <NextLink
          href={`/org/classes/${classId}`}
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToDashboard")}
        </NextLink>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t("settingsTitle")}</h1>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold">{t("settingsBasic")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t("form.name")}*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t("form.description")}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Time */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold">{t("settingsSession")}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t("form.startsAt")}</label>
                <input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] dark:[color-scheme:dark]"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("form.startsAtHint")}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t("form.endsAt")}</label>
                <input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] dark:[color-scheme:dark]"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("form.endsAtHint")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold">{t("settingsCredits")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("form.defaultCredit")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.default_credit_per_student}
                  onChange={(e) =>
                    setFormData({ ...formData, default_credit_per_student: e.target.value })
                  }
                  className="w-32 p-2 border rounded-lg bg-background"
                  placeholder="5.00"
                />
                <span className="text-[var(--muted-foreground)]">€</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t("form.defaultCreditHint")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">{t("form.dailyLimit")}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.daily_limit_per_student}
                  onChange={(e) =>
                    setFormData({ ...formData, daily_limit_per_student: e.target.value })
                  }
                  className="w-32 p-2 border rounded-lg bg-background"
                  placeholder={t("form.noLimit")}
                />
                <span className="text-[var(--muted-foreground)]">€</span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t("form.dailyLimitHint")}
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-[var(--muted)] rounded-lg">
              <input
                type="checkbox"
                id="allow_personal_fallback"
                checked={formData.allow_personal_fallback}
                onChange={(e) =>
                  setFormData({ ...formData, allow_personal_fallback: e.target.checked })
                }
                className="w-4 h-4"
              />
              <label htmlFor="allow_personal_fallback" className="text-sm">
                <span className="font-medium">{t("form.allowFallback")}</span>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("form.allowFallbackHint")}
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Model Restrictions */}
        <Card className="mb-6">
          <CardHeader>
            <h2 className="font-semibold">{t("settingsModels")}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-[var(--muted)] rounded-lg">
              <input
                type="checkbox"
                id="restrict_models"
                checked={restrictModels}
                onChange={(e) => {
                  setRestrictModels(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedModels([]);
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="restrict_models" className="text-sm">
                <span className="font-medium">{t("form.restrictModels")}</span>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("form.restrictModelsHint")}
                </p>
              </label>
            </div>

            {restrictModels && availableModels.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("form.selectModels")}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableModels.map((model) => (
                    <label
                      key={model.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedModels.includes(model.id)
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(model.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModels([...selectedModels, model.id]);
                          } else {
                            setSelectedModels(selectedModels.filter((id) => id !== model.id));
                          }
                        }}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          selectedModels.includes(model.id)
                            ? "bg-primary-600 text-white"
                            : "border-2 border-[var(--muted-foreground)]"
                        }`}
                      >
                        {selectedModels.includes(model.id) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{model.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">
                          {model.provider}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {restrictModels && selectedModels.length === 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    {t("form.noModelsWarning")}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-6 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-lg">
            {t("settingsSaved")}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="danger"
            onClick={handleArchive}
            disabled={isSaving}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t("archiveClass")}
          </Button>
          <div className="flex items-center gap-4">
            <NextLink href={`/org/classes/${classId}`}>
              <Button type="button" variant="outline">
                {t("form.cancel")}
              </Button>
            </NextLink>
            <Button type="submit" disabled={isSaving || !formData.name.trim()}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("form.save")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
