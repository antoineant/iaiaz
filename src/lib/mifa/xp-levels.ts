import type { AssistantGauges } from "@/types";

export const XP_LEVELS = [
  { name: "novice", minXp: 0 },
  { name: "apprenti", minXp: 50 },
  { name: "expert", minXp: 200 },
  { name: "maitre", minXp: 500 },
  { name: "legende", minXp: 1000 },
] as const;

export function getLevel(xp: number) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXp) {
      const next = XP_LEVELS[i + 1];
      return {
        name: XP_LEVELS[i].name,
        minXp: XP_LEVELS[i].minXp,
        nextMinXp: next?.minXp ?? null,
        index: i,
      };
    }
  }
  return { name: XP_LEVELS[0].name, minXp: 0, nextMinXp: XP_LEVELS[1].minXp, index: 0 };
}

export const DEFAULT_GAUGES: AssistantGauges = {
  creativity: 3,
  patience: 3,
  humor: 1,
  rigor: 3,
  curiosity: 3,
};

export const GAUGE_KEYS = ["creativity", "patience", "humor", "rigor", "curiosity"] as const;

export function validateGauges(gauges: Record<string, unknown>): AssistantGauges | null {
  const result: Record<string, number> = {};
  for (const key of GAUGE_KEYS) {
    const val = gauges[key];
    if (typeof val !== "number" || val < 1 || val > 5 || !Number.isInteger(val)) {
      return null;
    }
    result[key] = val;
  }
  return result as unknown as AssistantGauges;
}
