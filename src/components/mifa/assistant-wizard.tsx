"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { ACCENT_COLORS } from "@/lib/mifa/theme";
import type { CustomAssistant } from "@/types";

const AVATAR_OPTIONS = [
  "🤖", "🧙", "🦊", "🐙", "🚀", "🎯", "💡", "🧪",
  "📚", "🎮", "🌟", "🦉", "🐱", "🎵", "⚡", "🌈",
];

const PURPOSE_PRESETS = [
  { key: "homework", emoji: "📚", prompt: "Tu es un tuteur patient. Aide l'élève à comprendre étape par étape." },
  { key: "writing", emoji: "✍️", prompt: "Tu es un coach d'écriture. Aide à structurer les idées et améliorer le style." },
  { key: "science", emoji: "🔬", prompt: "Tu es un prof de sciences passionné. Explique avec des exemples concrets et des expériences." },
  { key: "languages", emoji: "🗣️", prompt: "Tu es un prof de langues bienveillant. Aide avec la grammaire, le vocabulaire et la conversation." },
];

interface AssistantWizardProps {
  onClose: () => void;
  onCreated: (assistant: CustomAssistant) => void;
}

export function AssistantWizard({ onClose, onCreated }: AssistantWizardProps) {
  const t = useTranslations("mifa.chat.wizard");
  const [step, setStep] = useState(1);
  const [avatar, setAvatar] = useState("🤖");
  const [name, setName] = useState("");
  const [color, setColor] = useState("blue");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim() || !systemPrompt.trim()) return;
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/mifa/assistants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatar,
          system_prompt: systemPrompt.trim(),
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }

      const { assistant } = await res.json();
      onCreated(assistant);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[var(--background)] rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--muted)] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex gap-1 px-4 pt-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[var(--accent-color,#3B82F6)]" : "bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          {/* Step 1: Avatar */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step1Title")}</h3>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAvatar(a)}
                    className={`text-2xl p-2 rounded-lg transition-all ${
                      avatar === a
                        ? "bg-[var(--muted)] ring-2 ring-[var(--accent-color,#3B82F6)] scale-110"
                        : "hover:bg-[var(--muted)]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Name + Color */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step2Title")}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("nameLabel")}</label>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{avatar}</span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={50}
                      placeholder={t("namePlaceholder")}
                      className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#3B82F6)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("colorLabel")}</label>
                  <div className="flex gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.name)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          color === c.name
                            ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!name.trim()}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Purpose / Prompt */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step3Title")}</h3>
              <div className="space-y-3 mb-4">
                {PURPOSE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setSystemPrompt(p.prompt)}
                    className={`w-full text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                      systemPrompt === p.prompt
                        ? "border-[var(--accent-color,#3B82F6)] bg-[var(--muted)]"
                        : "border-[var(--border)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <span className="text-sm">{t(`presets.${p.key}`)}</span>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t("customLabel")}</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={t("customPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#3B82F6)] text-sm resize-none"
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {systemPrompt.length}/2000
                </p>
              </div>
              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!systemPrompt.trim() || creating}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "..." : t("create")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
