"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { CustomAssistant } from "@/types";
import { getThemeColor, ACCENT_COLORS } from "@/lib/mifa/theme";
import { MifaAvatar } from "./mifa-avatar";
import { AssistantWizard } from "./assistant-wizard";

interface MifaWelcomeProps {
  userName: string;
  assistants: CustomAssistant[];
  accentColor: string | null;
  onSelectAssistant: (assistant: CustomAssistant) => void;
  onAssistantCreated: (assistant: CustomAssistant) => void;
}

export function MifaWelcome({
  userName,
  assistants,
  accentColor,
  onSelectAssistant,
  onAssistantCreated,
}: MifaWelcomeProps) {
  const t = useTranslations("mifa.chat.welcome");
  const [showWizard, setShowWizard] = useState(false);

  const theme = getThemeColor(accentColor || "blue");
  const accentHex = theme?.hex || "#3B82F6";
  const accentLight = theme?.light || "#DBEAFE";
  const accentDark = theme?.dark || "#1E3A5F";

  // Build a conic gradient from all accent colors for the color wheel
  const wheelColors = ACCENT_COLORS.map((c) => c.hex).join(", ");

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* === Background layer: animated gradient blobs === */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Main blob — drifts slowly */}
        <div
          className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full blur-[130px]"
          style={{
            background: `radial-gradient(circle, ${accentHex}, transparent 65%)`,
            opacity: 0.3,
            animation: "blob-drift-1 12s ease-in-out infinite",
          }}
        />
        {/* Secondary blob — counter-drift */}
        <div
          className="absolute w-[350px] h-[350px] sm:w-[500px] sm:h-[500px] rounded-full blur-[100px]"
          style={{
            background: `radial-gradient(circle, ${accentHex}, transparent 60%)`,
            opacity: 0.2,
            animation: "blob-drift-2 15s ease-in-out infinite",
          }}
        />
        {/* Third blob — warm accent for depth */}
        <div
          className="absolute w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full blur-[90px]"
          style={{
            background: `radial-gradient(circle, ${accentLight}, transparent 60%)`,
            opacity: 0.25,
            animation: "blob-drift-3 18s ease-in-out infinite",
          }}
        />

        {/* Decorative color wheel — spins slowly in the corner */}
        <div
          className="absolute -bottom-16 -right-16 w-48 h-48 sm:w-64 sm:h-64 rounded-full opacity-[0.12] blur-[2px]"
          style={{
            background: `conic-gradient(${wheelColors}, ${ACCENT_COLORS[0].hex})`,
            animation: "color-wheel-spin 30s linear infinite",
          }}
        />
      </div>

      {/* === Content === */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Greeting with shimmer */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold mb-2 bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(90deg, ${accentDark}, ${accentHex}, ${accentDark})`,
              backgroundSize: "200% 100%",
              animation: "shimmer-text 4s ease-in-out infinite",
              WebkitBackgroundClip: "text",
            }}
          >
            {t("greeting", { name: userName })}
          </h1>
          <p className="text-lg text-[var(--muted-foreground)]">
            {t("subtitle")}
          </p>
        </div>

        {/* Assistant cards grid — vivid tinted glass with floating animation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {assistants.map((assistant, index) => {
            const assistantTheme = getThemeColor(assistant.color);
            const cardHex = assistantTheme?.hex || accentHex;
            const cardLight = assistantTheme?.light || accentLight;
            const cardDark = assistantTheme?.dark || accentDark;

            return (
              <button
                key={assistant.id}
                onClick={() => onSelectAssistant(assistant)}
                className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl
                  backdrop-blur-md overflow-hidden
                  border border-white/40 dark:border-white/15
                  shadow-md
                  hover:shadow-xl hover:scale-[1.05]
                  active:scale-[0.97]
                  transition-all duration-300 ease-out text-center"
                style={{
                  background: `linear-gradient(145deg, ${cardLight}, ${cardLight}80)`,
                  borderColor: `${cardHex}50`,
                  animationDelay: `${index * 100}ms`,
                  animation: `card-float ${3 + (index % 3) * 0.5}s ease-in-out infinite, card-fade-in 0.5s ease-out ${index * 80}ms both`,
                }}
              >
                {/* Inner glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at 50% 30%, ${cardHex}30, transparent 70%)`,
                  }}
                />
                {/* Accent border glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    boxShadow: `inset 0 0 0 1.5px ${cardHex}60, 0 0 20px ${cardHex}25`,
                  }}
                />
                <span className="relative transition-transform duration-300 group-hover:scale-110 group-hover:drop-shadow-lg"
                  style={{ animation: `emoji-bounce ${4 + (index % 4) * 0.3}s ease-in-out infinite` }}
                >
                  <MifaAvatar avatar={assistant.avatar} avatarType={assistant.avatar_type} size={48} />
                </span>
                <span className="relative text-sm font-semibold truncate w-full" style={{ color: cardDark }}>
                  {assistant.name}
                </span>
              </button>
            );
          })}

          {/* Create new assistant */}
          <button
            onClick={() => setShowWizard(true)}
            className="group flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl
              backdrop-blur-md
              border-2 border-dashed
              hover:scale-[1.05] active:scale-[0.97]
              transition-all duration-300 ease-out text-center"
            style={{
              borderColor: `${accentHex}30`,
              background: `linear-gradient(145deg, ${accentLight}40, transparent)`,
              animation: `card-fade-in 0.5s ease-out ${assistants.length * 80}ms both`,
            }}
          >
            <Plus
              className="w-8 h-8 transition-all duration-300 group-hover:scale-110"
              style={{ color: `${accentHex}80` }}
            />
            <span className="text-sm font-semibold" style={{ color: `${accentHex}90` }}>
              {t("createNew")}
            </span>
          </button>
        </div>

        {/* Start typing hint */}
        <p className="text-center text-sm text-[var(--muted-foreground)] opacity-60">
          {t("startTyping")}
        </p>
      </div>

      {/* Assistant Wizard Modal */}
      {showWizard && (
        <AssistantWizard
          onClose={() => setShowWizard(false)}
          onCreated={(assistant) => {
            onAssistantCreated(assistant);
            setShowWizard(false);
          }}
        />
      )}

      {/* === Keyframe animations === */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Blob drifting — moves around the viewport */
        @keyframes blob-drift-1 {
          0%, 100% { top: 35%; left: 40%; transform: scale(1); }
          25% { top: 25%; left: 55%; transform: scale(1.1); }
          50% { top: 45%; left: 50%; transform: scale(0.95); }
          75% { top: 30%; left: 35%; transform: scale(1.05); }
        }
        @keyframes blob-drift-2 {
          0%, 100% { top: 15%; right: 20%; transform: scale(1); }
          33% { top: 55%; right: 30%; transform: scale(1.15); }
          66% { top: 25%; right: 10%; transform: scale(0.9); }
        }
        @keyframes blob-drift-3 {
          0%, 100% { bottom: 20%; left: 15%; transform: scale(1); }
          50% { bottom: 35%; left: 30%; transform: scale(1.1); }
        }

        /* Color wheel slow rotation */
        @keyframes color-wheel-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Shimmer text gradient sweep */
        @keyframes shimmer-text {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        /* Cards float gently */
        @keyframes card-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }

        /* Cards fade in on mount */
        @keyframes card-fade-in {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Emoji gentle bounce */
        @keyframes emoji-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-2deg); }
          75% { transform: translateY(1px) rotate(1deg); }
        }
      `}} />
    </div>
  );
}
