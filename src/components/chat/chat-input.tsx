"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { formatFileSize } from "@/lib/files";

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
}

const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return "Type de fichier non supporté. Types acceptés: PNG, JPG, GIF, WebP, PDF";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Fichier trop volumineux. Taille maximale: 10 Mo";
    }
    // Check model capabilities
    if (file.type === "application/pdf" && !capabilities.pdf) {
      return "Ce modèle ne supporte pas les PDF. Utilisez Claude ou Gemini pour les PDF.";
    }
    if (file.type.startsWith("image/") && !capabilities.images) {
      return "Ce modèle ne supporte pas les images. Choisissez un autre modèle.";
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<FileAttachment | null> => {
    const formData = new FormData();
    formData.append("file", file);
    if (conversationId) {
      formData.append("conversationId", conversationId);
    }

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du téléchargement");
      }

      return await response.json();
    } catch (error) {
      console.error("Upload error:", error);
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
            `${file.name}: ${error instanceof Error ? error.message : "Erreur"}`
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
                  La limite sera réinitialisée automatiquement.
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
              ? "border-primary-500 bg-primary-50"
              : isRateLimited
                ? "border-red-300 bg-red-50"
                : "border-[var(--border)]"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary-50/90 rounded-xl z-10">
              <div className="flex flex-col items-center gap-2 text-primary-600">
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm font-medium">
                  Déposez vos fichiers ici
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
                  ? ALLOWED_TYPES.filter((t) => t !== "application/pdf").join(",")
                  : ""
            }
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />

          <div className="flex items-end">
            {/* File picker button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isLoading || uploading || isRateLimited || (!capabilities.images && !capabilities.pdf)}
              className={`m-1 ${!capabilities.images && !capabilities.pdf ? "opacity-40 cursor-not-allowed" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              title={
                !capabilities.images && !capabilities.pdf
                  ? "Ce modèle ne supporte pas les fichiers"
                  : capabilities.pdf
                    ? "Joindre un fichier (PNG, JPG, GIF, WebP, PDF)"
                    : "Joindre une image (PNG, JPG, GIF, WebP)"
              }
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isRateLimited
                  ? "Limite atteinte, veuillez patienter..."
                  : "Écrivez votre message ou déposez un fichier..."
              }
              rows={1}
              disabled={disabled || isLoading || isRateLimited}
              className="flex-1 resize-none bg-transparent py-3 pr-12 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <Button
              type="submit"
              size="sm"
              disabled={!hasContent || disabled || isLoading || isRateLimited}
              className="m-1"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[var(--muted-foreground)]">
            {capabilities.images && capabilities.pdf
              ? "Images et PDF supportés (max 10 Mo). Collez ou glissez-déposez."
              : capabilities.images
                ? "Images supportées (max 10 Mo). PDF non supporté par ce modèle."
                : "Ce modèle ne supporte pas les fichiers joints."}
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
