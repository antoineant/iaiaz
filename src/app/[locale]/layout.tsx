import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { inter } from "../layout";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { locales, type Locale } from "@/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.iaiaz.com";

  // Locale-specific metadata
  const metadata: Record<Locale, { title: string; description: string; keywords: string[] }> = {
    fr: {
      title: "iaiaz - IA Accessible, Zéro engagement | Alternative ChatGPT pas cher",
      description:
        "Accédez aux meilleurs modèles d'IA (Claude, GPT-5, Gemini, Mistral) sans abonnement. Payez uniquement ce que vous utilisez. 1€ offert à l'inscription.",
      keywords: [
        "IA",
        "intelligence artificielle",
        "étudiant",
        "Claude",
        "GPT-5",
        "ChatGPT",
        "Gemini",
        "Mistral",
        "pas cher",
        "France",
        "sans abonnement",
        "alternative chatgpt",
      ],
    },
    en: {
      title: "iaiaz - Affordable AI Access, No Subscription | ChatGPT Alternative",
      description:
        "Access the best AI models (Claude, GPT-5, Gemini, Mistral) without subscription. Pay only for what you use. $1 free credit on signup.",
      keywords: [
        "AI",
        "artificial intelligence",
        "student",
        "Claude",
        "GPT-5",
        "ChatGPT",
        "Gemini",
        "Mistral",
        "affordable",
        "no subscription",
        "pay as you go",
        "chatgpt alternative",
      ],
    },
  };

  const localeMetadata = metadata[locale as Locale] || metadata.fr;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: localeMetadata.title,
      template: "%s | iaiaz",
    },
    description: localeMetadata.description,
    keywords: localeMetadata.keywords,
    authors: [{ name: "iaiaz" }, { name: "BAJURIAN SAS" }],
    creator: "BAJURIAN SAS",
    publisher: "BAJURIAN SAS",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: localeMetadata.title,
      description: localeMetadata.description,
      url: locale === "fr" ? baseUrl : `${baseUrl}/en`,
      siteName: "iaiaz",
      locale: locale === "fr" ? "fr_FR" : "en_US",
      alternateLocale: locale === "fr" ? "en_US" : "fr_FR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: localeMetadata.title,
      description: localeMetadata.description,
    },
    alternates: {
      canonical: locale === "fr" ? baseUrl : `${baseUrl}/en`,
      languages: {
        "fr-FR": baseUrl,
        en: `${baseUrl}/en`,
        "x-default": baseUrl,
      },
    },
    category: "technology",
    icons: {
      icon: [
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    manifest: "/site.webmanifest",
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for the locale
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieConsentBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
