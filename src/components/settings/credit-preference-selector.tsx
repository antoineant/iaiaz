"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Wallet, Loader2, Check, AlertCircle } from "lucide-react";
import type { CreditPreference } from "@/lib/credits";

interface CreditPreferenceSelectorProps {
  currentPreference: CreditPreference;
  orgName: string;
  orgBalance: number;
  personalBalance: number;
  onPreferenceChange: (preference: CreditPreference) => void;
}

const PREFERENCE_OPTIONS: {
  value: CreditPreference;
  labelKey: string;
  descriptionKey: string;
  recommended?: boolean;
}[] = [
  {
    value: "auto",
    labelKey: "auto",
    descriptionKey: "autoDescription",
    recommended: true,
  },
  {
    value: "org_only",
    labelKey: "orgOnly",
    descriptionKey: "orgOnlyDescription",
  },
  {
    value: "personal_only",
    labelKey: "personalOnly",
    descriptionKey: "personalOnlyDescription",
  },
  {
    value: "personal_first",
    labelKey: "personalFirst",
    descriptionKey: "personalFirstDescription",
  },
];

export function CreditPreferenceSelector({
  currentPreference,
  orgName,
  orgBalance,
  personalBalance,
  onPreferenceChange,
}: CreditPreferenceSelectorProps) {
  const t = useTranslations("settings.credits");
  const [selected, setSelected] = useState<CreditPreference>(currentPreference);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = selected !== currentPreference;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credit_preference: selected }),
      });

      if (response.ok) {
        onPreferenceChange(selected);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Display */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-medium">{orgName}</span>
          </div>
          <p className="text-2xl font-bold">{orgBalance.toFixed(2)}€</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("orgCredits")}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--muted)]">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium">{t("personal")}</span>
          </div>
          <p className="text-2xl font-bold">{personalBalance.toFixed(2)}€</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("personalCredits")}
          </p>
        </div>
      </div>

      {/* Preference Selection */}
      <div>
        <Label className="mb-3 block">{t("preferenceLabel")}</Label>
        <div className="space-y-2">
          {PREFERENCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                selected === option.value
                  ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30"
                  : "border-[var(--border)] hover:bg-[var(--muted)]/50"
              }`}
            >
              <input
                type="radio"
                name="credit_preference"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
                className="mt-1 mr-3"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{t(option.labelKey)}</span>
                  {option.recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300">
                      {t("recommended")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
                  {t(option.descriptionKey)}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : success ? (
            <Check className="w-4 h-4 mr-2" />
          ) : null}
          {t("savePreference")}
        </Button>
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
