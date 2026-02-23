import { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

// Path mappings: internal path -> localized paths
const pathMappings: Record<string, { fr: string; en: string }> = {
  "/": { fr: "/", en: "/en" },
  "/tarifs": { fr: "/tarifs", en: "/en/pricing" },
  "/tarifs/etudiants": { fr: "/tarifs/etudiants", en: "/en/pricing/students" },
  "/tarifs/etablissements": { fr: "/tarifs/etablissements", en: "/en/pricing/schools" },
  "/tarifs/formateurs": { fr: "/tarifs/formateurs", en: "/en/pricing/trainers" },
  "/comparatif": { fr: "/comparatif", en: "/en/compare" },
  "/comparatif/etudiants": { fr: "/comparatif/etudiants", en: "/en/compare/students" },
  "/comparatif/etablissements": { fr: "/comparatif/etablissements", en: "/en/compare/schools" },
  "/comparatif/formateurs": { fr: "/comparatif/formateurs", en: "/en/compare/trainers" },
  "/etudiants": { fr: "/etudiants", en: "/en/students" },
  "/etablissements": { fr: "/etablissements", en: "/en/schools" },
  "/formateurs": { fr: "/formateurs", en: "/en/trainers" },
  "/business": { fr: "/business", en: "/en/business" },
  "/business/anonymisation": { fr: "/business/anonymisation", en: "/en/business/anonymization" },
  "/mifa": { fr: "/mifa", en: "/en/mifa" },
  "/alternative-chatgpt": { fr: "/alternative-chatgpt", en: "/en/chatgpt-alternative" },
  "/blog/chatgpt-vs-claude-comparatif": { fr: "/blog/chatgpt-vs-claude-comparatif", en: "/en/blog/chatgpt-vs-claude-comparison" },
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
  { path: "/tarifs/etudiants", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tarifs/etablissements", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tarifs/formateurs", changeFrequency: "weekly", priority: 0.85 },
  { path: "/comparatif", changeFrequency: "weekly", priority: 0.9 },
  { path: "/comparatif/etudiants", changeFrequency: "weekly", priority: 0.85 },
  { path: "/comparatif/etablissements", changeFrequency: "weekly", priority: 0.85 },
  { path: "/comparatif/formateurs", changeFrequency: "weekly", priority: 0.85 },
  { path: "/etudiants", changeFrequency: "weekly", priority: 0.9 },
  { path: "/etablissements", changeFrequency: "weekly", priority: 0.9 },
  { path: "/formateurs", changeFrequency: "weekly", priority: 0.9 },
  { path: "/business", changeFrequency: "weekly", priority: 0.9 },
  { path: "/business/anonymisation", changeFrequency: "weekly", priority: 0.9 },
  { path: "/mifa", changeFrequency: "weekly", priority: 0.95 },
  { path: "/alternative-chatgpt", changeFrequency: "monthly", priority: 0.8 },
  { path: "/blog/chatgpt-vs-claude-comparatif", changeFrequency: "monthly", priority: 0.7 },
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
