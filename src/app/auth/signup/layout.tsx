import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inscription gratuite - 1€ de crédits offerts",
  description:
    "Créez votre compte iaiaz gratuitement et recevez 1€ de crédits pour tester. Accédez à Claude, GPT-4, Gemini et Mistral sans abonnement.",
  openGraph: {
    title: "Inscription gratuite - iaiaz",
    description:
      "Créez votre compte et recevez 1€ de crédits gratuits. Sans carte bancaire, sans engagement.",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
