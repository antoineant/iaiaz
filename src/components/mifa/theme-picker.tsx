"use client";

import { useState } from "react";
import { ACCENT_COLORS, type ThemeColor } from "@/lib/mifa/theme";
import { useTranslations } from "next-intl";

interface ThemePickerProps {
  currentColor: string | null;
  onSelect: (color: string) => void;
}

export function ThemePicker({ currentColor, onSelect }: ThemePickerProps) {
  const t = useTranslations("mifa.chat");
  const [selected, setSelected] = useState(currentColor || "blue");
  const [saving, setSaving] = useState(false);

  const handleSelect = async (color: ThemeColor) => {
    setSelected(color.name);
    setSaving(true);
    try {
      const res = await fetch("/api/mifa/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: color.name }),
      });
      if (res.ok) {
        // Apply CSS variables
        document.documentElement.style.setProperty("--accent-color", color.hex);
        document.documentElement.style.setProperty("--accent-light", color.light);
        document.documentElement.style.setProperty("--accent-dark", color.dark);
        onSelect(color.name);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-sm font-medium mb-3">{t("chooseColor")}</p>
      <div className="grid grid-cols-4 gap-3">
        {ACCENT_COLORS.map((color) => (
          <button
            key={color.name}
            onClick={() => handleSelect(color)}
            disabled={saving}
            className={`w-10 h-10 rounded-full transition-all ${
              selected === color.name
                ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110"
                : "hover:scale-105"
            }`}
            style={{ backgroundColor: color.hex }}
            aria-label={color.name}
          />
        ))}
      </div>
    </div>
  );
}
