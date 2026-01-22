"use client";

import { useTranslations } from "next-intl";
import { X, Shield, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";

interface PrivacyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyInfoModal({ isOpen, onClose }: PrivacyInfoModalProps) {
  const t = useTranslations("chat.privacy");

  if (!isOpen) return null;

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
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h2 className="font-semibold">{t("title")}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Intro */}
          <p className="text-sm text-[var(--muted-foreground)]">{t("intro")}</p>

          {/* What trainers CAN see */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <Eye className="w-4 h-4" />
              <h3 className="font-medium text-sm">{t("whatTrainersSee")}</h3>
            </div>
            <ul className="space-y-1.5 ml-6">
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                {t("trainerCanSee1")}
              </li>
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                {t("trainerCanSee2")}
              </li>
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                {t("trainerCanSee3")}
              </li>
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-yellow-500 mt-1">•</span>
                {t("trainerCanSee4")}
              </li>
            </ul>
          </div>

          {/* What trainers CANNOT see */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <EyeOff className="w-4 h-4" />
              <h3 className="font-medium text-sm">{t("whatTrainersCantSee")}</h3>
            </div>
            <ul className="space-y-1.5 ml-6">
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {t("trainerCantSee1")}
              </li>
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {t("trainerCantSee2")}
              </li>
              <li className="text-sm text-[var(--muted-foreground)] flex items-start gap-2">
                <span className="text-green-500 mt-1">•</span>
                {t("trainerCantSee3")}
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="pt-4 border-t border-[var(--border)] space-y-2">
            <Link
              href="/legal/privacy"
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              {t("learnMore")}
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <Shield className="w-4 h-4" />
              {t("manageData")}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
