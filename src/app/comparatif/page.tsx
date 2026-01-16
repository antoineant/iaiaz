import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, Zap, Euro, Brain, ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            iaiaz
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/tarifs" className="hover:text-primary">
              Tarifs
            </Link>
            <Link href="/etudiants" className="hover:text-primary">
              Étudiants
            </Link>
            <Link
              href="/auth/signup"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90"
            >
              Essayer gratuit
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            iaiaz vs ChatGPT Plus
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Pourquoi payer 20€/mois quand vous pouvez accéder aux meilleurs
            modèles d&apos;IA et ne payer que ce que vous utilisez ?
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> Économisez jusqu&apos;à 90%
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> 4 fournisseurs IA
            </span>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            Comparatif détaillé
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left p-4">Fonctionnalité</th>
                  <th className="text-center p-4 bg-primary/10">
                    <div className="font-bold text-primary">iaiaz</div>
                    <div className="text-sm text-muted-foreground">
                      Pay-as-you-go
                    </div>
                  </th>
                  <th className="text-center p-4">
                    <div className="font-bold">ChatGPT Plus</div>
                    <div className="text-sm text-muted-foreground">20€/mois</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-medium">{row.feature}</td>
                    <td
                      className={`p-4 text-center ${
                        row.iaiazWins ? "bg-green-50 dark:bg-green-900/20" : ""
                      }`}
                    >
                      {row.iaiaz}
                    </td>
                    <td className="p-4 text-center text-muted-foreground">
                      {row.chatgpt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Use Case Savings */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-4">
            Combien pouvez-vous économiser ?
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Estimations basées sur une utilisation typique
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((useCase, i) => (
              <div key={i} className="border rounded-xl p-6 text-center">
                <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {useCase.description}
                </p>
                <div className="flex justify-center gap-8 mb-4">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {useCase.iaiazCost}
                    </div>
                    <div className="text-xs text-muted-foreground">iaiaz</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-muted-foreground line-through">
                      {useCase.chatgptCost}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ChatGPT Plus
                    </div>
                  </div>
                </div>
                <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                  Économie : {useCase.savings}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Multiple Models */}
        <section className="mb-20 bg-muted/50 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6" /> Pourquoi accéder à plusieurs modèles ?
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
            <div className="bg-background rounded-xl p-6">
              <h3 className="font-bold mb-3">
                Avec iaiaz, vous pouvez :
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Utiliser GPT-4 pour le brainstorming</li>
                <li>• Passer à Claude pour rédiger votre dissertation</li>
                <li>• Utiliser Mistral pour les tâches simples (économique)</li>
                <li>• Comparer les réponses de différents modèles</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing Transparency */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-2">
            <Euro className="w-6 h-6" /> Transparence totale sur les prix
          </h2>
          <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
            Contrairement aux abonnements, vous voyez exactement ce que coûte
            chaque message. Exemple avec 1€ de crédits :
          </p>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary mb-1">~100</div>
              <div className="text-sm text-muted-foreground">
                messages avec GPT-4o Mini
              </div>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary mb-1">~50</div>
              <div className="text-sm text-muted-foreground">
                messages avec Claude Sonnet
              </div>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary mb-1">~30</div>
              <div className="text-sm text-muted-foreground">
                messages avec GPT-4
              </div>
            </div>
            <div className="border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary mb-1">~200</div>
              <div className="text-sm text-muted-foreground">
                messages avec Mistral Small
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-primary/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">
            Prêt à économiser sur l&apos;IA ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Créez votre compte gratuitement et recevez 1€ de crédits offerts.
            Sans carte bancaire, sans engagement.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Commencer gratuitement <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 iaiaz - BAJURIAN SAS. Tous droits réservés.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/legal/cgu" className="hover:underline">
              CGU
            </Link>
            <Link href="/legal/cgv" className="hover:underline">
              CGV
            </Link>
            <Link href="/legal/privacy" className="hover:underline">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
