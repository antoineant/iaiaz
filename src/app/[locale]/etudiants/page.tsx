import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  GraduationCap,
  BookOpen,
  PenTool,
  Code,
  Languages,
  Calculator,
  Check,
  ArrowRight,
  Sparkles,
  PiggyBank,
  Building2,
  Users,
  BarChart3,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Footer } from "@/components/footer";
import { LanguageSwitcher } from "@/components/language-switcher";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.etudiants" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/etudiants";
  const enPath = "/en/students";

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

export default async function EtudiantsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("etudiants");

  // Build FAQs from translations
  const faqs = [
    { question: t("faq.adapted.question"), answer: t("faq.adapted.answer") },
    { question: t("faq.cost.question"), answer: t("faq.cost.answer") },
    { question: t("faq.dissertation.question"), answer: t("faq.dissertation.answer") },
    { question: t("faq.bestAI.question"), answer: t("faq.bestAI.answer") },
  ];

  // Build breadcrumb items from translations
  const baseUrl = "https://www.iaiaz.com";
  const breadcrumbItems = [
    {
      name: t("breadcrumb.home"),
      url: locale === "fr" ? baseUrl : `${baseUrl}/en`,
    },
    {
      name: t("breadcrumb.students"),
      url: locale === "fr" ? `${baseUrl}/etudiants` : `${baseUrl}/en/students`,
    },
  ];

  // Use case icons mapping
  const useCaseIcons = {
    revision: BookOpen,
    dissertation: PenTool,
    programming: Code,
    languages: Languages,
    mathScience: Calculator,
    research: GraduationCap,
  };

  const useCaseKeys = [
    "revision",
    "dissertation",
    "programming",
    "languages",
    "mathScience",
    "research",
  ] as const;

  // Currency symbol based on locale
  const currencySymbol = locale === "fr" ? "€" : "$";

  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Study by iaiaz — Branded Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/etudiants" className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Study
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
            <LanguageSwitcher />
            <Link href="/auth/login" className="hidden sm:block text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              {t("nav.login")}
            </Link>
            <Link href="/auth/signup">
              <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
                {t("hero.cta")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — Familia-style gradient */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950">
          <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6 shadow-sm">
                <GraduationCap className="w-4 h-4" />
                {t("hero.badge")}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                <span className="bg-gradient-to-r from-primary-600 via-accent-600 to-primary-600 bg-clip-text text-transparent">
                  {t("hero.title")}
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary-600 via-accent-600 to-primary-600 bg-clip-text text-transparent">
                  {t("hero.titleHighlight")}
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-[var(--muted-foreground)] mb-8 font-medium">
                {t("hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link href="/auth/signup">
                  <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white px-8 py-3 text-lg">
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("hero.cta")}
                  </Button>
                </Link>
                <Link href="/comparatif">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 py-3 text-lg">
                    {t("hero.ctaSecondary")}
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> {t("hero.noCreditCard")}
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> {t("hero.noCommitment")}
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> {t("hero.noExpiration")}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Budget Section */}
        <section id="pricing" className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PiggyBank className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold">{t("budget.title")}</h2>
            </div>
            <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              {t("budget.subtitle")}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    1{currencySymbol}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {t("budget.example1.usage")}
                  </div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    5{currencySymbol}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {t("budget.example2.usage")}
                  </div>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    10{currencySymbol}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">
                    {t("budget.example3.usage")}
                  </div>
                </CardContent>
              </Card>
            </div>
            <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
              {t("budget.note")}
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("useCases.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("useCases.subtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCaseKeys.map((key) => {
              const Icon = useCaseIcons[key];
              return (
                <Card key={key}>
                  <CardContent className="pt-6">
                    <Icon className="w-8 h-8 text-primary-600 mb-4" />
                    <h3 className="font-bold text-lg mb-2">
                      {t(`useCases.${key}.title`)}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)] mb-4">
                      {t(`useCases.${key}.description`)}
                    </p>
                    <div className="bg-[var(--muted)] rounded-lg p-3 text-sm italic">
                      &quot;{t(`useCases.${key}.example`)}&quot;
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Why Multiple Models */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              {t("multipleModels.title")}
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange-600 dark:text-orange-400">C</span>
                  </div>
                  <div>
                    <strong>Claude</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.claudeDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-green-600 dark:text-green-400">G</span>
                  </div>
                  <div>
                    <strong>GPT-5</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.gptDesc")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-blue-600 dark:text-blue-400">G</span>
                  </div>
                  <div>
                    <strong>Gemini</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.geminiDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-purple-600 dark:text-purple-400">M</span>
                  </div>
                  <div>
                    <strong>Mistral</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.mistralDesc")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("testimonials.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <p className="italic mb-4">&quot;{t("testimonials.t1.quote")}&quot;</p>
                <p className="text-sm text-[var(--muted-foreground)] font-medium">
                  — {t("testimonials.t1.author")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="italic mb-4">&quot;{t("testimonials.t2.quote")}&quot;</p>
                <p className="text-sm text-[var(--muted-foreground)] font-medium">
                  — {t("testimonials.t2.author")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="italic mb-4">&quot;{t("testimonials.t3.quote")}&quot;</p>
                <p className="text-sm text-[var(--muted-foreground)] font-medium">
                  — {t("testimonials.t3.author")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pour les établissements — Fold-in section */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold">{t("schools.title")}</h2>
            </div>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("schools.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("schools.equity.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("schools.equity.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <PiggyBank className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("schools.cost.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("schools.cost.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Eye className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("schools.visibility.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("schools.visibility.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("schools.privacy.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("schools.privacy.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-center mt-8">
              <a href="mailto:contact@iaiaz.com?subject=Demande%20d%27information%20-%20Établissement">
                <Button size="lg" variant="outline">
                  {t("schools.cta")} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Pour les formateurs — Fold-in section */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold">{t("trainers.title")}</h2>
          </div>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("trainers.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("trainers.dashboard.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("trainers.dashboard.description")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("trainers.analytics.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("trainers.analytics.description")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("trainers.insights.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("trainers.insights.description")}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-8">
            <a href="mailto:contact@iaiaz.com?subject=Créer%20mon%20espace%20classe">
              <Button size="lg" variant="outline">
                {t("trainers.cta")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>
        </section>

        {/* Ethics Note */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="font-bold mb-2 text-amber-800 dark:text-amber-200">
              {t("ethics.title")}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t("ethics.content")}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-[var(--muted)] py-16">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">FAQ</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <h3 className="font-bold mb-2">{faq.question}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA — Familia-style gradient */}
        <section className="py-20 bg-gradient-to-r from-primary-600 to-accent-600">
          <div className="max-w-3xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-xl mb-8 text-white/80">
              {t("cta.subtitle")}
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-primary-700 hover:bg-gray-100 px-8 py-3 text-lg font-semibold">
                {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-white/60 mt-4">
              {t("cta.note")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
