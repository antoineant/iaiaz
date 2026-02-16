"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { CostEstimate } from "./cost-estimate";
import { RateLimitIndicator } from "./rate-limit-indicator";
import type { ModelTier } from "@/lib/rate-limiter";
import type { FileAttachment } from "@/types";
import type { PricingData } from "@/lib/pricing-db";
import {
  Send,
  AlertTriangle,
  Paperclip,
  X,
  FileText,
  Loader2,
  Image as ImageIcon,
  Mic,
  MicOff,
} from "lucide-react";
import { formatFileSize, ALLOWED_TYPES, ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/files";
import { createAudioRecorder, type RecorderState } from "@/lib/audio/recorder";

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  tier: ModelTier;
  resetAt?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  model: string;
  balance: number;
  disabled?: boolean;
  isLoading?: boolean;
  rateLimit?: RateLimitInfo | null;
  rateLimitError?: string | null;
  conversationId?: string;
  pricingData: PricingData;
  accentColor?: string;
  mifaMode?: boolean;
}

export function ChatInput({
  onSend,
  model,
  balance,
  disabled,
  isLoading,
  rateLimit,
  rateLimitError,
  conversationId,
  pricingData,
  accentColor,
  mifaMode,
}: ChatInputProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [micState, setMicState] = useState<RecorderState | "transcribing">("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<ReturnType<typeof createAudioRecorder> | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Get capabilities from the model in pricing data
  const modelInfo = pricingData.models.find((m) => m.id === model);
  const capabilities = modelInfo?.capabilities || { images: false, pdf: false };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return t("errors.unsupportedFileType");
    }
    if (file.size > MAX_FILE_SIZE) {
      return t("errors.fileTooLarge");
    }
    // Check model capabilities
    const isDocument = !ALLOWED_IMAGE_TYPES.includes(file.type);
    if (isDocument && !capabilities.pdf) {
      return t("errors.pdfNotSupported");
    }
    if (!isDocument && !capabilities.images) {
      return t("errors.imageNotSupported");
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    try {
      // Step 1: Get signed upload URL from our API
      const signedUrlResponse = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          conversationId,
        }),
      });

      if (!signedUrlResponse.ok) {
        const data = await signedUrlResponse.json().catch(() => ({}));
        throw new Error(data.error || t("errors.uploadError"));
      }

      const { uploadUrl, token, path, fileId } = await signedUrlResponse.json();

      // Step 2: Upload directly to Supabase (bypasses Vercel 4.5MB limit)
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`${t("errors.uploadError")} (${uploadResponse.status})`);
      }

      // Step 3: Confirm upload and get download URL
      const confirmResponse = await fetch("/api/upload/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, storagePath: path }),
      });

      if (!confirmResponse.ok) {
        const data = await confirmResponse.json().catch(() => ({}));
        throw new Error(data.error || t("errors.uploadError"));
      }

      return await confirmResponse.json();
    } catch (error) {
      console.error("Upload error:", error, { fileName: file.name, fileSize: file.size, fileType: file.type });

      // Handle network errors more gracefully
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error(t("errors.uploadError") + " - Vérifiez votre connexion internet.");
      }

      throw error;
    }
  };

  const handleFileSelect = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return;

      setUploadError(null);
      setUploading(true);

      const fileArray = Array.from(files);
      const newAttachments: FileAttachment[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        // Validate before upload
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`);
          continue;
        }

        try {
          const attachment = await uploadFile(file);
          if (attachment) {
            newAttachments.push(attachment);
          }
        } catch (error) {
          errors.push(
            `${file.name}: ${error instanceof Error ? error.message : t("errors.genericError")}`
          );
        }
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }

      if (errors.length > 0) {
        setUploadError(errors.join("\n"));
      }

      setUploading(false);
    },
    [conversationId]
  );

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || disabled || isLoading)
      return;
    onSend(input.trim(), attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Paste handler for images
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  // Speech-to-text recording handler
  const handleMicClick = useCallback(async () => {
    if (micState === "recording") {
      // Stop recording and transcribe
      try {
        const recorder = recorderRef.current;
        if (!recorder) return;
        const audioBlob = await recorder.stop();
        setMicState("transcribing");
        setRecordingDuration(0);

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        formData.append("locale", locale);

        const response = await fetch("/api/audio/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Transcription failed");

        const { text } = await response.json();
        if (text) {
          onSend(text, attachments.length > 0 ? attachments : undefined);
          setInput("");
          setAttachments([]);
        }
      } catch (error) {
        console.error("Transcription error:", error);
        setUploadError(t("input.transcribeError"));
      } finally {
        setMicState("idle");
        recorderRef.current = null;
      }
    } else if (micState === "idle") {
      // Start recording
      try {
        const recorder = createAudioRecorder();
        recorderRef.current = recorder;
        recorder.onDurationChange(setRecordingDuration);
        await recorder.start();
        setMicState("recording");
      } catch {
        setUploadError(t("input.micPermissionDenied"));
        setMicState("idle");
        recorderRef.current = null;
      }
    }
  }, [micState, locale, t]);

  const isRateLimited = rateLimit?.remaining === 0;
  const hasContent = input.trim() || attachments.length > 0;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="max-w-3xl mx-auto p-4">
        {/* Rate limit error banner */}
        {rateLimitError && (
          <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{rateLimitError}</p>
              {rateLimit?.resetAt && (
                <p className="text-xs text-red-600 mt-1">
                  {t("errors.rateLimitReset")}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload error banner */}
        {uploadError && (
          <div className="mb-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-700 whitespace-pre-line">
                {uploadError}
              </p>
            </div>
            <button
              onClick={() => setUploadError(null)}
              className="text-yellow-500 hover:text-yellow-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group rounded-lg border border-[var(--border)] overflow-hidden"
              >
                {attachment.fileType === "image" ? (
                  <div className="w-20 h-20 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.url}
                      alt={attachment.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 flex flex-col items-center justify-center bg-[var(--muted)] p-2">
                    <FileText className="w-8 h-8 text-red-500" />
                    <span className="text-[10px] text-[var(--muted-foreground)] truncate w-full text-center mt-1">
                      {attachment.originalFilename.slice(0, 10)}...
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 py-0.5 truncate">
                  {formatFileSize(attachment.fileSize)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost estimate and rate limit indicator */}
        {hasContent && (
          <div className="mb-2 flex items-center justify-between gap-4">
            <CostEstimate
              model={model}
              inputText={input}
              balance={balance}
              pricingData={pricingData}
              simplified={mifaMode}
            />
            {rateLimit && (
              <RateLimitIndicator
                remaining={rateLimit.remaining}
                limit={rateLimit.limit}
                tier={rateLimit.tier}
                resetAt={rateLimit.resetAt}
              />
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={`relative rounded-xl border transition-colors ${
            isDragging
              ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30"
              : isRateLimited
                ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30"
                : "border-[var(--border)]"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-50/90 dark:bg-primary-950/90 rounded-xl z-10">
              <div className="flex flex-col items-center gap-2 text-primary-600 dark:text-primary-400">
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm font-medium">
                  {t("input.dropFiles")}
                </span>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={
              capabilities.images && capabilities.pdf
                ? ALLOWED_TYPES.join(",")
                : capabilities.images
                  ? ALLOWED_IMAGE_TYPES.join(",")
                  : ""
            }
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="flex items-center">
            {/* File picker button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading || uploading || isRateLimited || (!capabilities.images && !capabilities.pdf)}
              className={`mx-1 flex-shrink-0 ${!capabilities.images && !capabilities.pdf ? "opacity-40 cursor-not-allowed" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              title={
                !capabilities.images && !capabilities.pdf
                  ? t("input.noFileSupport")
                  : capabilities.pdf
                    ? t("input.attachFile")
                    : t("input.attachImage")
              }
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>

            {/* Mic button for speech-to-text */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleMicClick}
              disabled={disabled || isLoading || uploading || isRateLimited || micState === "transcribing" || micState === "stopping"}
              className={`flex-shrink-0 ${
                micState === "recording"
                  ? "text-red-500 hover:text-red-600 animate-pulse"
                  : micState === "transcribing"
                    ? "text-[var(--muted-foreground)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
              title={
                micState === "recording"
                  ? t("input.recording")
                  : micState === "transcribing"
                    ? t("input.transcribing")
                    : t("input.record")
              }
            >
              {micState === "transcribing" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : micState === "recording" ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </Button>
            {micState === "recording" && (
              <span className="text-xs text-red-500 font-mono mr-1">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
              </span>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isRateLimited
                  ? t("input.placeholderRateLimit")
                  : t("input.placeholder")
              }
              rows={1}
              disabled={disabled || isLoading || isRateLimited}
              className="flex-1 resize-none bg-transparent py-3 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <Button
              type="submit"
              size="sm"
              disabled={!hasContent || disabled || isLoading || isRateLimited}
              className="mx-1.5 flex-shrink-0"
              style={accentColor ? {
                backgroundColor: accentColor,
                borderColor: accentColor,
                color: "#fff",
              } : undefined}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            {capabilities.images && capabilities.pdf
              ? t("input.imagesPdfSupported")
              : capabilities.images
                ? t("input.imagesOnlySupported")
                : t("input.noFileSupport")}
          </p>
          {rateLimit && !hasContent && (
            <RateLimitIndicator
              remaining={rateLimit.remaining}
              limit={rateLimit.limit}
              tier={rateLimit.tier}
              resetAt={rateLimit.resetAt}
            />
          )}
        </div>
      </div>
    </div>
  );
}
