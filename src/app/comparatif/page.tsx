import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Euro, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "iaiaz vs ChatGPT Plus - Comparatif 2025",
  description:
    "Comparez iaiaz et ChatGPT Plus : prix, fonctionnalités, modèles disponibles. Découvrez pourquoi iaiaz est l'alternative ChatGPT la moins chère pour les étudiants.",
  keywords: [
    "alternative chatgpt",
    "alternative chatgpt moins cher",
    "chatgpt gratuit",
    "chatgpt pas cher",
    "comparatif ia",
    "chatgpt vs claude",
    "gpt-4 gratuit",
    "ia sans abonnement",
  ],
  openGraph: {
    title: "iaiaz vs ChatGPT Plus - Le comparatif complet",
    description:
      "Pourquoi payer 20€/mois quand vous pouvez payer uniquement ce que vous utilisez ?",
  },
};

const comparisonData = [
  {
    feature: "Prix mensuel minimum",
    iaiaz: "0€ (payez à l'usage)",
    chatgpt: "20€/mois",
    iaiazWins: true,
  },
  {
    feature: "Accès GPT-4",
    iaiaz: "✓ Inclus",
    chatgpt: "✓ Inclus",
    iaiazWins: null,
  },
  {
    feature: "Accès Claude (Anthropic)",
    iaiaz: "✓ Tous les modèles",
    chatgpt: "✗ Non disponible",
    iaiazWins: true,
  },
  {
    feature: "Accès Gemini (Google)",
    iaiaz: "✓ Tous les modèles",
    chatgpt: "✗ Non disponible",
    iaiazWins: true,
  },
  {
    feature: "Accès Mistral",
    iaiaz: "✓ Tous les modèles",
    chatgpt: "✗ Non disponible",
    iaiazWins: true,
  },
  {
    feature: "Engagement",
    iaiaz: "Zéro engagement",
    chatgpt: "Abonnement mensuel",
    iaiazWins: true,
  },
  {
    feature: "Crédits offerts",
    iaiaz: "1€ à l'inscription",
    chatgpt: "Aucun",
    iaiazWins: true,
  },
  {
    feature: "Upload de fichiers",
    iaiaz: "✓ Images & PDF",
    chatgpt: "✓ Images & PDF",
    iaiazWins: null,
  },
  {
    feature: "Historique conversations",
    iaiaz: "✓ Illimité",
    chatgpt: "✓ Illimité",
    iaiazWins: null,
  },
  {
    feature: "Limite de messages",
    iaiaz: "Aucune (selon crédits)",
    chatgpt: "80 messages/3h (GPT-4)",
    iaiazWins: true,
  },
];

const useCases = [
  {
    title: "Étudiant occasionnel",
    description: "Quelques questions par semaine pour les devoirs",
    iaiazCost: "~2€/mois",
    chatgptCost: "20€/mois",
    savings: "90%",
  },
  {
    title: "Utilisateur régulier",
    description: "Usage quotidien modéré",
    iaiazCost: "~8€/mois",
    chatgptCost: "20€/mois",
    savings: "60%",
  },
  {
    title: "Power user",
    description: "Usage intensif tous les jours",
    iaiazCost: "~15€/mois",
    chatgptCost: "20€/mois",
    savings: "25%",
  },
];

export default function ComparatifPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            iaiaz vs ChatGPT Plus
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            Pourquoi payer 20€/mois quand vous pouvez accéder aux meilleurs
            modèles d&apos;IA et ne payer que ce que vous utilisez ?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> Économisez jusqu&apos;à 90%
            </span>
            <span className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> 4 fournisseurs IA
            </span>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Comparatif détaillé
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)]">
                      <th className="text-left p-4">Fonctionnalité</th>
                      <th className="text-center p-4 bg-primary-50">
                        <div className="font-bold text-primary-600">iaiaz</div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          Pay-as-you-go
                        </div>
                      </th>
                      <th className="text-center p-4">
                        <div className="font-bold">ChatGPT Plus</div>
                        <div className="text-sm text-[var(--muted-foreground)]">20€/mois</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td
                          className={`p-4 text-center ${
                            row.iaiazWins ? "bg-green-50" : ""
                          }`}
                        >
                          {row.iaiaz}
                        </td>
                        <td className="p-4 text-center text-[var(--muted-foreground)]">
                          {row.chatgpt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Use Case Savings */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-4">
            Combien pouvez-vous économiser ?
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8">
            Estimations basées sur une utilisation typique
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i} className="text-center">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    {useCase.description}
                  </p>
                  <div className="flex justify-center gap-8 mb-4">
                    <div>
                      <div className="text-2xl font-bold text-primary-600">
                        {useCase.iaiazCost}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">iaiaz</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--muted-foreground)] line-through">
                        {useCase.chatgptCost}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        ChatGPT Plus
                      </div>
                    </div>
                  </div>
                  <div className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                    Économie : {useCase.savings}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Multiple Models */}
        <section className="mb-20 bg-[var(--muted)] rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600" /> Pourquoi accéder à plusieurs modèles ?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <strong>Claude</strong> excelle en rédaction et analyse de
                  documents longs
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <strong>GPT-4</strong> est très polyvalent et créatif
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <strong>Gemini</strong> a une énorme fenêtre de contexte (1M
                  tokens)
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <strong>Mistral</strong> est excellent en français et très
                  économique
                </div>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">
                  Avec iaiaz, vous pouvez :
                </h3>
                <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                  <li>• Utiliser GPT-4 pour le brainstorming</li>
                  <li>• Passer à Claude pour rédiger votre dissertation</li>
                  <li>• Utiliser Mistral pour les tâches simples (économique)</li>
                  <li>• Comparer les réponses de différents modèles</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Transparency */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-2">
            <Euro className="w-6 h-6 text-primary-600" /> Transparence totale sur les prix
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
            Contrairement aux abonnements, vous voyez exactement ce que coûte
            chaque message. Exemple avec 1€ de crédits :
          </p>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 mb-1">~100</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  messages avec GPT-4o Mini
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 mb-1">~50</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  messages avec Claude Sonnet
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 mb-1">~30</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  messages avec GPT-4
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 mb-1">~200</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  messages avec Mistral Small
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à économiser sur l&apos;IA ?
          </h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            Créez votre compte gratuitement et recevez 1€ de crédits offerts.
            Sans carte bancaire, sans engagement.
          </p>
          <Link href="/auth/signup">
            <Button size="lg">
              Commencer gratuitement <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600">iaiaz</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Intelligence Artificielle Intelligemment Accessible, Zéro engagement
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              © 2025 iaiaz. Tous droits réservés.
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Fait avec amour à Toulouse, France
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              CGU
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              CGV
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              Confidentialité
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
