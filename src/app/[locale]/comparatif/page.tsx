import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, X, Zap, DollarSign, Brain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.comparatif" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: locale === "fr"
      ? ["alternative chatgpt", "alternative chatgpt moins cher", "chatgpt gratuit", "chatgpt pas cher", "comparatif ia", "chatgpt vs claude", "gpt-4 gratuit", "ia sans abonnement"]
      : ["chatgpt alternative", "cheap chatgpt alternative", "free chatgpt", "cheap ai", "ai comparison", "chatgpt vs claude", "free gpt-4", "ai without subscription"],
    alternates: {
      canonical: locale === "fr" ? "https://www.iaiaz.com/comparatif" : "https://www.iaiaz.com/en/compare",
      languages: {
        "fr-FR": "https://www.iaiaz.com/comparatif",
        "en": "https://www.iaiaz.com/en/compare",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: locale === "fr" ? "https://www.iaiaz.com/comparatif" : "https://www.iaiaz.com/en/compare",
    },
  };
}

export default async function ComparatifPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comparatif");
  const tHome = await getTranslations("home");

  // Dynamic FAQs for structured data
  const comparatifFaqs = [
    { question: t("faq.mainDifference.question"), answer: t("faq.mainDifference.answer") },
    { question: t("faq.cheaper.question"), answer: t("faq.cheaper.answer") },
    { question: t("faq.whyChoose.question"), answer: t("faq.whyChoose.answer") },
  ];

  // Comparison data with translations
  const comparisonData = [
    {
      feature: t("features.minPrice"),
      iaiaz: t("features.minPriceIaiaz"),
      chatgpt: t("features.minPriceChatgpt"),
      iaiazWins: true,
    },
    {
      feature: t("features.gpt4Access"),
      iaiaz: t("features.included"),
      chatgpt: t("features.included"),
      iaiazWins: null,
    },
    {
      feature: t("features.claudeAccess"),
      iaiaz: t("features.allModels"),
      chatgpt: t("features.notAvailable"),
      iaiazWins: true,
    },
    {
      feature: t("features.geminiAccess"),
      iaiaz: t("features.allModels"),
      chatgpt: t("features.notAvailable"),
      iaiazWins: true,
    },
    {
      feature: t("features.mistralAccess"),
      iaiaz: t("features.allModels"),
      chatgpt: t("features.notAvailable"),
      iaiazWins: true,
    },
    {
      feature: t("features.commitment"),
      iaiaz: t("features.noCommitment"),
      chatgpt: t("features.monthlySubscription"),
      iaiazWins: true,
    },
    {
      feature: t("features.freeCredits"),
      iaiaz: t("features.freeCreditsIaiaz"),
      chatgpt: t("features.none"),
      iaiazWins: true,
    },
    {
      feature: t("features.fileUpload"),
      iaiaz: t("features.imagesPdf"),
      chatgpt: t("features.imagesPdf"),
      iaiazWins: null,
    },
    {
      feature: t("features.conversationHistory"),
      iaiaz: t("features.unlimited"),
      chatgpt: t("features.unlimited"),
      iaiazWins: null,
    },
    {
      feature: t("features.messageLimit"),
      iaiaz: t("features.noLimit"),
      chatgpt: t("features.gpt4Limit"),
      iaiazWins: true,
    },
  ];

  const useCases = [
    {
      title: t("useCases.occasional.title"),
      description: t("useCases.occasional.description"),
      iaiazCost: t("useCases.occasional.iaiazCost"),
      chatgptCost: t("useCases.occasional.chatgptCost"),
      savings: t("useCases.occasional.savings"),
    },
    {
      title: t("useCases.regular.title"),
      description: t("useCases.regular.description"),
      iaiazCost: t("useCases.regular.iaiazCost"),
      chatgptCost: t("useCases.regular.chatgptCost"),
      savings: t("useCases.regular.savings"),
    },
    {
      title: t("useCases.intensive.title"),
      description: t("useCases.intensive.description"),
      iaiazCost: t("useCases.intensive.iaiazCost"),
      chatgptCost: t("useCases.intensive.chatgptCost"),
      savings: t("useCases.intensive.savings"),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <FAQSchema faqs={comparatifFaqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: "https://www.iaiaz.com" + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.compare"), url: locale === "fr" ? "https://www.iaiaz.com/comparatif" : "https://www.iaiaz.com/en/compare" },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> {t("hero.saveUp")}
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> {t("hero.providers")}
            </span>
          </div>
        </div>

        {/* Comparison Table */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("comparison.title")}
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)]">
                      <th className="text-left p-4">{t("comparison.feature")}</th>
                      <th className="text-center p-4 bg-primary-50 dark:bg-primary-950/30">
                        <div className="font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
                        <div className="text-sm text-[var(--muted-foreground)]">
                          {t("comparison.payAsYouGo")}
                        </div>
                      </th>
                      <th className="text-center p-4">
                        <div className="font-bold">ChatGPT Plus</div>
                        <div className="text-sm text-[var(--muted-foreground)]">$20{t("comparison.perMonth")}</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td
                          className={`p-4 text-center ${
                            row.iaiazWins ? "bg-green-50 dark:bg-green-950/20" : ""
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
            {t("savings.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8">
            {t("savings.subtitle")}
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
                      <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
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
                  <div className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
                    {t("savings.saving")} {useCase.savings}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Multiple Models */}
        <section className="mb-20 bg-[var(--muted)] rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600 dark:text-primary-400" /> {t("multipleModels.title")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <strong>Claude</strong> {t("multipleModels.claudeBenefit")}
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <strong>GPT-4</strong> {t("multipleModels.gpt4Benefit")}
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <strong>Gemini</strong> {t("multipleModels.geminiBenefit")}
                </div>
              </div>
              <div className="flex gap-3">
                <Check className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <strong>Mistral</strong> {t("multipleModels.mistralBenefit")}
                </div>
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">
                  {t("multipleModels.withIaiaz")}
                </h3>
                <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
                  <li>• {t("multipleModels.brainstorm")}</li>
                  <li>• {t("multipleModels.writeEssay")}</li>
                  <li>• {t("multipleModels.saveWithMistral")}</li>
                  <li>• {t("multipleModels.compareResponses")}</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing Transparency */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-center mb-4 flex items-center justify-center gap-2">
            <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" /> {t("transparency.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
            {t("transparency.subtitle")}
          </p>
          <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">~100</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {t("transparency.gptMini")}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">~50</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {t("transparency.claudeSonnet")}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">~30</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {t("transparency.gpt4")}
                </div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">~200</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {t("transparency.mistralSmall")}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {t("cta.subtitle")}
          </p>
          <Link href="/auth/signup">
            <Button size="lg">
              {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
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
