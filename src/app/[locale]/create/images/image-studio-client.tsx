"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Image as ImageIcon,
  Wand2,
  Loader2,
  Download,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ImageModel {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  price_standard: number;
  price_hd: number | null;
  sizes: string[];
  styles: string[];
  supports_hd: boolean;
  max_prompt_length: number;
  is_recommended: boolean;
}

interface Generation {
  id: string;
  prompt: string;
  size: string;
  style: string;
  quality: string;
  image_url: string | null;
  revised_prompt: string | null;
  cost: number;
  status: string;
  error_message: string | null;
  created_at: string;
  model: {
    id: string;
    name: string;
    provider: string;
  };
}

interface ImageStudioClientProps {
  initialBalance: number;
  initialModels: ImageModel[];
  initialGenerations: Generation[];
  markupPercentage: number;
}

export function ImageStudioClient({
  initialBalance,
  initialModels,
  initialGenerations,
  markupPercentage,
}: ImageStudioClientProps) {
  const t = useTranslations("imageStudio");
  const [models] = useState<ImageModel[]>(initialModels);
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [balance, setBalance] = useState(initialBalance);

  // Form state
  const [selectedModel, setSelectedModel] = useState<string>(
    models.find((m) => m.is_recommended)?.id || models[0]?.id || "dall-e-3"
  );
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [style, setStyle] = useState("natural");
  const [quality, setQuality] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current model info
  const currentModel = models.find((m) => m.id === selectedModel);

  // Calculate estimated cost with markup
  const markupMultiplier = 1 + markupPercentage / 100;
  const estimatedCost =
    quality === "hd" && currentModel?.price_hd
      ? currentModel.price_hd * markupMultiplier
      : (currentModel?.price_standard || 0.04) * markupMultiplier;

  // Update size/style/quality when model changes
  useEffect(() => {
    if (currentModel) {
      if (!currentModel.sizes.includes(size)) {
        setSize(currentModel.sizes[0] || "1024x1024");
      }
      if (!currentModel.styles.includes(style)) {
        setStyle(currentModel.styles[0] || "natural");
      }
      if (!currentModel.supports_hd && quality === "hd") {
        setQuality("standard");
      }
    }
  }, [selectedModel, currentModel, size, style, quality]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/create/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          prompt: prompt.trim(),
          size,
          style,
          quality,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          setError(t("errors.insufficientCredits"));
        } else {
          setError(data.error || t("errors.generationFailed"));
        }
        return;
      }

      // Update balance
      if (data.remaining_balance !== undefined) {
        setBalance(data.remaining_balance);
      }

      // Add new generation to list
      const newGeneration: Generation = {
        id: data.generation_id,
        prompt: prompt.trim(),
        size,
        style,
        quality,
        image_url: data.image_url,
        revised_prompt: data.revised_prompt,
        cost: data.cost,
        status: "completed",
        error_message: null,
        created_at: new Date().toISOString(),
        model: {
          id: selectedModel,
          name: currentModel?.name || selectedModel,
          provider: currentModel?.provider || "openai",
        },
      };

      setGenerations((prev) => [newGeneration, ...prev]);
      setPrompt("");
    } catch (err) {
      console.error("Generation error:", err);
      setError(t("errors.generationFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
              title={t("backToChat")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-semibold">{t("title")}</h1>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("subtitle")}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted-foreground)]">{t("balance")}:</span>
            <span className="font-medium">{formatCurrency(balance)}</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Generation Form */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6 space-y-6 sticky top-6">
              {/* Model Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("model")}
                </label>
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-3 pr-10 rounded-lg border border-[var(--border)] bg-[var(--background)] appearance-none cursor-pointer"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                        {model.is_recommended ? ` (${t("recommended")})` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
                </div>
                {currentModel?.description && (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {currentModel.description}
                  </p>
                )}
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("prompt")}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("promptPlaceholder")}
                  rows={4}
                  maxLength={currentModel?.max_prompt_length || 4000}
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] resize-none"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {prompt.length}/{currentModel?.max_prompt_length || 4000}
                </p>
              </div>

              {/* Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("size")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(currentModel?.sizes || ["1024x1024"]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={cn(
                        "p-2 text-xs rounded-lg border transition-colors",
                        size === s
                          ? "border-primary-500 bg-primary-500/10 text-primary-600"
                          : "border-[var(--border)] hover:border-[var(--border)]/80"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style (DALL-E 3 only) */}
              {currentModel?.styles && currentModel.styles.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("style")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {currentModel.styles.map((s) => (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={cn(
                          "p-2 text-sm rounded-lg border transition-colors",
                          style === s
                            ? "border-primary-500 bg-primary-500/10 text-primary-600"
                            : "border-[var(--border)] hover:border-[var(--border)]/80"
                        )}
                      >
                        {t(`styles.${s}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality (HD option) */}
              {currentModel?.supports_hd && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("quality")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setQuality("standard")}
                      className={cn(
                        "p-2 text-sm rounded-lg border transition-colors",
                        quality === "standard"
                          ? "border-primary-500 bg-primary-500/10 text-primary-600"
                          : "border-[var(--border)] hover:border-[var(--border)]/80"
                      )}
                    >
                      {t("qualities.standard")}
                    </button>
                    <button
                      onClick={() => setQuality("hd")}
                      className={cn(
                        "p-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1",
                        quality === "hd"
                          ? "border-primary-500 bg-primary-500/10 text-primary-600"
                          : "border-[var(--border)] hover:border-[var(--border)]/80"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      {t("qualities.hd")}
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Estimate */}
              <div className="p-3 rounded-lg bg-[var(--muted)] text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--muted-foreground)]">
                    {t("estimatedCost")}:
                  </span>
                  <span className="font-medium">{formatCurrency(estimatedCost)}</span>
                </div>
                {balance < estimatedCost && (
                  <p className="mt-2 text-xs text-red-500">
                    {t("errors.insufficientCredits")}
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={
                  isGenerating ||
                  !prompt.trim() ||
                  balance < estimatedCost
                }
                className={cn(
                  "w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors",
                  isGenerating || !prompt.trim() || balance < estimatedCost
                    ? "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("generating")}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    {t("generate")}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Gallery */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">{t("gallery")}</h2>

            {generations.length === 0 ? (
              <div className="text-center py-16 bg-[var(--card)] rounded-xl border border-[var(--border)]">
                <ImageIcon className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
                <h3 className="font-medium mb-2">{t("emptyGallery.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("emptyGallery.description")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generations.map((gen) => (
                  <div
                    key={gen.id}
                    className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden"
                  >
                    {gen.status === "completed" && gen.image_url ? (
                      <div className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={gen.image_url}
                          alt={gen.prompt}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              handleDownload(gen.image_url!, gen.prompt)
                            }
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            title={t("download")}
                          >
                            <Download className="w-5 h-5 text-white" />
                          </button>
                          <a
                            href={gen.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            title={t("openInNewTab")}
                          >
                            <ExternalLink className="w-5 h-5 text-white" />
                          </a>
                        </div>
                      </div>
                    ) : gen.status === "generating" ? (
                      <div className="w-full aspect-square bg-[var(--muted)] flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
                      </div>
                    ) : (
                      <div className="w-full aspect-square bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                        <div className="text-center p-4">
                          <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {gen.error_message || t("errors.generationFailed")}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-sm line-clamp-2 mb-2">{gen.prompt}</p>
                      {gen.revised_prompt &&
                        gen.revised_prompt !== gen.prompt && (
                          <details className="text-xs text-[var(--muted-foreground)] mb-2">
                            <summary className="cursor-pointer hover:text-[var(--foreground)]">
                              {t("revisedPrompt")}
                            </summary>
                            <p className="mt-1 pl-2 border-l-2 border-[var(--border)]">
                              {gen.revised_prompt}
                            </p>
                          </details>
                        )}
                      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span>{gen.model.name}</span>
                        <span>{formatCurrency(gen.cost)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
