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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
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
  const tHome = await getTranslations("home");

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

      <Header />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 text-sm font-medium mb-6 shadow-sm">
            <GraduationCap className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t("hero.title")}
            <br />
            <span className="text-primary-600">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/auth/signup">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                {t("hero.cta")}
              </Button>
            </Link>
            <Link href="/comparatif">
              <Button variant="outline" size="lg">
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
        </section>

        {/* Budget Section */}
        <section className="bg-[var(--muted)] py-16">
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
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              {t("multipleModels.title")}
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange-600">C</span>
                  </div>
                  <div>
                    <strong>Claude</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.claudeDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-green-600">G</span>
                  </div>
                  <div>
                    <strong>GPT-4</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.gptDesc")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-blue-600">G</span>
                  </div>
                  <div>
                    <strong>Gemini</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t("multipleModels.geminiDesc")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-purple-600">M</span>
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

        {/* Ethics Note */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="font-bold mb-2 text-amber-800">
              {t("ethics.title")}
            </h3>
            <p className="text-sm text-amber-700">
              {t("ethics.content")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-8 md:p-12 text-center">
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
            <p className="text-sm text-[var(--muted-foreground)] mt-4">
              {t("cta.note")}
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600">iaiaz</div>
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
