import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { CREDIT_PACKS } from "@/lib/pricing";
import { getPricingData } from "@/lib/pricing-db";
import { FAQSection } from "@/components/seo/faq-section";
import {
  OrganizationSchema,
  ProductSchema,
  WebsiteSchema,
} from "@/components/seo/structured-data";
import {
  Sparkles,
  CreditCard,
  Zap,
  Shield,
  ArrowRight,
  Check,
  MessageSquare,
  FileText,
  Code,
  HelpCircle,
  Calculator,
} from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  // Fetch pricing data from database
  const { settings, models: allModels } = await getPricingData();
  const { markupMultiplier } = settings;

  // Get first 4 models for display (prefer recommended ones)
  const recommendedModels = allModels.filter((m) => m.is_recommended);
  const otherModels = allModels.filter((m) => !m.is_recommended);
  const displayModels = [...recommendedModels, ...otherModels].slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <OrganizationSchema locale={locale} />
      <ProductSchema locale={locale} />
      <WebsiteSchema locale={locale} />

      <Header />

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            {t("hero.title")} <br />
            <span className="text-primary-600 dark:text-primary-400">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                {t("hero.cta")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t("hero.ctaSecondary")}
              </Button>
            </a>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-4">
            {t("hero.freeCredit")}
          </p>
        </div>
      </section>

      {/* What $1 gets you - PROMINENT */}
      <section className="py-12 px-4 bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/30 dark:to-[var(--background)] border-y border-primary-100 dark:border-primary-900/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-600 text-white text-sm font-semibold mb-4">
              {t("value.badge")}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">
              {t("value.title")}
            </h2>
            <p className="text-[var(--muted-foreground)] mt-2">
              {t("value.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Claude Sonnet - Recommended */}
            <Card className="relative overflow-hidden border-2 border-primary-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-primary-600 text-white text-center py-1 text-sm font-medium">
                {t("value.recommended")}
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">Claude Sonnet 4</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  {t("value.claudeDesc")}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm">{t("value.simpleQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">~67</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.complexQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold">~20</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.essays")}</span>
                    </div>
                    <span className="text-2xl font-bold">~7</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPT-5 - OpenAI */}
            <Card className="relative overflow-hidden border-2 border-emerald-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white text-center py-1 text-sm font-medium">
                {t("value.new")}
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">GPT-5</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  {t("value.gptDesc")}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm">{t("value.simpleQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">~100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.complexQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold">~30</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.essays")}</span>
                    </div>
                    <span className="text-2xl font-bold">~10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gemini Flash - Economy */}
            <Card className="relative overflow-hidden border-2 border-blue-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-sm font-medium">
                {t("value.ultraEconomic")}
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">Gemini Flash</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  {t("value.geminiDesc")}
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm">{t("value.simpleQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">~3000+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.complexQuestions")}</span>
                    </div>
                    <span className="text-2xl font-bold">~900+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">{t("value.essays")}</span>
                    </div>
                    <span className="text-2xl font-bold">~300+</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/auth/signup">
              <Button size="lg">
                {t("value.claimOffer")}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] mt-3">
              {t("value.moreModels")}
            </p>
          </div>
        </div>
      </section>

      {/* How it works - Simple explanation */}
      <section id="how-it-works" className="py-16 px-4 bg-[var(--muted)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t("howItWorks.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>

          {/* Step by step */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step1.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step1.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step2.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step2.description")}
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">{t("howItWorks.step3.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("howItWorks.step3.description")}
              </p>
            </div>
          </div>

          {/* Real cost examples */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="font-semibold text-lg">{t("howItWorks.realCosts.title")}</h3>
              </div>
              <p className="text-[var(--muted-foreground)] mb-6">
                {t("howItWorks.realCosts.subtitle")}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("howItWorks.realCosts.simpleQuestion")}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("howItWorks.realCosts.simpleQuestionExample")}
                    </p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">~$0.01</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("howItWorks.realCosts.reviewText")}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("howItWorks.realCosts.reviewTextExample")}
                    </p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">~$0.03</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <Code className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("howItWorks.realCosts.debugCode")}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("howItWorks.realCosts.debugCodeExample")}
                    </p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">~$0.02</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div>
                    <p className="font-medium">{t("howItWorks.realCosts.prepareExam")}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("howItWorks.realCosts.prepareExamExample")}
                    </p>
                    <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">~$0.15</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison with subscriptions */}
          <Card className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 border-primary-200 dark:border-primary-800/50">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 text-center">
                {t("howItWorks.comparison.title")}
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4">
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">{t("howItWorks.comparison.chatgptPlus")}</p>
                  <p className="text-3xl font-bold text-red-500">$20<span className="text-base font-normal">/mo</span></p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    {t("howItWorks.comparison.chatgptPlusNote")}
                  </p>
                </div>
                <div className="text-center p-4">
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">{t("howItWorks.comparison.iaiazAvg")}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">$2-5<span className="text-base font-normal">/mo</span></p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    {t("howItWorks.comparison.iaiazAvgNote")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            {t("features.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("features.noSubscription.title")}
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  {t("features.noSubscription.description")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-accent-600 dark:text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t("features.allModels.title")}</h3>
                <p className="text-[var(--muted-foreground)]">
                  {t("features.allModels.description")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {t("features.transparent.title")}
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  {t("features.transparent.description")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-16 px-4 bg-[var(--muted)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t("models.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
            {t("models.subtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayModels.map((model) => (
              <Card
                key={model.id}
                className={
                  model.is_recommended ? "ring-2 ring-primary-500" : ""
                }
              >
                <CardContent className="pt-6">
                  {model.is_recommended && (
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-1 rounded-full">
                      {t("models.recommended")}
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mt-2">{model.name}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    {model.provider}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {model.description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("models.avgCost")}
                    </p>
                    <p className="text-lg font-semibold text-primary-600 dark:text-primary-400">
                      ~${((model.input_price * 500 + model.output_price * 500) * markupMultiplier / 1_000_000).toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
            {t("models.moreModels")}
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            {t("pricing.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12">
            {t("pricing.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={pack.popular ? "ring-2 ring-primary-500" : ""}
              >
                <CardContent className="pt-6 text-center">
                  {pack.popular && (
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/40 px-2 py-1 rounded-full">
                      {t("pricing.popular")}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mt-2">{pack.name}</h3>
                  <p className="text-4xl font-bold my-4">${pack.price}</p>
                  <p className="text-[var(--muted-foreground)] mb-2">
                    {pack.description}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-6">
                    {t("pricing.simpleQuestions", { count: Math.round(pack.credits / 0.02) })}
                  </p>
                  <ul className="text-sm text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                      {t("pricing.credits", { amount: pack.credits })}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                      {t("pricing.allModels")}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                      {t("pricing.noExpiration")}
                    </li>
                  </ul>
                  <Link href="/auth/signup">
                    <Button
                      variant={pack.popular ? "primary" : "outline"}
                      className="w-full"
                    >
                      {t("hero.cta")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[var(--muted)] to-primary-50 dark:to-primary-950/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            {t("cta.subtitle")}
          </p>
          <div className="inline-flex flex-wrap justify-center gap-3 mb-8 text-sm">
            <span className="px-3 py-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full font-medium">
              {t("cta.questionsWithClaude")}
            </span>
            <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-medium">
              {t("cta.questionsWithGpt")}
            </span>
            <span className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-medium">
              {t("cta.questionsWithGemini")}
            </span>
          </div>
          <Link href="/auth/signup">
            <Button size="lg">
              {t("value.claimOffer")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-[var(--muted-foreground)] mt-4">
            {t("cta.noCommitment")}
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {t("footer.tagline")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("footer.copyright")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {t("footer.madeIn")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {t("footer.madeBy")}{" "}
              <a
                href="https://www.girafestudio.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {t("footer.madeByStudio")}
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              {t("footer.cgu")}
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              {t("footer.cgv")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              {t("footer.privacy")}
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              {t("footer.cookies")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
