"use client";

import { useTranslations } from "next-intl";
import { Users, Sparkles } from "lucide-react";

interface MifaParentWelcomeProps {
  orgName: string;
  onSendMessage: (message: string) => void;
}

export function MifaParentWelcome({
  orgName,
  onSendMessage,
}: MifaParentWelcomeProps) {
  const t = useTranslations("mifa.chat.parentWelcome");

  const suggestions = [
    t("suggestion1"),
    t("suggestion2"),
    t("suggestion3"),
    t("suggestion4"),
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-violet-600 dark:text-violet-400" />
      </div>
      <h1 className="text-2xl font-bold mb-1">
        {t("greeting")}
      </h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-1">
        {orgName}
      </p>
      <p className="text-[var(--muted-foreground)] max-w-md mb-6">
        {t("subtitle")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full mb-6">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onSendMessage(text)}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-[var(--border)] text-sm text-left hover:bg-[var(--muted)] transition-colors group"
          >
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-violet-500 dark:text-violet-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span>{text}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-[var(--muted-foreground)] opacity-60">
        {t("hint")}
      </p>
    </div>
  );
}
