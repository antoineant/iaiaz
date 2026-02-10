"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, AlertTriangle, FileText, ArrowRight, Loader2, Sparkles } from "lucide-react";

interface ContextLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  onStartFresh: () => void;
  onContinueWithSummary: (summary: string) => void;
}

export function ContextLimitModal({
  isOpen,
  onClose,
  conversationId,
  onStartFresh,
  onContinueWithSummary,
}: ContextLimitModalProps) {
  const t = useTranslations("chat.contextLimit");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSummarizeAndContinue = async () => {
    if (!conversationId) {
      onStartFresh();
      return;
    }

    setIsSummarizing(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/summarize`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to summarize");
      }

      const { summary, originalTitle } = await response.json();

      // Create context message to carry over
      const contextMessage = `[Suite de la conversation "${originalTitle}"]\n\nRésumé de la discussion précédente:\n${summary}\n\n---\nNous pouvons maintenant continuer notre discussion.`;

      onContinueWithSummary(contextMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--background)] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">{t("title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
            disabled={isSummarizing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("description")}
          </p>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: Summarize and continue */}
            {conversationId && (
              <button
                onClick={handleSummarizeAndContinue}
                disabled={isSummarizing}
                className="w-full p-4 rounded-lg border border-[var(--border)] hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform">
                    {isSummarizing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium flex items-center gap-2">
                      {t("summarizeOption")}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                        {t("recommended")}
                      </span>
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mt-1">
                      {t("summarizeDescription")}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            )}

            {/* Option 2: Start fresh */}
            <button
              onClick={onStartFresh}
              disabled={isSummarizing}
              className="w-full p-4 rounded-lg border border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{t("freshOption")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {t("freshDescription")}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            disabled={isSummarizing}
            className="w-full py-2 px-4 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)] transition-colors text-sm"
          >
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
