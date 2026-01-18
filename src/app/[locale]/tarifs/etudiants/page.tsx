import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, ArrowRight, Info, Zap, Shield, CreditCard, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { getPricingData, type DBModel } from "@/lib/pricing-db";
import { PricingCalculator } from "../calculator";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tarifsEtudiants" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/tarifs/etudiants";
  const enPath = "/en/pricing/students";

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords").split(", "),
    alternates: {
      canonical: locale === "fr" ? `${baseUrl}${frPath}` : `${baseUrl}${enPath}`,
      languages: {
        "fr-FR": `${baseUrl}${frPath}`,
        en: `${baseUrl}${enPath}`,
      },
    },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: locale === "fr" ? `${baseUrl}${frPath}` : `${baseUrl}${enPath}`,
    },
  };
}

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
function estimateMessageCost(input: number, output: number, markupMultiplier: number, currencySymbol: string): string {
  const cost = ((500 * input + 500 * output) / 1_000_000) * markupMultiplier;
  if (cost < 0.001) return `<${currencySymbol}0.001`;
  return currencySymbol + cost.toFixed(4);
}

export default async function TarifsEtudiantsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tarifsEtudiants");
  const tHome = await getTranslations("home");

  // Fetch pricing data from database
  const { settings, models } = await getPricingData();
  const { markup, markupMultiplier } = settings;
  const providers = groupModelsByProvider(models);
  const currencySymbol = locale === "fr" ? "€" : "$";

  const baseUrl = "https://www.iaiaz.com";

  // Dynamic FAQs for structured data
  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4", { markup }) },
  ];

  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.pricing"), url: locale === "fr" ? `${baseUrl}/tarifs` : `${baseUrl}/en/pricing` },
          { name: t("breadcrumb.students"), url: locale === "fr" ? `${baseUrl}/tarifs/etudiants` : `${baseUrl}/en/pricing/students` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
            <GraduationCap className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> {t("hero.freeCredit")}
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> {t("hero.noExpiration")}
            </span>
            <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" /> {t("hero.noCommitment")}
            </span>
          </div>
        </div>

        {/* How it works */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary-600 dark:text-primary-400" /> {t("howItWorks.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">1.</div>
              <h3 className="font-medium mb-1">{t("howItWorks.step1.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step1.description")}
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">2.</div>
              <h3 className="font-medium mb-1">{t("howItWorks.step2.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step2.description")}
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-2">3.</div>
              <h3 className="font-medium mb-1">{t("howItWorks.step3.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>
        </section>

        {/* Calculator */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("calculator.title")}
          </h2>
          <PricingCalculator models={models} markupMultiplier={markupMultiplier} />
        </section>

        {/* Pricing Tables by Provider */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("pricePerModel.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8">
            {t("pricePerModel.subtitle")}
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
                          <th className="p-3">{t("pricePerModel.model")}</th>
                          <th className="p-3 text-right">{t("pricePerModel.inputPrice")}</th>
                          <th className="p-3 text-right">{t("pricePerModel.outputPrice")}</th>
                          <th className="p-3 text-right">{t("pricePerModel.estimatedCost")}</th>
                          <th className="p-3">{t("pricePerModel.description")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {provider.models.map((model) => (
                          <tr key={model.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                            <td className="p-3 font-medium">
                              {model.name}
                              {model.is_recommended && (
                                <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 px-2 py-0.5 rounded">
                                  {t("pricePerModel.recommended")}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {currencySymbol}{(model.input_price * markupMultiplier).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono">
                              {currencySymbol}{(model.output_price * markupMultiplier).toFixed(2)}
                            </td>
                            <td className="p-3 text-right font-mono text-primary-600 dark:text-primary-400">
                              {estimateMessageCost(model.input_price, model.output_price, markupMultiplier, currencySymbol)}
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
            {t("creditPacks.title")}
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">{currencySymbol}5</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("creditPacks.credits", { amount: 5 })}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {t("creditPacks.messages", { count: 250 })}
                </div>
              </CardContent>
            </Card>
            <Card className="ring-2 ring-primary-500 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                {t("creditPacks.popular")}
              </div>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">{currencySymbol}10</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("creditPacks.credits", { amount: 10 })}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {t("creditPacks.messages", { count: 500 })}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">{currencySymbol}20</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("creditPacks.credits", { amount: 20 })}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {t("creditPacks.messages", { count: 1000 })}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center bg-[var(--muted)]">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold mb-1">{t("creditPacks.customAmount")}</div>
                <div className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("creditPacks.customLabel")}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {t("creditPacks.customDescription")}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("faq.title")}
          </h2>
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">{t("faq.q1")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("faq.a1")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">{t("faq.q2")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("faq.a2")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">{t("faq.q3")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("faq.a3")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-medium mb-2">{t("faq.q4")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("faq.a4", { markup })}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">
                <CreditCard className="w-5 h-5 mr-2" />
                {t("cta.button")}
              </Button>
            </Link>
            <Link href="/comparatif/etudiants">
              <Button variant="outline" size="lg">
                {t("cta.compare")} <ArrowRight className="w-5 h-5 ml-2" />
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
              {tHome("footer.tagline")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {tHome("footer.copyright")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {tHome("footer.madeIn")}
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              {tHome("footer.cgu")}
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              {tHome("footer.cgv")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              {tHome("footer.privacy")}
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              {tHome("footer.cookies")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
