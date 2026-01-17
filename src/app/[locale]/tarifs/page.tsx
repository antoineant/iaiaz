import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Info, Zap, Shield, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { getPricingData, type DBModel } from "@/lib/pricing-db";
import { PricingCalculator } from "./calculator";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";

// Page-specific FAQs for structured data - markup is dynamic
function getTarifsFaqs(markupPercentage: number) {
  return [
    {
      question: "C'est quoi un token ?",
      answer:
        "Un token correspond à environ 4 caractères ou 0.75 mot en français. Un message classique représente 200 à 500 tokens en entrée, et la réponse de l'IA entre 200 et 1000 tokens.",
    },
    {
      question: "Mes crédits ont-ils une date d'expiration ?",
      answer:
        "Non, vos crédits n'expirent jamais. Utilisez-les quand vous le souhaitez.",
    },
    {
      question: "Puis-je me faire rembourser ?",
      answer:
        "Oui, vous pouvez demander le remboursement de vos crédits non utilisés à tout moment. Le remboursement est calculé au prorata du solde restant.",
    },
    {
      question: "Pourquoi ces prix sont-ils supérieurs aux API directes ?",
      answer:
        `Nous appliquons une marge de ${markupPercentage}% pour couvrir l'infrastructure, l'interface et le support. Malgré cela, c'est jusqu'à 10 fois moins cher qu'un abonnement ChatGPT Plus pour un usage modéré.`,
    },
  ];
}

export const metadata: Metadata = {
  title: "Tarifs - Prix par modèle IA",
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
  alternates: {
    canonical: "https://www.iaiaz.com/tarifs",
  },
  openGraph: {
    title: "Tarifs iaiaz - Transparence totale",
    description:
      "Découvrez nos prix par modèle. Payez uniquement ce que vous utilisez.",
    url: "https://www.iaiaz.com/tarifs",
  },
};

// Provider display names and colors
const providerConfig: Record<string, { name: string; color: string }> = {
  Anthropic: { name: "Anthropic (Claude)", color: "orange" },
  OpenAI: { name: "OpenAI (GPT)", color: "green" },
  Google: { name: "Google (Gemini)", color: "blue" },
  Mistral: { name: "Mistral", color: "purple" },
};

// Group models by provider
function groupModelsByProvider(models: DBModel[]) {
  const grouped: Record<string, DBModel[]> = {};

  for (const model of models) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }

  // Return in preferred order
  const orderedProviders = ["Anthropic", "OpenAI", "Google", "Mistral"];
  return orderedProviders
    .filter((p) => grouped[p]?.length > 0)
    .map((provider) => ({
      ...providerConfig[provider],
      provider,
      models: grouped[provider],
    }));
}

// Calculate price per message (assuming ~500 input tokens, ~500 output tokens)
function estimateMessageCost(input: number, output: number, markupMultiplier: number): string {
  const cost = ((500 * input + 500 * output) / 1_000_000) * markupMultiplier;
  if (cost < 0.001) return "<0.001€";
  return cost.toFixed(4) + "€";
}

export default async function TarifsPage() {
  // Fetch pricing data from database
  const { settings, models } = await getPricingData();
  const { markup, markupMultiplier } = settings;
  const tarifsFaqs = getTarifsFaqs(markup);
  const providers = groupModelsByProvider(models);
  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <FAQSchema faqs={tarifsFaqs} />
      <BreadcrumbSchema
        items={[
          { name: "Accueil", url: "https://www.iaiaz.com" },
          { name: "Tarifs", url: "https://www.iaiaz.com/tarifs" },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Tarifs transparents
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            Payez uniquement ce que vous consommez. Sans abonnement, sans frais
            cachés. Les prix affichés sont les prix finaux, TTC.
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
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-600 dark:text-primary-400" /> Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">1.</div>
              <h3 className="font-medium mb-1">Rechargez votre compte</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ajoutez le montant de votre choix, de 1€ à 100€.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">2.</div>
              <h3 className="font-medium mb-1">Discutez avec l&apos;IA</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Chaque message consomme des crédits en fonction du modèle choisi.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">3.</div>
              <h3 className="font-medium mb-1">Rechargez à volonté</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Vos crédits n&apos;expirent jamais. Rechargez quand bon vous semble.
              </p>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Calculateur de coût
          </h2>
          <PricingCalculator models={models} markupMultiplier={markupMultiplier} />
        </section>

        {/* Pricing Tables by Provider */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Prix par modèle
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8">
            Prix pour 1 million de tokens (environ 750 000 mots)
          </p>

          <div className="space-y-8">
            {providers.map((provider) => (
              <Card key={provider.name}>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full bg-${provider.color}-500`}
                    ></span>
                    {provider.name}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-left">
                          <th className="p-3">Modèle</th>
                          <th className="p-3 text-right">Input (€/1M)</th>
                          <th className="p-3 text-right">Output (€/1M)</th>
                          <th className="p-3 text-right">Coût estimé/msg</th>
                          <th className="p-3">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provider.models.map((model) => (
                          <tr key={model.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                            <td className="p-3 font-medium">
                              {model.name}
                              {model.is_recommended && (
                                <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded">
                                  Recommandé
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {(model.input_price * markupMultiplier).toFixed(2)}€
                            </td>
                            <td className="p-3 text-right font-mono">
                              {(model.output_price * markupMultiplier).toFixed(2)}€
                            </td>
                            <td className="p-3 text-right font-mono text-primary-600 dark:text-primary-400">
                              {estimateMessageCost(model.input_price, model.output_price, markupMultiplier)}
                            </td>
                            <td className="p-3 text-sm text-[var(--muted-foreground)]">
                              {model.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Credit Packs */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Packs de crédits
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">5€</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  5€ de crédits
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  ~250 messages Claude Sonnet
                </div>
              </CardContent>
            </Card>
            <Card className="ring-2 ring-primary-500 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                Populaire
              </div>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">10€</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  10€ de crédits
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  ~500 messages Claude Sonnet
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">20€</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  20€ de crédits
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  ~1000 messages Claude Sonnet
                </div>
              </CardContent>
            </Card>
            <Card className="text-center bg-[var(--muted)]">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">1-100€</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  Montant libre
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Choisissez votre montant
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">
                  C&apos;est quoi un token ?
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Un token correspond à environ 4 caractères ou 0.75 mot en
                  français. Un message classique représente 200 à 500 tokens en
                  entrée, et la réponse de l&apos;IA entre 200 et 1000 tokens.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">
                  Mes crédits ont-ils une date d&apos;expiration ?
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Non, vos crédits n&apos;expirent jamais. Utilisez-les quand
                  vous le souhaitez.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">
                  Puis-je me faire rembourser ?
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Oui, vous pouvez demander le remboursement de vos crédits non
                  utilisés dans les 14 jours suivant l&apos;achat.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">
                  Pourquoi ces prix sont-ils supérieurs aux API directes ?
                </h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nous appliquons une marge de {markup}% pour couvrir l&apos;infrastructure,
                  l&apos;interface et le support. Malgré cela, c&apos;est jusqu&apos;à
                  10 fois moins cher qu&apos;un abonnement ChatGPT Plus pour un usage modéré.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">Prêt à commencer ?</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            Créez votre compte et profitez d&apos;1€ de crédits offerts pour
            essayer tous les modèles.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">
                <CreditCard className="w-5 h-5 mr-2" />
                Créer mon compte gratuit
              </Button>
            </Link>
            <Link href="/comparatif">
              <Button variant="outline" size="lg">
                Voir le comparatif <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
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
