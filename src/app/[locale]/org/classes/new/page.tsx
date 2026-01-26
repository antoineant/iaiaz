"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function NewClassPage() {
  const t = useTranslations("org.classes");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    starts_at: "",
    ends_at: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const body: Record<string, string | null> = {
        name: formData.name,
        description: formData.description || null,
      };

      if (formData.starts_at) {
        body.starts_at = new Date(formData.starts_at).toISOString();
      }
      if (formData.ends_at) {
        body.ends_at = new Date(formData.ends_at).toISOString();
      }

      const response = await fetch("/api/org/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create class");
      }

      // Redirect to the setup page for course structure
      router.push(`/org/classes/${data.id}/setup`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create class");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/org/classes"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToClasses")}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">{t("createClass")}</h1>

      <Card>
        <CardHeader>
          <p className="text-[var(--muted-foreground)]">{t("createDescription")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Class Name */}
            <div>
              <label className="block text-sm font-medium mb-2">{t("form.name")}*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background"
                placeholder={t("form.namePlaceholder")}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">{t("form.description")}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border rounded-lg bg-background min-h-[100px]"
                placeholder={t("form.descriptionPlaceholder")}
              />
            </div>

            {/* Session Time */}
            <div className="bg-[var(--muted)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-sm font-medium">{t("form.sessionTime")}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">{t("form.startsAt")}</label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] text-sm dark:[color-scheme:dark]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {t("form.startsAtHint")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm mb-2">{t("form.endsAt")}</label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full p-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] text-sm dark:[color-scheme:dark]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {t("form.endsAtHint")}
                  </p>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-end gap-4">
              <Link href="/org/classes">
                <Button type="button" variant="outline">
                  {t("form.cancel")}
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("form.create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
