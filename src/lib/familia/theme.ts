import type { AccentColor } from "@/types";

export interface ThemeColor {
  name: AccentColor;
  hex: string;
  light: string;
  dark: string;
}

// Gen Z pastel-neon palette — vibrant, dreamy, high luminosity
export const ACCENT_COLORS: ThemeColor[] = [
  { name: "blue", hex: "#818CF8", light: "#E0E7FF", dark: "#3730A3" },    // periwinkle
  { name: "pink", hex: "#FF6B9D", light: "#FFE4ED", dark: "#9F1239" },    // cherry blossom
  { name: "green", hex: "#6EE7B7", light: "#D1FAE5", dark: "#065F46" },   // mint candy
  { name: "orange", hex: "#FDBA74", light: "#FFF1E0", dark: "#9A3412" },  // peach fuzz
  { name: "purple", hex: "#C084FC", light: "#F3E8FF", dark: "#6B21A8" },  // vivid violet
  { name: "red", hex: "#FF6B6B", light: "#FFE5E5", dark: "#991B1B" },     // coral pop
  { name: "teal", hex: "#5EEAD4", light: "#CCFBF1", dark: "#115E59" },    // aqua splash
  { name: "amber", hex: "#FDE047", light: "#FEF9C3", dark: "#854D0E" },   // lemon drop
];

export const ALLOWED_COLORS = ACCENT_COLORS.map((c) => c.name);

export function getThemeColor(name: string): ThemeColor | undefined {
  return ACCENT_COLORS.find((c) => c.name === name);
}

export function applyAccentColor(color: string): Record<string, string> {
  const theme = getThemeColor(color);
  if (!theme) return {};
  return {
    "--accent-color": theme.hex,
    "--accent-light": theme.light,
    "--accent-dark": theme.dark,
  };
}
