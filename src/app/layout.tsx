import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieConsentBanner } from "@/components/cookie-consent";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://iaiaz.fr"),
  title: {
    default: "iaiaz - IA Accessible, Zéro engagement | Alternative ChatGPT pas cher",
    template: "%s | iaiaz",
  },
  description:
    "Accédez aux meilleurs modèles d'IA (Claude, GPT-4, Gemini, Mistral) sans abonnement. Payez uniquement ce que vous utilisez. 1€ offert à l'inscription. Alternative économique à ChatGPT Plus.",
  keywords: [
    "IA",
    "intelligence artificielle",
    "étudiant",
    "Claude",
    "GPT-4",
    "GPT-5",
    "ChatGPT",
    "Gemini",
    "Mistral",
    "pas cher",
    "France",
    "sans abonnement",
    "zéro engagement",
    "alternative chatgpt",
    "ia gratuit",
    "chatgpt gratuit",
    "ia payer usage",
  ],
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
    title: "iaiaz - IA Accessible, Zéro engagement",
    description:
      "Accédez aux meilleurs modèles d'IA sans abonnement. Payez uniquement ce que vous utilisez. 1€ offert à l'inscription.",
    url: "https://iaiaz.fr",
    siteName: "iaiaz",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "iaiaz - Intelligence Artificielle Accessible",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "iaiaz - IA Accessible, Zéro engagement",
    description:
      "Accédez aux meilleurs modèles d'IA sans abonnement. Payez uniquement ce que vous utilisez.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://iaiaz.fr",
    languages: {
      "fr-FR": "https://iaiaz.fr",
    },
  },
  verification: {
    // Add your verification codes when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
