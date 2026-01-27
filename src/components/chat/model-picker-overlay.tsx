"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Sparkles,
  Zap,
  Brain,
  Code,
  Palette,
  ChevronRight,
  X,
} from "lucide-react";
import type { PricingData } from "@/lib/pricing-db";
import { cn } from "@/lib/utils";

interface ModelPickerOverlayProps {
  pricingData: PricingData;
  currentModel: string;
  onSelectModel: (modelId: string) => void;
  onClose: () => void;
  onBrowseModels: () => void;
}

// Price tier calculation
function getPriceTier(pricePerMToken: number): { tier: string; label: string } {
  if (pricePerMToken < 1) return { tier: "€", label: "budget" };
  if (pricePerMToken < 5) return { tier: "€€", label: "standard" };
  if (pricePerMToken < 15) return { tier: "€€€", label: "premium" };
  return { tier: "€€€€", label: "ultra" };
}

// Recommended model configurations
const RECOMMENDED_MODELS = [
  {
    id: "quick",
    icon: Zap,
    modelIds: ["mistral-small-latest", "gpt-4o-mini", "gemini-2.0-flash"],
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  {
    id: "smart",
    icon: Brain,
    modelIds: ["claude-sonnet-4-20250514", "gpt-4o", "gemini-1.5-pro"],
    color: "from-purple-500 to-violet-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "code",
    icon: Code,
    modelIds: ["claude-sonnet-4-20250514", "gpt-4o", "codestral-latest"],
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    id: "creative",
    icon: Palette,
    modelIds: ["gpt-4o", "claude-sonnet-4-20250514", "gemini-1.5-pro"],
    color: "from-pink-500 to-rose-500",
    bgColor: "bg-pink-50 dark:bg-pink-900/20",
    borderColor: "border-pink-200 dark:border-pink-800",
  },
];

const STORAGE_KEY = "iaia_hide_model_picker";
const PREFERRED_MODEL_KEY = "iaia_preferred_model";

export function ModelPickerOverlay({
  pricingData,
  currentModel,
  onSelectModel,
  onClose,
  onBrowseModels,
}: ModelPickerOverlayProps) {
  const t = useTranslations("chat.modelPicker");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Find a model from the recommended list that exists in available models
  const findAvailableModel = (modelIds: string[]) => {
    for (const id of modelIds) {
      const model = pricingData.models.find((m) => m.id === id && m.is_active);
      if (model) return model;
    }
    return null;
  };

  const handleSelect = (modelId: string) => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    localStorage.setItem(PREFERRED_MODEL_KEY, modelId);
    onSelectModel(modelId);
    onClose();
  };

  const handleQuickChat = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onClose();
  };

  const handleBrowseModels = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    onBrowseModels();
    onClose();
  };

  // Get current model info for Quick Chat
  const currentModelInfo = pricingData.models.find((m) => m.id === currentModel);
  const currentTier = currentModelInfo
    ? getPriceTier(currentModelInfo.input_price_per_million)
    : { tier: "€€", label: "standard" };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center mb-4 mx-auto">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-[var(--muted-foreground)]">{t("subtitle")}</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={handleQuickChat}
            className="flex-1 max-w-[200px] p-4 rounded-xl border-2 border-[var(--border)] hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
          >
            <Zap className="w-6 h-6 mb-2 text-primary-500" />
            <div className="font-medium">{t("quickChat")}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {currentModelInfo?.name || "Default"} ({currentTier.tier})
            </div>
          </button>

          <button
            onClick={handleBrowseModels}
            className="flex-1 max-w-[200px] p-4 rounded-xl border-2 border-[var(--border)] hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
          >
            <Brain className="w-6 h-6 mb-2 text-purple-500" />
            <div className="font-medium">{t("browseModels")}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {t("browseModelsHint")}
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[var(--background)] text-[var(--muted-foreground)]">
              {t("orChooseFor")}
            </span>
          </div>
        </div>

        {/* Recommended Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {RECOMMENDED_MODELS.map((rec) => {
            const model = findAvailableModel(rec.modelIds);
            if (!model) return null;

            const tier = getPriceTier(model.input_price_per_million);
            const Icon = rec.icon;

            return (
              <button
                key={rec.id}
                onClick={() => handleSelect(model.id)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left hover:scale-[1.02]",
                  rec.bgColor,
                  rec.borderColor,
                  "hover:shadow-md"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3",
                    rec.color
                  )}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="font-medium text-sm mb-1">{t(`${rec.id}.title`)}</div>
                <div className="text-xs text-[var(--muted-foreground)] mb-2">
                  {t(`${rec.id}.description`)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">
                    {model.name.split(" ")[0]}
                  </span>
                  <span className="text-xs font-bold">{tier.tier}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Don't show again */}
        <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
          <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--foreground)] transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            {t("dontShowAgain")}
          </label>
        </div>
      </div>
    </div>
  );
}

// Helper to check if picker should be shown
export function shouldShowModelPicker(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) !== "true";
}

// Helper to get preferred model
export function getPreferredModel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PREFERRED_MODEL_KEY);
}
