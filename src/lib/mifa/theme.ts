import type { AccentColor } from "@/types";

export interface ThemeColor {
  name: AccentColor;
  hex: string;
  light: string;
  dark: string;
}

// Spectrum: girly → neutral → masculine → mono
export const ACCENT_COLORS: ThemeColor[] = [
  // Girly
  { name: "sakura",  hex: "#F472B6", light: "#FCE7F3", dark: "#9D174D" },  // cherry blossom pink
  { name: "lavande", hex: "#A78BFA", light: "#EDE9FE", dark: "#5B21B6" },  // dreamy lavender
  { name: "corail",  hex: "#FB7185", light: "#FFF1F2", dark: "#BE123C" },  // warm coral rose

  // Neutral
  { name: "ocean",   hex: "#38BDF8", light: "#E0F2FE", dark: "#0369A1" },  // sky blue
  { name: "menthe",  hex: "#2DD4BF", light: "#CCFBF1", dark: "#0F766E" },  // fresh mint teal
  { name: "ambre",   hex: "#D97706", light: "#FEF3C7", dark: "#78350F" },  // warm amber

  // Masculine
  { name: "cobalt",  hex: "#818CF8", light: "#E0E7FF", dark: "#3730A3" },  // electric indigo
  { name: "foret",   hex: "#10B981", light: "#D1FAE5", dark: "#065F46" },  // forest green
  { name: "ardoise", hex: "#64748B", light: "#F1F5F9", dark: "#1E293B" },  // cool slate

  // Ultra-neutral
  { name: "mono",    hex: "#404040", light: "#F5F5F5", dark: "#171717" },  // black & white
];

export const ALLOWED_COLORS = ACCENT_COLORS.map((c) => c.name);

export const DEFAULT_THEME: ThemeColor = ACCENT_COLORS.find((c) => c.name === "cobalt")!;

/** Look up a theme by name or hex value. Always returns a valid theme (defaults to cobalt). */
export function getThemeColor(nameOrHex: string | null | undefined): ThemeColor {
  if (!nameOrHex) return DEFAULT_THEME;
  return ACCENT_COLORS.find((c) => c.name === nameOrHex || c.hex === nameOrHex) || DEFAULT_THEME;
}

export function applyAccentColor(color: string): Record<string, string> {
  const theme = getThemeColor(color);
  return {
    "--accent-color": theme.hex,
    "--accent-light": theme.light,
    "--accent-dark": theme.dark,
  };
}
