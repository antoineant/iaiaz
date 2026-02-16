"use client";

import { useEffect, useState } from "react";
import type { CustomAssistant } from "@/types";
import { MifaAvatar } from "./mifa-avatar";
import { getThemeColor } from "@/lib/mifa/theme";
import { getLevel } from "@/lib/mifa/xp-levels";
import { useTranslations } from "next-intl";

interface AssistantCardProps {
  assistant: CustomAssistant;
  onClick: () => void;
}

export function AssistantCard({ assistant, onClick }: AssistantCardProps) {
  const t = useTranslations("mifa.chat.levels");
  const theme = getThemeColor(assistant.color);
  const hex = theme.hex;
  const light = theme.light;
  const dark = theme.dark;

  const [xpData, setXpData] = useState<{ xp: number; level: string } | null>(null);

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

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-lg text-center group relative overflow-hidden"
      style={{
        borderColor: hex,
        background: `linear-gradient(135deg, ${light}, white)`,
      }}
    >
      {/* Level badge */}
      <span
        className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
        style={{ backgroundColor: hex }}
      >
        {t(level.name)}
      </span>

      <MifaAvatar
        avatar={assistant.avatar}
        avatarType={assistant.avatar_type}
        size={48}
        className="group-hover:scale-110 transition-transform"
      />
      <span className="text-sm font-medium truncate w-full">{assistant.name}</span>

      {/* XP mini-bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${hex}20` }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.max(5, Math.round(xpProgress * 100))}%`, backgroundColor: hex }}
        />
      </div>
    </button>
  );
}
