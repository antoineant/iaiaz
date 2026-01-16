import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Info, Zap, Shield, CreditCard } from "lucide-react";
import { MODEL_PRICING, MARKUP } from "@/lib/pricing";
import { PricingCalculator } from "./calculator";

export const metadata: Metadata = {
  title: "Tarifs - Prix par modèle IA | iaiaz",
  description:
    "Tarifs transparents pour GPT-4, Claude, Gemini et Mistral. Payez à l'usage, sans abonnement. À partir de 0.001€ par message. 1€ offert à l'inscription.",
  keywords: [
    "prix chatgpt",
    "tarif ia",
    "cout gpt-4",
    "prix claude",
    "ia pas cher",
    "chatgpt prix",
    "api openai prix",
    "prix gemini",
    "tarif mistral",
  ],
  openGraph: {
    title: "Tarifs iaiaz - Transparence totale",
    description:
      "Découvrez nos prix par modèle. Payez uniquement ce que vous utilisez.",
  },
};

// Group models by provider
const providers = [
  {
    name: "Anthropic (Claude)",
    color: "orange",
    models: Object.entries(MODEL_PRICING).filter(([_, m]) =>
      m.provider === "Anthropic"
    ),
  },
  {
    name: "OpenAI (GPT)",
    color: "green",
    models: Object.entries(MODEL_PRICING).filter(([_, m]) =>
      m.provider === "OpenAI"
    ),
  },
  {
    name: "Google (Gemini)",
    color: "blue",
    models: Object.entries(MODEL_PRICING).filter(([_, m]) =>
      m.provider === "Google"
    ),
  },
  {
    name: "Mistral",
    color: "purple",
    models: Object.entries(MODEL_PRICING).filter(([_, m]) =>
      m.provider === "Mistral"
    ),
  },
];

// Calculate price per message (assuming ~500 input tokens, ~500 output tokens)
function estimateMessageCost(input: number, output: number): string {
  const cost = ((500 * input + 500 * output) / 1_000_000) * MARKUP;
  if (cost < 0.001) return "<0.001€";
  return cost.toFixed(4) + "€";
}

export default function TarifsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            iaiaz
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/comparatif" className="hover:text-primary">
              Comparatif
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
            Tarifs transparents
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Payez uniquement ce que vous utilisez. Pas d&apos;abonnement, pas de
            frais cachés. Prix affichés = prix finaux TTC.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> 1€ offert à l&apos;inscription
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> Crédits sans expiration
            </span>
            <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" /> Zéro engagement
            </span>
          </div>
        </div>

        {/* How it works */}
        <section className="mb-16 bg-muted/50 rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" /> Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">1.</div>
              <h3 className="font-medium mb-1">Achetez des crédits</h3>
              <p className="text-sm text-muted-foreground">
                Rechargez votre compte avec le montant de votre choix (1€ à
                100€).
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">2.</div>
              <h3 className="font-medium mb-1">Utilisez l&apos;IA</h3>
              <p className="text-sm text-muted-foreground">
                Chaque message consomme des crédits selon le modèle utilisé.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">3.</div>
              <h3 className="font-medium mb-1">Rechargez si besoin</h3>
              <p className="text-sm text-muted-foreground">
                Vos crédits n&apos;expirent jamais. Rechargez quand vous voulez.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Calculateur de coût
          </h2>
          <PricingCalculator />
        </section>

        {/* Pricing Tables by Provider */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Prix par modèle
          </h2>
          <p className="text-center text-muted-foreground mb-8">
            Prix pour 1 million de tokens (environ 750 000 mots)
          </p>

          <div className="space-y-8">
            {providers.map((provider) => (
              <div key={provider.name}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full bg-${provider.color}-500`}
                  ></span>
                  {provider.name}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="p-3">Modèle</th>
                        <th className="p-3 text-right">Input (€/1M)</th>
                        <th className="p-3 text-right">Output (€/1M)</th>
                        <th className="p-3 text-right">~Prix/message</th>
                        <th className="p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provider.models.map(([id, model]) => (
                        <tr key={id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">
                            {model.name}
                            {model.recommended && (
                              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                                Recommandé
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {(model.input * MARKUP).toFixed(2)}€
                          </td>
                          <td className="p-3 text-right font-mono">
                            {(model.output * MARKUP).toFixed(2)}€
                          </td>
                          <td className="p-3 text-right font-mono text-primary">
                            {estimateMessageCost(model.input, model.output)}
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {model.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Credit Packs */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Packs de crédits
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="border rounded-xl p-6 text-center">
              <div className="text-3xl font-bold mb-1">5€</div>
              <div className="text-sm text-muted-foreground mb-4">
                5€ de crédits
              </div>
              <div className="text-xs text-muted-foreground">
                ~250 messages Claude Sonnet
              </div>
            </div>
            <div className="border-2 border-primary rounded-xl p-6 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                Populaire
              </div>
              <div className="text-3xl font-bold mb-1">10€</div>
              <div className="text-sm text-muted-foreground mb-4">
                10€ de crédits
              </div>
              <div className="text-xs text-muted-foreground">
                ~500 messages Claude Sonnet
              </div>
            </div>
            <div className="border rounded-xl p-6 text-center">
              <div className="text-3xl font-bold mb-1">20€</div>
              <div className="text-sm text-muted-foreground mb-4">
                20€ de crédits
              </div>
              <div className="text-xs text-muted-foreground">
                ~1000 messages Claude Sonnet
              </div>
            </div>
            <div className="border rounded-xl p-6 text-center bg-muted/50">
              <div className="text-3xl font-bold mb-1">1-100€</div>
              <div className="text-sm text-muted-foreground mb-4">
                Montant libre
              </div>
              <div className="text-xs text-muted-foreground">
                Choisissez votre montant
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">
                Qu&apos;est-ce qu&apos;un token ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Un token est une unité de texte (environ 4 caractères ou 0.75
                mot en français). Un message typique fait 200-500 tokens en
                entrée et 200-1000 tokens en sortie.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">
                Les crédits expirent-ils ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Non, vos crédits n&apos;expirent jamais. Utilisez-les à votre
                rythme.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">
                Puis-je obtenir un remboursement ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Oui, vous pouvez demander un remboursement au prorata des
                crédits non utilisés dans les 14 jours suivant l&apos;achat.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">
                Pourquoi ces prix sont-ils plus élevés que les API directes ?
              </h3>
              <p className="text-sm text-muted-foreground">
                Nous appliquons une marge de 50% pour couvrir nos coûts
                d&apos;infrastructure, l&apos;interface utilisateur, et le
                support. Cela reste 10x moins cher qu&apos;un abonnement
                ChatGPT Plus pour un usage modéré.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-primary/10 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Créez votre compte et recevez 1€ de crédits offerts pour tester tous
            les modèles.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="w-5 h-5" />
              Créer mon compte gratuit
            </Link>
            <Link
              href="/comparatif"
              className="inline-flex items-center gap-2 border px-8 py-4 rounded-xl text-lg hover:bg-muted transition-colors"
            >
              Voir le comparatif <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
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
