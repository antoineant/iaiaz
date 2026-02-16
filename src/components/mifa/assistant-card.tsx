"use client";

import type { CustomAssistant } from "@/types";
import { getThemeColor } from "@/lib/mifa/theme";

interface AssistantCardProps {
  assistant: CustomAssistant;
  onClick: () => void;
}

export function AssistantCard({ assistant, onClick }: AssistantCardProps) {
  const theme = getThemeColor(assistant.color);
  const bgColor = theme?.light || "#DBEAFE";
  const borderColor = theme?.hex || "#3B82F6";

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-md text-center group"
      style={{
        borderColor,
        backgroundColor: `${bgColor}40`,
      }}
    >
      <span className="text-3xl group-hover:scale-110 transition-transform">
        {assistant.avatar}
      </span>
      <span className="text-sm font-medium truncate w-full">{assistant.name}</span>
    </button>
  );
}
