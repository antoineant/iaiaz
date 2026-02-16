export interface AccentTheme {
  name: string;
  hex: string;
  light: string;
  dark: string;
}

// Spectrum: girly → neutral → masculine → mono
// Aligned with web palette in src/lib/mifa/theme.ts
export const ACCENT_COLORS: AccentTheme[] = [
  // Girly
  { name: "sakura",  hex: "#F472B6", light: "#FCE7F3", dark: "#9D174D" },
  { name: "lavande", hex: "#A78BFA", light: "#EDE9FE", dark: "#5B21B6" },
  { name: "corail",  hex: "#FB7185", light: "#FFF1F2", dark: "#BE123C" },

  // Neutral
  { name: "ocean",   hex: "#38BDF8", light: "#E0F2FE", dark: "#0369A1" },
  { name: "menthe",  hex: "#2DD4BF", light: "#CCFBF1", dark: "#0F766E" },
  { name: "ambre",   hex: "#D97706", light: "#FEF3C7", dark: "#78350F" },

  // Masculine
  { name: "cobalt",  hex: "#818CF8", light: "#E0E7FF", dark: "#3730A3" },
  { name: "foret",   hex: "#10B981", light: "#D1FAE5", dark: "#065F46" },
  { name: "ardoise", hex: "#64748B", light: "#F1F5F9", dark: "#1E293B" },

  // Ultra-neutral
  { name: "mono",    hex: "#404040", light: "#F5F5F5", dark: "#171717" },
];

export const DEFAULT_ACCENT: AccentTheme = ACCENT_COLORS.find((c) => c.name === "cobalt")!;

/** Look up a theme by name or hex value. Always returns a valid theme (defaults to cobalt). */
export function getAccentTheme(nameOrHex: string | null | undefined): AccentTheme {
  if (!nameOrHex) return DEFAULT_ACCENT;
  return ACCENT_COLORS.find((c) => c.name === nameOrHex || c.hex === nameOrHex) || DEFAULT_ACCENT;
}
