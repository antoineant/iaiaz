import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(num);
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for French/English
  return Math.ceil(text.length / 4);
}

/**
 * Format CO2 emissions in a human-readable way
 * Shows mg for small values, g for larger values
 */
export function formatCO2(grams: number): string {
  if (grams < 0.001) {
    return "<0.001g CO₂";
  }
  if (grams < 1) {
    // Show in milligrams for small values
    const mg = grams * 1000;
    return `${mg.toFixed(mg < 10 ? 1 : 0)}mg CO₂`;
  }
  // Show in grams
  return `${grams.toFixed(grams < 10 ? 2 : 1)}g CO₂`;
}
