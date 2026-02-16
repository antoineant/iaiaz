"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, MessageSquare, Share2, Trash2, Copy, Check } from "lucide-react";
import type { AssistantGauges, CustomAssistant } from "@/types";
import { GaugeGroup } from "./gauge-slider";
import { MifaAvatar } from "./mifa-avatar";
import { getThemeColor } from "@/lib/mifa/theme";
import { getLevel, XP_LEVELS } from "@/lib/mifa/xp-levels";

interface AssistantDetailModalProps {
  assistant: CustomAssistant;
  onClose: () => void;
  onStartChat: (assistant: CustomAssistant) => void;
  onUpdate: (assistant: CustomAssistant) => void;
  onDelete: (id: string) => void;
}

export function AssistantDetailModal({
  assistant,
  onClose,
  onStartChat,
  onUpdate,
  onDelete,
}: AssistantDetailModalProps) {
  const t = useTranslations("mifa.chat");
  const tg = useTranslations("mifa.chat.gauges");
  const tl = useTranslations("mifa.chat.levels");
  const theme = getThemeColor(assistant.color);
  const hex = theme?.hex || "#818CF8";
  const dark = theme?.dark || "#3730A3";

  const [gauges, setGauges] = useState<AssistantGauges>(assistant.gauges);
  const [xpData, setXpData] = useState<{ xp: number; level: string; conversationCount: number } | null>(null);
  const [shareCode, setShareCode] = useState(assistant.share_code);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasChanges = JSON.stringify(gauges) !== JSON.stringify(assistant.gauges);

  // Fetch XP data
  useEffect(() => {
    fetch(`/api/mifa/assistants/${assistant.id}/xp`)
      .then((r) => r.json())
      .then(setXpData)
      .catch(() => {});
  }, [assistant.id]);

  const level = xpData ? getLevel(xpData.xp) : getLevel(0);
  const xpProgress = level.nextMinXp
    ? ((xpData?.xp || 0) - level.minXp) / (level.nextMinXp - level.minXp)
    : 1;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/mifa/assistants/${assistant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gauges }),
      });
      if (res.ok) {
        const { assistant: updated } = await res.json();
        onUpdate(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateShare = async () => {
    const res = await fetch(`/api/mifa/assistants/${assistant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ share_code: "generate" }),
    });
    if (res.ok) {
      const { assistant: updated } = await res.json();
      setShareCode(updated.share_code);
      onUpdate(updated);
    }
  };

  const handleCopyCode = () => {
    if (shareCode) {
      navigator.clipboard.writeText(`MIFA-${shareCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/mifa/assistants/${assistant.id}`, { method: "DELETE" });
    if (res.ok) {
      onDelete(assistant.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-[var(--background)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="relative p-6 rounded-t-2xl text-center"
          style={{ background: `linear-gradient(135deg, ${hex}, ${dark})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col items-center gap-2">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
              <MifaAvatar avatar={assistant.avatar} avatarType={assistant.avatar_type} size={64} />
            </div>
            <h2 className="text-xl font-bold text-white">{assistant.name}</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-white/20 text-white font-medium">
              {tl(level.name)}
            </span>
          </div>

          {/* XP Bar */}
          <div className="mt-4">
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-white/80 transition-all"
                style={{ width: `${Math.round(xpProgress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1">
              {xpData?.xp || 0} XP — {tl(level.name)}
              {level.nextMinXp && ` (${level.nextMinXp} XP ${tl("next")})`}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Gauges */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{t("gaugesTitle")}</h3>
            <GaugeGroup gauges={gauges} onChange={setGauges} color={assistant.color} />
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-3 w-full py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: hex }}
              >
                {saving ? "..." : t("saveGauges")}
              </button>
            )}
          </div>

          {/* System prompt (read-only preview) */}
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("wizard.customLabel")}</h3>
            <p className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg p-3 max-h-24 overflow-y-auto">
              {assistant.system_prompt}
            </p>
          </div>

          {/* Share section */}
          <div>
            <h3 className="text-sm font-semibold mb-2">{t("share")}</h3>
            {shareCode ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-[var(--muted)] rounded-lg px-3 py-2 font-mono">
                  MIFA-{shareCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)]"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateShare}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-[var(--border)] hover:bg-[var(--muted)]"
              >
                <Share2 className="w-4 h-4" />
                {t("generateCode")}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onStartChat(assistant)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium hover:opacity-90"
              style={{ backgroundColor: hex }}
            >
              <MessageSquare className="w-4 h-4" />
              {t("startChat")}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
              <p className="text-sm text-red-700 dark:text-red-400 mb-3">{t("deleteConfirm")}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-sm border border-[var(--border)] hover:bg-[var(--muted)]"
                >
                  {t("wizard.back")}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600"
                >
                  {t("confirmDelete")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
