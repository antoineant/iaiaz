"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Settings, Plus, MessageSquare, Download } from "lucide-react";
import type { CustomAssistant, Conversation } from "@/types";
import { AssistantCard } from "./assistant-card";
import { AssistantWizard } from "./assistant-wizard";
import { AssistantDetailModal } from "./assistant-detail-modal";
import { ThemePicker } from "./theme-picker";
import { getThemeColor } from "@/lib/mifa/theme";

interface MifaChatClientProps {
  userName: string;
  creditBalance: number;
  accentColor: string | null;
  assistants: CustomAssistant[];
  conversations: (Conversation & { assistant?: { avatar: string; name: string } | null })[];
  supervisionMode: string;
}

export function MifaChatClient({
  userName,
  creditBalance,
  accentColor,
  assistants: initialAssistants,
  conversations,
  supervisionMode,
}: MifaChatClientProps) {
  const t = useTranslations("mifa.chat");
  const router = useRouter();
  const [assistants, setAssistants] = useState(initialAssistants);
  const [showWizard, setShowWizard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentColor, setCurrentColor] = useState(accentColor);
  const [selectedAssistant, setSelectedAssistant] = useState<CustomAssistant | null>(null);
  const [showAdoptInput, setShowAdoptInput] = useState(false);
  const [adoptCode, setAdoptCode] = useState("");
  const [adoptError, setAdoptError] = useState("");
  const [adopting, setAdopting] = useState(false);

  // Apply accent color on mount
  const theme = getThemeColor(currentColor || "blue");

  const handleAssistantClick = (assistant: CustomAssistant) => {
    setSelectedAssistant(assistant);
  };

  const handleStartChat = (assistant: CustomAssistant) => {
    router.push(`/chat?assistantId=${assistant.id}`);
  };

  const handleAssistantCreated = (assistant: CustomAssistant) => {
    setAssistants((prev) => [...prev, assistant]);
    setShowWizard(false);
  };

  const handleAssistantUpdate = (updated: CustomAssistant) => {
    setAssistants((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setSelectedAssistant(updated);
  };

  const handleAssistantDelete = (id: string) => {
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    setSelectedAssistant(null);
  };

  const handleAdopt = async () => {
    if (!adoptCode.trim()) return;
    setAdopting(true);
    setAdoptError("");
    try {
      const res = await fetch("/api/mifa/assistants/adopt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_code: adoptCode.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAdoptError(data.error || "Erreur");
        return;
      }
      const { assistant } = await res.json();
      setAssistants((prev) => [...prev, assistant]);
      setAdoptCode("");
      setShowAdoptInput(false);
    } catch {
      setAdoptError("Erreur de connexion");
    } finally {
      setAdopting(false);
    }
  };

  const startFreeChat = () => {
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-[var(--background)] dark:to-primary-950">
      {/* Header */}
      <header
        className="p-4 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${theme?.hex || "#3B82F6"}, ${theme?.dark || "#1E3A5F"})`,
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {t("greeting", { name: userName })}
            </h1>
            <p className="text-white/80 text-sm">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credit Ring */}
            <div className="relative w-14 h-14">
              <svg className="transform -rotate-90 w-14 h-14" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" />
                <circle
                  cx="28" cy="28" r="24"
                  stroke="white" strokeWidth="3" fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(150, creditBalance * 30)} ${150}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-xs">{creditBalance.toFixed(1)}&euro;</span>
              </div>
            </div>
            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <Settings className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel (theme picker) */}
      {showSettings && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <h3 className="font-semibold mb-3">{t("settings")}</h3>
            <ThemePicker
              currentColor={currentColor}
              onSelect={(c) => setCurrentColor(c)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Mifas Section */}
        <h2 className="text-lg font-semibold mb-4">{t("myMifas")}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {assistants.map((assistant) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onClick={() => handleAssistantClick(assistant)}
            />
          ))}
          {/* Create new mifa button */}
          <button
            onClick={() => setShowWizard(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border)] transition-all hover:border-[var(--accent-color,#3B82F6)] hover:bg-[var(--muted)] text-center group"
          >
            <Plus className="w-8 h-8 text-[var(--muted-foreground)] group-hover:text-[var(--accent-color,#3B82F6)] transition-colors" />
            <span className="text-sm font-medium text-[var(--muted-foreground)]">
              {t("createMifa")}
            </span>
          </button>
        </div>

        {/* Adopt button */}
        {!showAdoptInput ? (
          <button
            onClick={() => setShowAdoptInput(true)}
            className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-8"
          >
            <Download className="w-4 h-4" />
            {t("adoptMifa")}
          </button>
        ) : (
          <div className="flex gap-2 mb-8">
            <input
              type="text"
              value={adoptCode}
              onChange={(e) => setAdoptCode(e.target.value)}
              placeholder={t("adoptPlaceholder")}
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color,#3B82F6)] text-sm"
            />
            <button
              onClick={handleAdopt}
              disabled={adopting || !adoptCode.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--accent-color,#3B82F6)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {adopting ? "..." : t("adopt")}
            </button>
            <button
              onClick={() => { setShowAdoptInput(false); setAdoptCode(""); setAdoptError(""); }}
              className="px-3 py-2 rounded-lg text-sm hover:bg-[var(--muted)]"
            >
              {t("wizard.back")}
            </button>
            {adoptError && <p className="text-xs text-red-500 self-center">{adoptError}</p>}
          </div>
        )}

        {/* Free Chat Button */}
        <button
          onClick={startFreeChat}
          className="w-full p-5 rounded-2xl text-white text-center transition-all shadow-lg hover:shadow-xl hover:opacity-90 mb-8"
          style={{
            background: `linear-gradient(135deg, ${theme?.hex || "#3B82F6"}, ${theme?.dark || "#1E3A5F"})`,
          }}
        >
          <p className="text-xl font-bold mb-1">{t("startConversation")}</p>
          <p className="text-white/80 text-sm">{t("startDesc")}</p>
        </button>

        {/* Recent Conversations */}
        {conversations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">{t("recentConversations")}</h2>
            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => router.push(`/chat?conversationId=${conv.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)] transition-colors text-left"
                >
                  <span className="text-lg">
                    {conv.assistant?.avatar || <MessageSquare className="w-5 h-5 text-[var(--muted-foreground)]" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title || "Conversation"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(conv.updated_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <p className="text-center text-[var(--muted-foreground)] text-sm">
            {t("noConversationsYet")}
          </p>
        )}

        {/* Supervision Mode Badge */}
        <div className="mt-8 text-center">
          <span className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
            supervisionMode === "guided"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          }`}>
            {supervisionMode === "guided" ? t("guidedBadge") : t("trustedBadge")}
          </span>
        </div>
      </div>

      {/* Assistant Wizard Modal */}
      {showWizard && (
        <AssistantWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleAssistantCreated}
        />
      )}

      {/* Assistant Detail Modal */}
      {selectedAssistant && (
        <AssistantDetailModal
          assistant={selectedAssistant}
          onClose={() => setSelectedAssistant(null)}
          onStartChat={handleStartChat}
          onUpdate={handleAssistantUpdate}
          onDelete={handleAssistantDelete}
        />
      )}
    </div>
  );
}
