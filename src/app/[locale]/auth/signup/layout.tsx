import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription gratuite - 1€ de crédits offerts",
  description:
    "Créez votre compte iaiaz gratuitement et recevez 1€ de crédits pour tester. Accédez à Claude, GPT-5, Gemini et Mistral sans abonnement.",
  alternates: {
    canonical: "https://www.iaiaz.com/auth/signup",
  },
  openGraph: {
    title: "Inscription gratuite - iaiaz",
    description:
      "Créez votre compte et recevez 1€ de crédits gratuits. Sans carte bancaire, sans engagement.",
    url: "https://www.iaiaz.com/auth/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
