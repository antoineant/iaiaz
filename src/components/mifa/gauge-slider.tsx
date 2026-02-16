"use client";

import { useTranslations } from "next-intl";
import { getThemeColor } from "@/lib/mifa/theme";
import { GAUGE_KEYS } from "@/lib/mifa/xp-levels";
import type { AssistantGauges } from "@/types";

interface GaugeSliderProps {
  gaugeKey: (typeof GAUGE_KEYS)[number];
  value: number;
  onChange?: (value: number) => void;
  color?: string;
  readonly?: boolean;
}

export function GaugeSlider({ gaugeKey, value, onChange, color = "blue", readonly = false }: GaugeSliderProps) {
  const t = useTranslations("mifa.chat.gauges");
  const theme = getThemeColor(color);
  const hex = theme?.hex || "#818CF8";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium w-20 text-[var(--muted-foreground)]">{t(gaugeKey)}</span>
      <div className="flex gap-1.5 flex-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={readonly}
            onClick={() => onChange?.(n)}
            className={`h-3 flex-1 rounded-full transition-all ${
              readonly ? "cursor-default" : "cursor-pointer hover:opacity-80"
            }`}
            style={{
              backgroundColor: n <= value ? hex : `${hex}20`,
            }}
          />
        ))}
      </div>
      <span className="text-xs font-mono w-4 text-[var(--muted-foreground)]">{value}</span>
    </div>
  );
}

interface GaugeGroupProps {
  gauges: AssistantGauges;
  onChange?: (gauges: AssistantGauges) => void;
  color?: string;
  readonly?: boolean;
}

export function GaugeGroup({ gauges, onChange, color, readonly }: GaugeGroupProps) {
  return (
    <div className="space-y-2">
      {GAUGE_KEYS.map((key) => (
        <GaugeSlider
          key={key}
          gaugeKey={key}
          value={gauges[key]}
          color={color}
          readonly={readonly}
          onChange={
            onChange
              ? (val) => onChange({ ...gauges, [key]: val })
              : undefined
          }
        />
      ))}
    </div>
  );
}
