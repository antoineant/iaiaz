"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import NextLink from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIStructureGenerator, type GeneratedObjective, type GeneratedTopic } from "@/components/org/ai-structure-generator";
import { CourseStructureEditor } from "@/components/org/course-structure-editor";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  PenLine,
  Check,
  BookOpen,
} from "lucide-react";

type SetupMode = "choose" | "ai" | "manual" | "preview";

export default function ClassSetupPage() {
  const t = useTranslations("org.classes.setup");
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [className, setClassName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<SetupMode>("choose");
  const [generatedData, setGeneratedData] = useState<{
    objectives: GeneratedObjective[];
    topics: GeneratedTopic[];
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load class info and user profile
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch class info and user profile in parallel
        const [classResponse, profileResponse] = await Promise.all([
          fetch(`/api/org/classes/${classId}`),
          fetch("/api/profile"),
        ]);

        if (classResponse.ok) {
          const data = await classResponse.json();
          setClassName(data.name);
        }

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setIsAdmin(
            profileData.profile?.is_admin === true ||
            profileData.profile?.account_type === "admin"
          );
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [classId]);

  // Handle AI generation complete
  const handleAIGenerated = useCallback((objectives: GeneratedObjective[], topics: GeneratedTopic[]) => {
    setGeneratedData({ objectives, topics });
    setMode("preview");
  }, []);

  // Save structure and go to dashboard
  const handleSaveAndContinue = async () => {
    if (!generatedData) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/org/classes/${classId}/course-structure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectives: generatedData.objectives,
          topics: generatedData.topics,
        }),
      });

      if (response.ok) {
        router.push(`/org/classes/${classId}`);
      }
    } catch (error) {
      console.error("Failed to save structure:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Skip and go to dashboard
  const handleSkip = () => {
    router.push(`/org/classes/${classId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <NextLink
          href={`/org/classes/${classId}`}
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToDashboard")}
        </NextLink>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-medium">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {t("step1")}
          </span>
        </div>
        <div className="flex-1 h-0.5 bg-primary-200 dark:bg-primary-800" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-medium">
            2
          </div>
          <span className="text-sm font-medium">{t("step2")}</span>
        </div>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-[var(--muted-foreground)]">
          {t("subtitle", { className })}
        </p>
      </div>

      {/* Mode: Choose */}
      {mode === "choose" && (
        <div className="space-y-4">
          {/* AI Option */}
          <Card
            className="cursor-pointer border-2 hover:border-primary-500 transition-colors"
            onClick={() => setMode("ai")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/50 dark:to-purple-900/50">
                  <Sparkles className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{t("aiOption.title")}</h3>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">
                    {t("aiOption.description")}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-primary-600 dark:text-primary-400 text-sm font-medium">
                    {t("aiOption.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Option */}
          <Card
            className="cursor-pointer border-2 hover:border-primary-500 transition-colors"
            onClick={() => setMode("manual")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[var(--muted)]">
                  <PenLine className="w-6 h-6 text-[var(--muted-foreground)]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{t("manualOption.title")}</h3>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">
                    {t("manualOption.description")}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[var(--muted-foreground)] text-sm font-medium">
                    {t("manualOption.cta")}
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skip */}
          <div className="text-center pt-4">
            <button
              onClick={handleSkip}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline"
            >
              {t("skipForNow")}
            </button>
          </div>
        </div>
      )}

      {/* Mode: AI */}
      {mode === "ai" && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode("choose")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>

          <AIStructureGenerator onGenerated={handleAIGenerated} isAdmin={isAdmin} />
        </div>
      )}

      {/* Mode: Manual */}
      {mode === "manual" && (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => setMode("choose")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("back")}
          </Button>

          <CourseStructureEditor classId={classId} />

          <div className="flex justify-end pt-4">
            <Button onClick={handleSkip}>
              {t("finishSetup")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Mode: Preview (after AI generation) */}
      {mode === "preview" && generatedData && (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setMode("ai")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("backToAI")}
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-600" />
                <h2 className="font-semibold">{t("previewTitle")}</h2>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("previewSubtitle")}
              </p>
            </CardHeader>
            <CardContent>
              {/* Objectives */}
              <div className="mb-6">
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-xs text-primary-600">
                    {generatedData.objectives.length}
                  </span>
                  {t("objectivesTitle")}
                </h3>
                <div className="space-y-2">
                  {generatedData.objectives.map((obj, i) => (
                    <div key={obj.id} className="p-3 rounded-lg bg-[var(--muted)]/50">
                      <p className="font-medium text-sm">{i + 1}. {obj.title}</p>
                      {obj.description && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">
                          {obj.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Topics */}
              <div>
                <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-xs text-primary-600">
                    {generatedData.topics.filter(t => !t.parent_id).length}
                  </span>
                  {t("topicsTitle")}
                </h3>
                <div className="space-y-2">
                  {generatedData.topics.filter(t => !t.parent_id).map((topic) => {
                    const subtopics = generatedData.topics.filter(t => t.parent_id === topic.id);
                    return (
                      <div key={topic.id} className="p-3 rounded-lg bg-[var(--muted)]/50">
                        <p className="font-medium text-sm">{topic.title}</p>
                        {topic.description && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            {topic.description}
                          </p>
                        )}
                        {subtopics.length > 0 && (
                          <div className="mt-2 ml-3 space-y-1">
                            {subtopics.map(sub => (
                              <p key={sub.id} className="text-xs text-[var(--muted-foreground)]">
                                └ {sub.title}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setMode("ai")} className="flex-1">
              <Sparkles className="w-4 h-4 mr-2" />
              {t("regenerate")}
            </Button>
            <Button onClick={handleSaveAndContinue} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {t("saveAndContinue")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
