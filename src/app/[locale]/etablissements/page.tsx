import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Building2,
  Users,
  BarChart3,
  Shield,
  Check,
  ArrowRight,
  GraduationCap,
  Sparkles,
  PiggyBank,
  Lock,
  Scale,
  Eye,
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
  const t = await getTranslations({ locale, namespace: "metadata.etablissements" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/etablissements";
  const enPath = "/en/schools";

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

export default async function EtablissementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("etablissements");
  const tHome = await getTranslations("home");

  // Build FAQs from translations
  const faqs = [
    { question: t("faq.equity.question"), answer: t("faq.equity.answer") },
    { question: t("faq.visibility.question"), answer: t("faq.visibility.answer") },
    { question: t("faq.pricing.question"), answer: t("faq.pricing.answer") },
    { question: t("faq.models.question"), answer: t("faq.models.answer") },
  ];

  // Build breadcrumb items from translations
  const baseUrl = "https://www.iaiaz.com";
  const breadcrumbItems = [
    {
      name: t("breadcrumb.home"),
      url: locale === "fr" ? baseUrl : `${baseUrl}/en`,
    },
    {
      name: t("breadcrumb.schools"),
      url: locale === "fr" ? `${baseUrl}/etablissements` : `${baseUrl}/en/schools`,
    },
  ];

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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6 shadow-sm">
            <Building2 className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t("hero.title")}
            <br />
            <span className="text-primary-600 dark:text-primary-400">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="mailto:secretariat@girafestudio.fr?subject=Demande%20d%27information%20-%20Établissement">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                {t("hero.cta")}
              </Button>
            </a>
            <Link href="/comparatif">
              <Button variant="outline" size="lg">
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.noSubscription")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.budgetControl")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.allModels")}
            </span>
          </div>
        </section>

        {/* Why iaiaz for Schools */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">
              {t("benefits.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("benefits.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Scale className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.equity.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.equity.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <PiggyBank className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.cost.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.cost.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.understanding.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.understanding.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Eye className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.visibility.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.visibility.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Users className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.multiModel.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.multiModel.description")}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("benefits.privacy.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("benefits.privacy.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing Models */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("pricing.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="relative">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">{t("pricing.pilot.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                  50{currencySymbol}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("pricing.pilot.description")}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.pilot.feature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.pilot.feature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.pilot.feature3")}
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="relative border-primary-500 dark:border-primary-400 border-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                {t("pricing.popular")}
              </div>
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">{t("pricing.class.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                  200{currencySymbol}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("pricing.class.description")}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.class.feature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.class.feature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.class.feature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.class.feature4")}
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="relative">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-2">{t("pricing.institution.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                  {t("pricing.institution.price")}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("pricing.institution.description")}
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.institution.feature1")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.institution.feature2")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.institution.feature3")}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {t("pricing.institution.feature4")}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">
              {t("howItWorks.title")}
            </h2>
            <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">1</span>
                </div>
                <h3 className="font-bold mb-2">{t("howItWorks.step1.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("howItWorks.step1.description")}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">2</span>
                </div>
                <h3 className="font-bold mb-2">{t("howItWorks.step2.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("howItWorks.step2.description")}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">3</span>
                </div>
                <h3 className="font-bold mb-2">{t("howItWorks.step3.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("howItWorks.step3.description")}
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-600 dark:text-primary-400">4</span>
                </div>
                <h3 className="font-bold mb-2">{t("howItWorks.step4.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("howItWorks.step4.description")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Target Audience */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {t("audience.title")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold">{t("audience.universities")}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold">{t("audience.businessSchools")}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold">{t("audience.highSchools")}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold">{t("audience.training")}</h3>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Academic Integrity Note */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="font-bold mb-2 text-blue-800 dark:text-blue-200">
              {t("integrity.title")}
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {t("integrity.content")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <a href="mailto:secretariat@girafestudio.fr?subject=Demande%20d%27information%20-%20Établissement">
              <Button size="lg">
                {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
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
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {tHome("footer.madeBy")}{" "}
              <a
                href="https://www.girafestudio.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {tHome("footer.madeByStudio")}
              </a>
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
