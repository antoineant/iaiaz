import { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

// Path mappings: internal path -> localized paths
const pathMappings: Record<string, { fr: string; en: string }> = {
  "/": { fr: "/", en: "/en" },
  "/tarifs": { fr: "/tarifs", en: "/en/pricing" },
  "/comparatif": { fr: "/comparatif", en: "/en/compare" },
  "/etudiants": { fr: "/etudiants", en: "/en/students" },
  "/auth/login": { fr: "/auth/login", en: "/en/auth/login" },
  "/auth/signup": { fr: "/auth/signup", en: "/en/auth/signup" },
  "/legal/cgu": { fr: "/legal/cgu", en: "/en/legal/terms" },
  "/legal/cgv": { fr: "/legal/cgv", en: "/en/legal/sales" },
  "/legal/privacy": { fr: "/legal/privacy", en: "/en/legal/privacy" },
  "/legal/cookies": { fr: "/legal/cookies", en: "/en/legal/cookies" },
};

// Page configuration
interface PageConfig {
  path: string;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
}

const pages: PageConfig[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tarifs", changeFrequency: "weekly", priority: 0.9 },
  { path: "/comparatif", changeFrequency: "weekly", priority: 0.9 },
  { path: "/etudiants", changeFrequency: "weekly", priority: 0.9 },
  { path: "/auth/login", changeFrequency: "monthly", priority: 0.8 },
  { path: "/auth/signup", changeFrequency: "monthly", priority: 0.9 },
  { path: "/legal/cgu", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cgv", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com").replace(/\/$/, "");
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // Generate entries for each page and locale
  for (const page of pages) {
    const mapping = pathMappings[page.path];

    for (const locale of locales) {
      const localePath = mapping[locale];
      const url = `${baseUrl}${localePath === "/" ? "" : localePath}`;

      // Build alternates for hreflang
      const alternates: Record<string, string> = {};
      for (const altLocale of locales) {
        const altPath = mapping[altLocale];
        const langKey = altLocale === "fr" ? "fr-FR" : "en";
        alternates[langKey] = `${baseUrl}${altPath === "/" ? "" : altPath}`;
      }
      // x-default points to French (default locale)
      alternates["x-default"] = `${baseUrl}${mapping.fr === "/" ? "" : mapping.fr}`;

      entries.push({
        url,
        lastModified: now,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: alternates,
        },
      });
    }
  }

  return entries;
}
