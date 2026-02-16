"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { X, Sparkles, RefreshCw } from "lucide-react";
import { ACCENT_COLORS } from "@/lib/mifa/theme";
import { DEFAULT_GAUGES } from "@/lib/mifa/xp-levels";
import { GaugeGroup } from "./gauge-slider";
import type { AssistantGauges, CustomAssistant } from "@/types";

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
  const [name, setName] = useState("");
  const [color, setColor] = useState("cobalt");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [gauges, setGauges] = useState<AssistantGauges>({ ...DEFAULT_GAUGES });
  const [avatar, setAvatar] = useState("🤖");
  const [avatarMode, setAvatarMode] = useState<"emoji" | "generated">("emoji");
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const totalSteps = 4;

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/mifa/assistants/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          purpose: systemPrompt.trim().slice(0, 200),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }
      const { imageUrl } = await res.json();
      setGeneratedAvatarUrl(imageUrl);
      setAvatarMode("generated");
    } catch {
      setError("Erreur de connexion");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !systemPrompt.trim()) return;
    setCreating(true);
    setError("");

    const isGenerated = avatarMode === "generated" && generatedAvatarUrl;

    try {
      const res = await fetch("/api/mifa/assistants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          avatar: isGenerated ? generatedAvatarUrl : avatar,
          avatar_type: isGenerated ? "generated" : "emoji",
          system_prompt: systemPrompt.trim(),
          color,
          gauges,
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
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[var(--accent-color,#3B82F6)]" : "bg-[var(--muted)]"
              }`}
            />
          ))}
        </div>

        <div className="p-4">
          {/* Step 1: Name + Color */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step1Title")}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">{t("nameLabel")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={50}
                    placeholder={t("namePlaceholder")}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#3B82F6)]"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">{t("colorLabel")}</label>
                  <div className="flex flex-wrap gap-3">
                    {ACCENT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setColor(c.name)}
                        className="flex flex-col items-center gap-0.5"
                      >
                        <div
                          className={`w-8 h-8 rounded-full transition-all ${
                            color === c.name
                              ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110"
                              : "hover:scale-105"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                        <span className="text-[10px] text-[var(--muted-foreground)]">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={!name.trim()}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Purpose / Prompt */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step2Title")}</h3>
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
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!systemPrompt.trim()}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Gauges */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold mb-2">{t("step3Title")}</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">{t("step3Desc")}</p>
              <GaugeGroup gauges={gauges} onChange={setGauges} color={color} />
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white font-medium hover:opacity-90"
                >
                  {t("next")}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Avatar */}
          {step === 4 && (
            <div>
              <h3 className="font-semibold mb-4">{t("step4Title")}</h3>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAvatarMode("emoji")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    avatarMode === "emoji"
                      ? "bg-[var(--accent-color,#3B82F6)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80"
                  }`}
                >
                  {t("avatarEmoji")}
                </button>
                <button
                  onClick={() => setAvatarMode("generated")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    avatarMode === "generated"
                      ? "bg-[var(--accent-color,#3B82F6)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {t("avatarGenerate")}
                </button>
              </div>

              {/* Emoji mode */}
              {avatarMode === "emoji" && (
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
              )}

              {/* Generated mode */}
              {avatarMode === "generated" && (
                <div className="flex flex-col items-center gap-4">
                  {generatedAvatarUrl ? (
                    <>
                      <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--accent-color,#3B82F6)]">
                        <Image
                          src={generatedAvatarUrl}
                          alt="Generated avatar"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
                        {generating ? t("generating") : t("regenerate")}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full py-8 rounded-xl border-2 border-dashed border-[var(--muted-foreground)]/30 hover:border-[var(--accent-color,#3B82F6)] transition-all flex flex-col items-center gap-3 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <RefreshCw className="w-8 h-8 text-[var(--accent-color,#3B82F6)] animate-spin" />
                          <span className="text-sm text-[var(--muted-foreground)]">{t("generating")}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-8 h-8 text-[var(--accent-color,#3B82F6)]" />
                          <span className="text-sm font-medium">{t("avatarGenerate")}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 mt-2">{error}</p>
              )}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
                >
                  {t("back")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || (avatarMode === "generated" && !generatedAvatarUrl)}
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
