"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Loader2,
  Target,
  BookOpen,
  AlertCircle,
  Check,
  RefreshCw,
  Settings2,
} from "lucide-react";

export interface GeneratedObjective {
  id: string;
  title: string;
  description: string;
  sort_order: number;
}

export interface GeneratedTopic {
  id: string;
  parent_id: string | null;
  title: string;
  description: string;
  keywords: string[];
  sort_order: number;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

interface AIStructureGeneratorProps {
  onGenerated: (objectives: GeneratedObjective[], topics: GeneratedTopic[]) => void;
  onSuggestedName?: (name: string) => void;
  onSuggestedDescription?: (description: string) => void;
  initialDescription?: string;
  isAdmin?: boolean;
}

export function AIStructureGenerator({
  onGenerated,
  onSuggestedName,
  onSuggestedDescription,
  initialDescription = "",
  isAdmin = false,
}: AIStructureGeneratorProps) {
  const t = useTranslations("org.classes.courseStructure.ai");
  const locale = useLocale();

  const [description, setDescription] = useState(initialDescription);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    objectives: GeneratedObjective[];
    topics: GeneratedTopic[];
  } | null>(null);

  // Admin-only: model selection
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Fetch models for admin
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/models/allowed")
        .then((res) => res.json())
        .then((data) => {
          if (data.models) {
            setModels(data.models);
            // Default to recommended or first model
            const defaultModel = data.models.find((m: AIModel) => m.id === data.defaultModel)
              || data.models[0];
            if (defaultModel) {
              setSelectedModel(defaultModel.id);
            }
          }
        })
        .catch(console.error);
    }
  }, [isAdmin]);

  const handleGenerate = async () => {
    if (description.trim().length < 20) {
      setError(t("descriptionTooShort"));
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPreview(null);

    try {
      const body: Record<string, string> = {
        description: description.trim(),
        locale
      };

      // Admin can override the model
      if (isAdmin && selectedModel) {
        body.modelId = selectedModel;
      }

      const response = await fetch("/api/ai/generate-course-structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setPreview({
        objectives: data.objectives,
        topics: data.topics,
      });

      // Pass suggested name/description to parent if available
      if (data.suggestedName && onSuggestedName) {
        onSuggestedName(data.suggestedName);
      }
      if (data.suggestedDescription && onSuggestedDescription) {
        onSuggestedDescription(data.suggestedDescription);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    if (preview) {
      onGenerated(preview.objectives, preview.topics);
    }
  };

  const handleRegenerate = () => {
    setPreview(null);
    handleGenerate();
  };

  // Get parent topics for display
  const parentTopics = preview?.topics.filter(t => !t.parent_id) || [];
  const getSubtopics = (parentId: string) =>
    preview?.topics.filter(t => t.parent_id === parentId) || [];

  // Group models by provider for the selector
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <Card className="border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50/50 to-transparent dark:from-primary-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/50">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{t("title")}</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("subtitle")}
            </p>
          </div>
          {/* Admin: Model settings toggle */}
          {isAdmin && models.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="text-[var(--muted-foreground)]"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Admin: Model selector */}
        {isAdmin && showModelSelector && models.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <label className="block text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
              Admin: Select AI Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 text-sm border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-amber-950/50"
              disabled={isGenerating}
            >
              {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                <optgroup key={provider} label={provider}>
                  {providerModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Selected: {models.find(m => m.id === selectedModel)?.name || "Default"}
            </p>
          </div>
        )}

        {/* Description input */}
        {!preview && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                {t("descriptionLabel")}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                className="w-full p-3 border border-[var(--border)] rounded-lg bg-[var(--background)] min-h-[120px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {t("descriptionHint")}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || description.trim().length < 20}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("generating")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t("generateButton")}
                </>
              )}
            </Button>
          </>
        )}

        {/* Preview */}
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-medium">{t("previewReady")}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {t("regenerate")}
              </Button>
            </div>

            {/* Objectives preview */}
            <div className="p-4 rounded-lg bg-[var(--muted)]/50">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-sm">
                  {t("objectives")} ({preview.objectives.length})
                </span>
              </div>
              <ul className="space-y-2">
                {preview.objectives.map((obj, i) => (
                  <li key={obj.id} className="text-sm">
                    <span className="font-medium">{i + 1}. {obj.title}</span>
                    {obj.description && (
                      <p className="text-[var(--muted-foreground)] text-xs mt-0.5">
                        {obj.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Topics preview */}
            <div className="p-4 rounded-lg bg-[var(--muted)]/50">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-sm">
                  {t("topics")} ({parentTopics.length})
                </span>
              </div>
              <ul className="space-y-3">
                {parentTopics.map((topic) => {
                  const subtopics = getSubtopics(topic.id);
                  return (
                    <li key={topic.id} className="text-sm">
                      <span className="font-medium">{topic.title}</span>
                      {topic.description && (
                        <p className="text-[var(--muted-foreground)] text-xs">
                          {topic.description}
                        </p>
                      )}
                      {topic.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {topic.keywords.slice(0, 4).map((kw, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 text-xs rounded bg-[var(--background)] text-[var(--muted-foreground)]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                      {subtopics.length > 0 && (
                        <ul className="mt-2 ml-4 space-y-1">
                          {subtopics.map((sub) => (
                            <li key={sub.id} className="text-xs text-[var(--muted-foreground)]">
                              └ {sub.title}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                className="flex-1"
              >
                {t("editDescription")}
              </Button>
              <Button onClick={handleAccept} className="flex-1">
                <Check className="w-4 h-4 mr-2" />
                {t("useStructure")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
