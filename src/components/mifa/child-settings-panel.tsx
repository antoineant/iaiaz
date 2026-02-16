"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { X, Pencil, Trash2, Plus, Check, ChevronUp, ChevronDown } from "lucide-react";
import { ACCENT_COLORS, type ThemeColor } from "@/lib/mifa/theme";
import { AssistantWizard } from "./assistant-wizard";
import type { CustomAssistant } from "@/types";
import { cn } from "@/lib/utils";

const AVATAR_OPTIONS = [
  "🤖", "🧙", "🦊", "🐙", "🚀", "🎯", "💡", "🧪",
  "📚", "🎮", "🌟", "🦉", "🐱", "🎵", "⚡", "🌈",
];

interface ChildSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  accentColor: string | null;
  onAccentColorChange: (color: string) => void;
  teenTheme: ThemeColor | undefined;
}

type Tab = "profile" | "assistants" | "activity";

interface Stats {
  conversations: number;
  subjects: { name: string; count: number }[];
  creditsUsed: number;
}

export function ChildSettingsPanel({
  open,
  onClose,
  accentColor,
  onAccentColorChange,
  teenTheme,
}: ChildSettingsPanelProps) {
  const t = useTranslations("mifa.childSettings");
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [avatar, setAvatar] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [selectedColor, setSelectedColor] = useState(accentColor || "blue");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Assistants state
  const [assistants, setAssistants] = useState<CustomAssistant[]>([]);
  const [assistantsLoaded, setAssistantsLoaded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Activity state
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!open || profileLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.profile?.display_name || "");
          setAvatar(data.profile?.avatar_url || "");
          setProfileLoaded(true);
        }
      } catch {}
    })();
  }, [open, profileLoaded]);

  // Load assistants
  const loadAssistants = useCallback(async () => {
    try {
      const res = await fetch("/api/mifa/assistants");
      if (res.ok) {
        const data = await res.json();
        setAssistants(data.assistants || []);
        setAssistantsLoaded(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!open || assistantsLoaded) return;
    loadAssistants();
  }, [open, assistantsLoaded, loadAssistants]);

  // Load stats
  useEffect(() => {
    if (!open || statsLoaded) return;
    (async () => {
      try {
        const res = await fetch("/api/mifa/my-stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
          setStatsLoaded(true);
        }
      } catch {}
    })();
  }, [open, statsLoaded]);

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Save display name + avatar
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          avatar_url: avatar,
        }),
      });

      // Save accent color if changed
      if (selectedColor !== accentColor) {
        onAccentColorChange(selectedColor);
        document.documentElement.style.setProperty("--accent-color", ACCENT_COLORS.find(c => c.name === selectedColor)?.hex || "#3B82F6");
        document.documentElement.style.setProperty("--accent-light", ACCENT_COLORS.find(c => c.name === selectedColor)?.light || "#E0E7FF");
        document.documentElement.style.setProperty("--accent-dark", ACCENT_COLORS.find(c => c.name === selectedColor)?.dark || "#3730A3");
        await fetch("/api/mifa/theme", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: selectedColor }),
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  // Edit assistant
  const startEdit = (a: CustomAssistant) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditPrompt(a.system_prompt);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    try {
      const res = await fetch(`/api/mifa/assistants/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          system_prompt: editPrompt.trim(),
        }),
      });
      if (res.ok) {
        const { assistant } = await res.json();
        setAssistants((prev) => prev.map((a) => (a.id === editingId ? assistant : a)));
        setEditingId(null);
      }
    } catch {}
  };

  // Delete assistant
  const handleDelete = async (id: string) => {
    setDeletingId(null);
    try {
      const res = await fetch(`/api/mifa/assistants/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAssistants((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {}
  };

  // Reorder assistant
  const moveAssistant = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= assistants.length) return;
    const newList = [...assistants];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    setAssistants(newList);

    // Persist sort_order for both swapped items
    try {
      await Promise.all([
        fetch(`/api/mifa/assistants/${newList[index].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: index }),
        }),
        fetch(`/api/mifa/assistants/${newList[newIndex].id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sort_order: newIndex }),
        }),
      ]);
    } catch {}
  };

  if (!open) return null;

  const themeHex = teenTheme?.hex || "#3B82F6";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--background)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-[var(--border)]"
          style={{
            background: `linear-gradient(135deg, ${themeHex}15, transparent)`,
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: themeHex }}>
            {t("title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["profile", "assistants", "activity"] as Tab[]).map((t_key) => (
            <button
              key={t_key}
              onClick={() => setTab(t_key)}
              className={cn(
                "flex-1 py-3 text-sm font-medium transition-colors relative",
                tab === t_key
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {t(`tabs.${t_key}`)}
              {tab === t_key && (
                <div
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: themeHex }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ─── Profile Tab ─── */}
          {tab === "profile" && (
            <div className="space-y-6">
              {/* Avatar picker */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  {t("profile.avatar")}
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={cn(
                        "text-2xl p-2 rounded-lg transition-all",
                        avatar === a
                          ? "bg-[var(--muted)] ring-2 scale-110"
                          : "hover:bg-[var(--muted)]"
                      )}
                      style={avatar === a ? { "--tw-ring-color": themeHex } as React.CSSProperties : undefined}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display name */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {t("profile.displayName")}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 text-sm"
                  style={{ "--tw-ring-color": themeHex } as React.CSSProperties}
                />
              </div>

              {/* Accent color */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("profile.theme")}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all",
                        selectedColor === c.name
                          ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: c.hex }}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${themeHex}, ${teenTheme?.dark || "#1E3A5F"})`,
                }}
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t("saved")}
                  </>
                ) : (
                  t("save")
                )}
              </button>
            </div>
          )}

          {/* ─── Assistants Tab ─── */}
          {tab === "assistants" && (
            <div className="space-y-3">
              {assistants.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                  {t("assistants.empty")}
                </p>
              ) : (
                assistants.map((a, i) => (
                  <div
                    key={a.id}
                    className="border border-[var(--border)] rounded-xl p-3 space-y-2"
                  >
                    {editingId === a.id ? (
                      /* Inline edit mode */
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={50}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 text-sm"
                          style={{ "--tw-ring-color": themeHex } as React.CSSProperties}
                        />
                        <textarea
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          maxLength={2000}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 text-sm resize-none"
                          style={{ "--tw-ring-color": themeHex } as React.CSSProperties}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ backgroundColor: themeHex }}
                          >
                            {t("save")}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{a.avatar}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {a.name}
                              </span>
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    ACCENT_COLORS.find((c) => c.name === a.color)
                                      ?.hex || themeHex,
                                }}
                              />
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {a.system_prompt}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Reorder buttons */}
                            <button
                              onClick={() => moveAssistant(i, -1)}
                              disabled={i === 0}
                              className="p-1 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveAssistant(i, 1)}
                              disabled={i === assistants.length - 1}
                              className="p-1 rounded hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => startEdit(a)}
                              className="p-1.5 rounded hover:bg-[var(--muted)] transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {deletingId === a.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(a.id)}
                                  className="px-2 py-1 rounded text-xs font-medium text-white bg-red-500 hover:bg-red-600"
                                >
                                  {t("assistants.delete")}
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 rounded text-xs bg-[var(--muted)]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(a.id)}
                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}

              {/* Create button */}
              <button
                onClick={() => setShowWizard(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("assistants.create")}
              </button>
            </div>
          )}

          {/* ─── Activity Tab ─── */}
          {tab === "activity" && (
            <div className="space-y-6">
              {!stats || (stats.conversations === 0 && stats.creditsUsed === 0) ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                  {t("activity.noActivity")}
                </p>
              ) : (
                <>
                  {/* Weekly summary header */}
                  <p
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: themeHex }}
                  >
                    {t("activity.thisWeek")}
                  </p>

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: `${themeHex}10` }}
                    >
                      <div className="text-2xl font-bold" style={{ color: themeHex }}>
                        {stats.conversations}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        {t("activity.conversations")}
                      </div>
                    </div>
                    <div
                      className="rounded-xl p-4 text-center"
                      style={{ backgroundColor: `${themeHex}10` }}
                    >
                      <div className="text-2xl font-bold" style={{ color: themeHex }}>
                        {stats.creditsUsed.toFixed(2)}€
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        {t("activity.creditsUsed")}
                      </div>
                    </div>
                  </div>

                  {/* Subject breakdown */}
                  {stats.subjects.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-3">
                        {t("activity.topSubjects")}
                      </p>
                      <div className="space-y-2">
                        {stats.subjects.map((s) => {
                          const maxCount = stats.subjects[0].count;
                          const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0;
                          return (
                            <div key={s.name} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="capitalize">{s.name}</span>
                                <span className="text-[var(--muted-foreground)]">
                                  {s.count}
                                </span>
                              </div>
                              <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: themeHex,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assistant Wizard modal */}
      {showWizard && (
        <AssistantWizard
          onClose={() => setShowWizard(false)}
          onCreated={(assistant) => {
            setAssistants((prev) => [...prev, assistant]);
            setShowWizard(false);
          }}
        />
      )}
    </>
  );
}
