import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { MifaShowcase } from "@/components/mifa/mifa-showcase";
import { Shield, Users, Clock, Sparkles, Heart, ArrowRight, Check, Settings, MessageSquare, CreditCard, BookOpen, Lightbulb, PenTool, AlertTriangle, TrendingUp, Moon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SafetyAccordion } from "@/components/mifa/safety-accordion";
import { ContentAccordion } from "@/components/ui/content-accordion";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getAppSettings, getModelsFromDB } from "@/lib/pricing-db";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "fr"
      ? "mifa by iaiaz - L'IA en famille, en confiance"
      : "mifa by iaiaz - AI for families, with trust",
    description: locale === "fr"
      ? "Le plan mifal pour utiliser l'IA ensemble. Controle parental, supervision adaptee a l'age, credits partages."
      : "The family plan to use AI together. Parental controls, age-appropriate supervision, shared credits.",
  };
}

export default async function MifaLandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings, models] = await Promise.all([
    getTranslations("mifa.landing"),
    getAppSettings(),
    getModelsFromDB(),
  ]);

  // Calculate dynamic credit estimates based on Mifa markup and recommended model
  const recommendedModel = models.find((m) => m.is_recommended);
  const mifaMultiplier = settings.mifaMarkupMultiplier;
  const creditBudget = 5; // 5€ included per child

  // Token estimates per use case
  const useCaseTokens = {
    homework: { input: 500, output: 1000 },   // complex question / homework help
    essay: { input: 800, output: 3000 },       // dissertation / long text
    simple: { input: 150, output: 300 },       // simple question
  };

  let estimateHomework = 40;
  let estimateEssays = 15;
  let estimateQuestions = 170;

  if (recommendedModel) {
    const costPerHomework =
      ((useCaseTokens.homework.input * recommendedModel.input_price +
        useCaseTokens.homework.output * recommendedModel.output_price) /
        1_000_000) *
      mifaMultiplier;
    const costPerEssay =
      ((useCaseTokens.essay.input * recommendedModel.input_price +
        useCaseTokens.essay.output * recommendedModel.output_price) /
        1_000_000) *
      mifaMultiplier;
    const costPerQuestion =
      ((useCaseTokens.simple.input * recommendedModel.input_price +
        useCaseTokens.simple.output * recommendedModel.output_price) /
        1_000_000) *
      mifaMultiplier;

    if (costPerHomework > 0) estimateHomework = Math.floor(creditBudget / costPerHomework);
    if (costPerEssay > 0) estimateEssays = Math.floor(creditBudget / costPerEssay);
    if (costPerQuestion > 0) estimateQuestions = Math.floor(creditBudget / costPerQuestion);
  }

  return (
    <div className="min-h-screen">
      {/* Mifa Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/mifa" className="flex items-baseline gap-1.5">
            <span className="text-5xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              m&#299;f&#257;
            </span>
            <span className="text-sm text-[var(--muted-foreground)] font-medium">
              by iaiaz
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t("nav.pricing")}
            </a>
            <a href="#faq" className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t("nav.faq")}
            </a>
            <a href="#safety" className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t("nav.safety")}
            </a>
            <LanguageSwitcher />
            <Link href="/auth/login" className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t("nav.login")}
            </Link>
            <Link href={{ pathname: "/auth/signup", query: { intent: "mifa" } } as never}>
              <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
                {t("hero.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950">
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-primary-500 via-accent-500 to-primary-600 bg-clip-text text-transparent">
                {t("hero.title1")}<br />{t("hero.title2")}
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-[var(--muted-foreground)] mb-4 font-medium">
              {t("hero.subtitle")}
            </p>
            <p className="text-lg text-[var(--muted-foreground)] mb-8">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={{ pathname: "/auth/signup", query: { intent: "mifa" } } as never}>
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white px-8 py-3 text-lg">
                  {t("hero.cta")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-3 text-lg">
                  {t("hero.learnMore")}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-16 bg-[var(--muted)]/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">{t("problem.title")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6">
              <p className="text-4xl font-bold text-primary-600 mb-2">73%</p>
              <p className="text-[var(--muted-foreground)]">{t("problem.stat1")}</p>
            </div>
            <div className="p-6">
              <p className="text-4xl font-bold text-accent-600 mb-2">84%</p>
              <p className="text-[var(--muted-foreground)]">{t("problem.stat2")}</p>
            </div>
            <div className="p-6">
              <p className="text-4xl font-bold text-primary-600 mb-2">92%</p>
              <p className="text-[var(--muted-foreground)]">{t("problem.stat3")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Parent quotes — emotional hook */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {["quote1", "quote2", "quote3"].map((q) => (
              <div key={q} className="p-6 rounded-2xl bg-[var(--background)] border border-[var(--border)] shadow-sm">
                <p className="text-lg italic leading-relaxed">
                  &laquo;&nbsp;{t(`tension.${q}`)}&nbsp;&raquo;
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-semibold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            {t("tension.resolution")}
          </p>
        </div>
      </section>

      {/* 5 reasons — numbered pillars with need tags */}
      <section id="features" className="py-20 bg-[var(--muted)]/30">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("why.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">{t("why.subtitle")}</p>
          <div className="space-y-4">
            {["visibility", "rules", "growth", "budget", "learning"].map((key, i) => (
              <div key={key} className="flex items-start gap-5 p-5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center">
                  <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">{i + 1}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-600 dark:text-primary-400">{t(`why.${key}.need`)}</span>
                  <h3 className="text-lg font-bold mb-1">{t(`why.${key}.title`)}</h3>
                  <p className="text-[var(--muted-foreground)]">{t(`why.${key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Mifas */}
      <section className="py-20 bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950/30 dark:via-[var(--background)] dark:to-accent-950/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">{t("mifas.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto">{t("mifas.subtitle")}</p>

          <MifaShowcase />

          {/* Feature bullets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["feature1", "feature2", "feature3"].map((key, i) => (
              <div key={key} className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">{["🎛️", "⚡", "🤝"][i]}</span>
                </div>
                <h3 className="font-bold mb-1">{t(`mifas.${key}.title`)}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t(`mifas.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenario — Homework insight story */}
      <section className="py-20 bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-[var(--background)] dark:to-orange-950/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-3">{t("scenario.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">{t("scenario.subtitle")}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Step 1 — Child struggles */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">1</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{t("scenario.step1title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("scenario.step1desc")}</p>
              </div>
              {/* Arrow connector (hidden on mobile) */}
              <div className="hidden md:block absolute top-7 -right-3 w-6">
                <ArrowRight className="w-6 h-6 text-[var(--muted-foreground)]/40" />
              </div>
            </div>

            {/* Step 2 — Parent gets alert */}
            <div className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">2</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{t("scenario.step2title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] italic">{t("scenario.step2desc")}</p>
              </div>
              <div className="hidden md:block absolute top-7 -right-3 w-6">
                <ArrowRight className="w-6 h-6 text-[var(--muted-foreground)]/40" />
              </div>
            </div>

            {/* Step 3 — Parent helps */}
            <div>
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <span className="text-2xl">3</span>
                </div>
                <h3 className="font-bold text-lg mb-2">{t("scenario.step3title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("scenario.step3desc")}</p>
              </div>
            </div>
          </div>

          {/* Closing line */}
          <p className="text-center text-lg font-semibold text-amber-700 dark:text-amber-300">
            {t("scenario.closing")}
          </p>
        </div>
      </section>

      {/* Dashboard Preview — Visual mockup + controls */}
      <section className="py-20 bg-[var(--muted)]/30">
        <div className="max-w-5xl mx-auto px-4">
          <ContentAccordion
            title={t("dashboard.title")}
            subtitle={t("dashboard.subtitle")}
            icon="dashboard"
            iconColor="text-purple-600"
            gradientFrom="from-purple-50/50"
            gradientTo="to-indigo-50/50"
            defaultOpen
          >
            {/* Visual dashboard mockup */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg overflow-hidden">
              {/* Mock header bar */}
              <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--muted)]/50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{t("dashboard.mockTitle")}</span>
                <div className="w-16" />
              </div>

              <div className="p-5 space-y-5">
                {/* Credit balance bar */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary-50 to-white dark:from-primary-950/30 dark:to-[var(--background)] border border-primary-200 dark:border-primary-800">
                  <div>
                    <p className="text-xs text-[var(--muted-foreground)]">{t("dashboard.mockBalance")}</p>
                    <p className="text-lg font-bold text-green-600">3,20&#x20AC;</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--muted-foreground)]">{t("dashboard.mockUsed")}</p>
                    <p className="text-lg font-bold text-primary-600">1,80&#x20AC;</p>
                  </div>
                </div>

                {/* Mock family members */}
                <div className="space-y-3">
                  {/* Parent row */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)]">
                    <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Sophie <span className="font-normal text-[var(--muted-foreground)]">— maman</span></p>
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)]">0,45&#x20AC;</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                        <div className="h-full rounded-full bg-primary-400" style={{ width: "25%" }} />
                      </div>
                    </div>
                  </div>

                  {/* Child 1 - guided mode (Emma, 13) */}
                  <div className="p-3 rounded-lg border border-[var(--border)] space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-sm font-bold">
                        E
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Emma <span className="font-normal text-[var(--muted-foreground)]">— fille, 13 ans, 4ème</span></p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">{t("dashboard.mockGuided")}</span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">0,87&#x20AC; &middot; 8 conv.</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                          <div className="h-full rounded-full bg-accent-400" style={{ width: "48%" }} />
                        </div>
                      </div>
                    </div>
                    {/* Topic pills */}
                    <div className="flex items-center gap-1.5 pl-12">
                      <span className="text-[10px] text-[var(--muted-foreground)]">{t("dashboard.mockTopics")} :</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{t("dashboard.emmaTopic1")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{t("dashboard.emmaTopic2")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">{t("dashboard.emmaTopic3")}</span>
                    </div>
                  </div>

                  {/* Child 2 - trusted mode (Lucas, 16) */}
                  <div className="p-3 rounded-lg border border-[var(--border)] space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold">
                        L
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">Lucas <span className="font-normal text-[var(--muted-foreground)]">— fils, 16 ans, 1ère</span></p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{t("dashboard.mockTrusted")}</span>
                          </div>
                          <span className="text-xs text-[var(--muted-foreground)]">0,48&#x20AC; &middot; 5 conv.</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                          <div className="h-full rounded-full bg-green-400" style={{ width: "27%" }} />
                        </div>
                      </div>
                    </div>
                    {/* Topic pills */}
                    <div className="flex items-center gap-1.5 pl-12">
                      <span className="text-[10px] text-[var(--muted-foreground)]">{t("dashboard.mockTopics")} :</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t("dashboard.lucasTopic1")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">{t("dashboard.lucasTopic2")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{t("dashboard.lucasTopic3")}</span>
                    </div>
                  </div>
                </div>

                {/* Smart insights panel */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">{t("dashboard.insightsTitle")}</p>
                  {/* Difficulty detection — the key selling point */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200">{t("dashboard.insightDifficulty")}</p>
                  </div>
                  {/* Late usage alert */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                    <Moon className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-purple-800 dark:text-purple-200">{t("dashboard.insightLateUsage")}</p>
                  </div>
                  {/* Positive insight */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-green-800 dark:text-green-200">{t("dashboard.insightPositive")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* What you control — grid below the mockup */}
          <div className="max-w-3xl mx-auto">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent-600" />
              {t("dashboard.controlTitle")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["ctrl1", "ctrl2", "ctrl3", "ctrl4", "ctrl5"].map((k) => (
                <div key={k} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                  <Shield className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{t(`dashboard.${k}`)}</p>
                </div>
              ))}
            </div>
          </div>
          </ContentAccordion>
        </div>
      </section>

      {/* Credit Explainer — before pricing to show value first */}
      <section id="credits" className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <ContentAccordion
            title={t("credits.title")}
            subtitle={t("credits.subtitle")}
            icon="coins"
            iconColor="text-amber-600"
            gradientFrom="from-amber-50/50"
            gradientTo="to-yellow-50/50"
            defaultOpen
          >
            {/* Prominent analogy callout */}
          <div className="max-w-2xl mx-auto mb-12 p-6 rounded-2xl bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/50 dark:to-accent-950/50 border border-primary-200 dark:border-primary-800">
            <p className="text-lg text-center leading-relaxed">
              <strong className="font-bold">{t("credits.analogyBold")}</strong>
              <br />
              {t("credits.analogyRest")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="text-center bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-1">~{estimateHomework}</p>
                <p className="font-medium mb-1">{t("credits.homework")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("credits.homeworkDesc")}</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-3">
                  <PenTool className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-4xl font-extrabold bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent mb-1">~{estimateEssays}</p>
                <p className="font-medium mb-1">{t("credits.essays")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("credits.essaysDesc")}</p>
              </CardContent>
            </Card>
            <Card className="text-center bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <Lightbulb className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-green-600 bg-clip-text text-transparent mb-1">~{estimateQuestions}</p>
                <p className="font-medium mb-1">{t("credits.questions")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("credits.questionsDesc")}</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)] max-w-xl mx-auto">{t("credits.note")}</p>
          </div>
          </ContentAccordion>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-[var(--muted)]/30">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">{t("pricing.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12">{t("pricing.subtitle")}</p>

          {/* Single pricing card */}
          <Card className="border-2 border-primary-200 dark:border-primary-800 max-w-lg mx-auto">
            <CardContent className="pt-8 pb-8">
              <h3 className="text-3xl font-extrabold mb-1 text-center"><span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">m&#299;f&#257;</span></h3>
              <div className="text-center mb-2">
                <span className="text-5xl font-extrabold">9,90&#x20AC;</span>
                <span className="text-[var(--muted-foreground)] text-lg"> /{t("pricing.perChild")}</span>
              </div>
              <p className="text-center text-green-600 dark:text-green-400 font-semibold text-sm mb-6">
                {t("pricing.creditsIncluded")}
              </p>

              {/* Degressive pricing note */}
              <div className="mb-6 p-4 rounded-lg bg-accent-50 dark:bg-accent-950/30 border border-accent-200 dark:border-accent-800 text-center">
                <p className="font-semibold text-accent-700 dark:text-accent-300">{t("pricing.extraChild")}</p>
                <p className="text-2xl font-extrabold text-accent-600">{t("pricing.extraChildPrice")}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t("pricing.extraChildNote")}</p>
              </div>

              {/* Pricing examples table */}
              <div className="mb-6 rounded-lg border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--muted)]/50">
                      <th className="px-4 py-2 text-left font-medium text-[var(--muted-foreground)]">{locale === "fr" ? "Enfants" : "Children"}</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">/{t("pricing.month")}</th>
                      <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">{locale === "fr" ? "Budget IA inclus" : "AI budget included"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { kids: 1, price: "9,90", credits: "5" },
                      { kids: 2, price: "19,80", credits: "10" },
                      { kids: 3, price: "24,80", credits: "15" },
                      { kids: 4, price: "29,80", credits: "20" },
                    ].map((row) => (
                      <tr key={row.kids} className="border-t border-[var(--border)]">
                        <td className="px-4 py-2">{row.kids}</td>
                        <td className="px-4 py-2 text-right font-semibold">{row.price}&#x20AC;</td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-green-600 font-semibold">{row.credits}&#x20AC;</span>
                          <span className="ml-1 text-[10px] font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full">{locale === "fr" ? "inclus" : "incl."}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="space-y-3 mb-8">
                {["creditsPerChild", "dashboard", "supervision", "reports", "topup", "discount"].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {t(`pricing.features.${f}`)}
                      {f === "creditsPerChild" && (
                        <a href="#credits" className="ml-1 text-primary-600 hover:underline text-xs font-medium">
                          {t("pricing.whatIsThis")}
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-xs text-center text-[var(--muted-foreground)] mb-4">{t("pricing.creditsRollover")}</p>

              <Link href={{ pathname: "/auth/signup", query: { intent: "mifa" } } as never} className="block">
                <Button className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white text-lg py-3">
                  {t("pricing.cta")}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Safety & Commitment — Collapsed Accordion */}
      <SafetyAccordion
        title={t("safety.title")}
        subtitle={t("safety.subtitle")}
        guardian={t("safety.guardian")}
        guardianDesc={t("safety.guardianDesc")}
        serious={t("safety.serious")}
        seriousDesc={t("safety.seriousDesc")}
        hotlines={t("safety.hotlines")}
        filSante={t("safety.filSante")}
        suicide={t("safety.suicide")}
        harcelement={t("safety.harcelement")}
        enfance={t("safety.enfance")}
        noDo={t("safety.noDo")}
        noDoDesc={t("safety.noDoDesc")}
        parentsSee={t("safety.parentsSee")}
        parentsSeeDesc={t("safety.parentsSeeDesc")}
      />

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t("faq.title")}</h2>
          <div className="space-y-6">
            {["safety", "ages", "conversations", "cancel", "topup"].map((q) => (
              <div key={q} className="border border-[var(--border)] rounded-lg p-6">
                <h3 className="font-semibold mb-2">{t(`faq.${q}.q`)}</h3>
                <p className="text-[var(--muted-foreground)]">{t(`faq.${q}.a`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
        <div className="max-w-3xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-xl mb-8 text-white/80">{t("cta.subtitle")}</p>
          <Link href={{ pathname: "/auth/signup", query: { intent: "mifa" } } as never}>
            <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
              {t("cta.button")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
