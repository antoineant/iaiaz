"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import type { DBModel } from "@/lib/pricing-db";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  models: DBModel[];
  markupMultiplier: number;
  externalOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ModelSelector({
  value,
  onChange,
  models,
  markupMultiplier,
  externalOpen,
  onOpenChange,
}: ModelSelectorProps) {
  const t = useTranslations("chat.modelSelector");
  const [internalOpen, setInternalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedModel = models.find((m) => m.id === value);

  // Use external open state if provided, otherwise use internal
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
    setInternalOpen(open);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    },
    {} as Record<string, DBModel[]>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)]",
          "bg-[var(--background)] hover:bg-[var(--muted)] transition-colors",
          "text-sm font-medium"
        )}
      >
        {selectedModel?.is_recommended && (
          <Sparkles className="w-4 h-4 text-primary-500 dark:text-primary-400" />
        )}
        <span>{selectedModel?.name || t("placeholder")}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[var(--muted-foreground)] transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-lg z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(groupedModels).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--muted)] sticky top-0">
                  {provider}
                </div>
                {providerModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      onChange(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-3 py-3 text-left hover:bg-[var(--muted)] transition-colors",
                      "flex items-start gap-3",
                      value === model.id && "bg-primary-50 dark:bg-primary-950/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{model.name}</span>
                        {model.is_recommended && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                            {t("recommended")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">
                        {model.description}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        {t("price", { price: ((model.input_price * markupMultiplier) / 1000).toFixed(4) })}
                      </p>
                    </div>
                    {value === model.id && (
                      <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
