"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn, formatCurrency } from "@/lib/utils";
import {
  Video,
  Wand2,
  Loader2,
  Download,
  ExternalLink,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  X,
  ImagePlus,
  Trash2,
  HelpCircle,
  Play,
  Clock,
} from "lucide-react";

interface VideoModel {
  id: string;
  name: string;
  provider: string;
  description: string | null;
  price_per_second: number;
  price_per_second_premium: number | null;
  resolutions: string[];
  max_duration_seconds: number;
  default_duration_seconds: number;
  supports_audio: boolean;
  supports_reference_image: boolean;
  supports_reference_video: boolean;
  max_prompt_length: number;
  is_recommended: boolean;
}

interface Generation {
  id: string;
  prompt: string;
  duration_seconds: number;
  resolution: string;
  quality: string;
  video_url: string | null;
  thumbnail_url: string | null;
  reference_image_url: string | null;
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

interface VideoStudioClientProps {
  initialBalance: number;
  initialModels: VideoModel[];
  initialGenerations: Generation[];
  markupPercentage: number;
  isStudent?: boolean;
  className?: string;
}

export function VideoStudioClient({
  initialBalance,
  initialModels,
  initialGenerations,
  markupPercentage,
  isStudent = false,
}: VideoStudioClientProps) {
  const t = useTranslations("videoStudio");
  const [models] = useState<VideoModel[]>(initialModels);
  const [generations, setGenerations] = useState<Generation[]>(initialGenerations);
  const [balance, setBalance] = useState(initialBalance);

  // Form state
  const [selectedModel, setSelectedModel] = useState<string>(
    models.find((m) => m.is_recommended)?.id || models[0]?.id || "sora-2"
  );
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState("720p");
  const [quality, setQuality] = useState("standard");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPromptTips, setShowPromptTips] = useState(false);

  // Reference image state
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video playback state
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Get current model info
  const currentModel = models.find((m) => m.id === selectedModel);

  // Calculate estimated cost with markup
  const markupMultiplier = 1 + markupPercentage / 100;
  const pricePerSecond =
    quality === "premium" && currentModel?.price_per_second_premium
      ? currentModel.price_per_second_premium
      : currentModel?.price_per_second || 0.10;
  const estimatedCost = pricePerSecond * duration * markupMultiplier;

  // Update resolution/quality when model changes
  useEffect(() => {
    if (currentModel) {
      if (!currentModel.resolutions.includes(resolution)) {
        setResolution(currentModel.resolutions[0] || "720p");
      }
      if (duration > currentModel.max_duration_seconds) {
        setDuration(currentModel.max_duration_seconds);
      }
      // Clear reference image if model doesn't support it
      if (!currentModel.supports_reference_image && referenceImage) {
        setReferenceImage(null);
        setReferencePreview(null);
      }
    }
  }, [selectedModel, currentModel, resolution, duration, referenceImage]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError(t("errors.invalidFileType"));
        return;
      }
      // Validate file size (max 4MB)
      if (file.size > 4 * 1024 * 1024) {
        setError(t("errors.fileTooLarge"));
        return;
      }

      setReferenceImage(file);
      setError(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setReferencePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear reference image
  const clearReferenceImage = () => {
    setReferenceImage(null);
    setReferencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) return;

    setIsGenerating(true);
    setError(null);

    try {
      let response: Response;

      if (referenceImage) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append("model", selectedModel);
        formData.append("prompt", prompt.trim());
        formData.append("duration", duration.toString());
        formData.append("resolution", resolution);
        formData.append("quality", quality);
        formData.append("referenceImage", referenceImage);

        response = await fetch("/api/create/videos", {
          method: "POST",
          body: formData,
        });
      } else {
        // Use JSON for text-only
        response = await fetch("/api/create/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            prompt: prompt.trim(),
            duration,
            resolution,
            quality,
          }),
        });
      }

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
        duration_seconds: duration,
        resolution,
        quality,
        video_url: data.video_url,
        thumbnail_url: data.thumbnail_url,
        reference_image_url: referencePreview,
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
      clearReferenceImage();
    } catch (err) {
      console.error("Generation error:", err);
      setError(t("errors.generationFailed"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (videoUrl: string, prompt: string) => {
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prompt.slice(0, 30).replace(/[^a-z0-9]/gi, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleDelete = async (generationId: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    setDeletingId(generationId);
    try {
      const response = await fetch(`/api/create/videos/${generationId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGenerations((prev) => prev.filter((g) => g.id !== generationId));
      } else {
        const data = await response.json();
        setError(data.error || t("errors.deleteFailed"));
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(t("errors.deleteFailed"));
    } finally {
      setDeletingId(null);
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
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                <Video className="w-5 h-5" />
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
        {/* Student Warning Banner */}
        {isStudent && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{t("studentWarning.title")}</p>
              <p className="mt-1 text-amber-600 dark:text-amber-500">
                {t("studentWarning.description")}
              </p>
              <Link
                href="/profile?tab=credits"
                className="inline-flex items-center gap-1 mt-2 text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                {t("studentWarning.topUp")}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

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

              {/* Reference Image Upload */}
              {currentModel?.supports_reference_image && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("referenceImage")}
                    <span className="text-[var(--muted-foreground)] font-normal ml-1">
                      ({t("optional")})
                    </span>
                  </label>

                  {referencePreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={referencePreview}
                        alt="Reference"
                        className="w-full h-32 object-cover rounded-lg border border-[var(--border)]"
                      />
                      <button
                        onClick={clearReferenceImage}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        title={t("removeReference")}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-4 border-2 border-dashed border-[var(--border)] rounded-lg hover:border-primary-500 hover:bg-primary-500/5 transition-colors flex flex-col items-center gap-2"
                    >
                      <ImagePlus className="w-6 h-6 text-[var(--muted-foreground)]" />
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {t("uploadReference")}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {t("referenceHint")}
                      </span>
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Prompt */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    {t("prompt")}
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPromptTips(!showPromptTips)}
                      className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      title={t("promptTips.title")}
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    {showPromptTips && (
                      <div className="absolute right-0 top-8 z-50 w-72 p-4 rounded-lg bg-[var(--card)] border border-[var(--border)] shadow-lg text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{t("promptTips.title")}</h4>
                          <button
                            onClick={() => setShowPromptTips(false)}
                            className="p-1 rounded hover:bg-[var(--muted)]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <ul className="space-y-2 text-xs text-[var(--muted-foreground)]">
                          <li className="flex gap-2">
                            <span className="text-primary-500">-</span>
                            {t("promptTips.tip1")}
                          </li>
                          <li className="flex gap-2">
                            <span className="text-primary-500">-</span>
                            {t("promptTips.tip2")}
                          </li>
                          <li className="flex gap-2">
                            <span className="text-primary-500">-</span>
                            {t("promptTips.tip3")}
                          </li>
                          <li className="flex gap-2">
                            <span className="text-primary-500">-</span>
                            {t("promptTips.tip4")}
                          </li>
                          <li className="flex gap-2">
                            <span className="text-primary-500">-</span>
                            {t("promptTips.tip5")}
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("promptPlaceholder")}
                  rows={4}
                  maxLength={currentModel?.max_prompt_length || 1000}
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] resize-none"
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {prompt.length}/{currentModel?.max_prompt_length || 1000}
                </p>
              </div>

              {/* Duration Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    {t("duration")}
                  </label>
                  <span className="text-sm font-medium flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {duration}s
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={currentModel?.max_duration_seconds || 10}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-2 bg-[var(--muted)] rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-[var(--muted-foreground)] mt-1">
                  <span>1s</span>
                  <span>{currentModel?.max_duration_seconds || 10}s</span>
                </div>
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("resolution")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(currentModel?.resolutions || ["720p"]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      className={cn(
                        "p-2 text-xs rounded-lg border transition-colors",
                        resolution === r
                          ? "border-primary-500 bg-primary-500/10 text-primary-600"
                          : "border-[var(--border)] hover:border-[var(--border)]/80"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality (Premium option) */}
              {currentModel?.price_per_second_premium && (
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
                      onClick={() => setQuality("premium")}
                      className={cn(
                        "p-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1",
                        quality === "premium"
                          ? "border-primary-500 bg-primary-500/10 text-primary-600"
                          : "border-[var(--border)] hover:border-[var(--border)]/80"
                      )}
                    >
                      <Sparkles className="w-3 h-3" />
                      {t("qualities.premium")}
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
                <div className="flex justify-between items-center mt-1 text-xs text-[var(--muted-foreground)]">
                  <span>{t("perSecond")}:</span>
                  <span>{formatCurrency(pricePerSecond * markupMultiplier)}</span>
                </div>
                {balance < estimatedCost && (
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-red-500">
                      {t("errors.insufficientCredits")}
                    </span>
                    <Link
                      href="/profile?tab=credits"
                      className="text-xs text-primary-600 hover:underline font-medium"
                    >
                      {t("topUp")}
                    </Link>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                  {error === t("errors.insufficientCredits") && (
                    <Link
                      href="/profile?tab=credits"
                      className="inline-flex items-center gap-1 mt-2 text-primary-600 hover:underline font-medium text-xs"
                    >
                      {t("topUp")}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
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
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600"
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
                <Video className="w-12 h-12 mx-auto text-[var(--muted-foreground)] mb-4" />
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
                    {gen.status === "completed" && gen.video_url ? (
                      <div className="relative group">
                        {playingId === gen.id ? (
                          <video
                            src={gen.video_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full aspect-video object-cover"
                            onEnded={() => setPlayingId(null)}
                          />
                        ) : gen.thumbnail_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={gen.thumbnail_url}
                              alt={gen.prompt}
                              className="w-full aspect-video object-cover"
                            />
                            <button
                              onClick={() => setPlayingId(gen.id)}
                              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                            >
                              <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-8 h-8 text-black ml-1" />
                              </div>
                            </button>
                          </>
                        ) : (
                          <video
                            src={gen.video_url}
                            className="w-full aspect-video object-cover"
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => {
                              e.currentTarget.pause();
                              e.currentTarget.currentTime = 0;
                            }}
                            muted
                            playsInline
                            loop
                          />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            onClick={() =>
                              handleDownload(gen.video_url!, gen.prompt)
                            }
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            title={t("download")}
                          >
                            <Download className="w-5 h-5 text-white" />
                          </button>
                          <a
                            href={gen.video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            title={t("openInNewTab")}
                          >
                            <ExternalLink className="w-5 h-5 text-white" />
                          </a>
                          <button
                            onClick={() => handleDelete(gen.id)}
                            disabled={deletingId === gen.id}
                            className="p-2 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors"
                            title={t("delete")}
                          >
                            {deletingId === gen.id ? (
                              <Loader2 className="w-5 h-5 text-white animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                        {/* Reference image indicator */}
                        {gen.reference_image_url && (
                          <div className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white" title={t("hasReference")}>
                            <ImagePlus className="w-4 h-4" />
                          </div>
                        )}
                        {/* Duration badge */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {gen.duration_seconds}s
                        </div>
                      </div>
                    ) : gen.status === "generating" ? (
                      <div className="w-full aspect-video bg-[var(--muted)] flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--muted-foreground)]" />
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {t("generatingVideo")}
                        </p>
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-red-50 dark:bg-red-900/20 flex items-center justify-center relative group">
                        <div className="text-center p-4">
                          <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {gen.error_message || t("errors.generationFailed")}
                          </p>
                        </div>
                        {/* Delete button for failed generations */}
                        <button
                          onClick={() => handleDelete(gen.id)}
                          disabled={deletingId === gen.id}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("delete")}
                        >
                          {deletingId === gen.id ? (
                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-white" />
                          )}
                        </button>
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
