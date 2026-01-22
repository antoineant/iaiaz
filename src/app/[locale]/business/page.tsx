import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import {
  Building2,
  Users,
  BarChart3,
  Shield,
  Check,
  ArrowRight,
  Sparkles,
  PiggyBank,
  Lock,
  Eye,
  Zap,
  Calculator,
  Scale,
  FileText,
  Code,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.business" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/business";
  const enPath = "/en/business";

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

export default async function BusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("business");
  const currencySymbol = locale === "fr" ? "€" : "$";

  // Build FAQs from translations
  const faqs = [
    { question: t("faq.billing.question"), answer: t("faq.billing.answer") },
    { question: t("faq.limits.question"), answer: t("faq.limits.answer") },
    { question: t("faq.privacy.question"), answer: t("faq.privacy.answer") },
    { question: t("faq.models.question"), answer: t("faq.models.answer") },
    { question: t("faq.onboarding.question"), answer: t("faq.onboarding.answer") },
    { question: t("faq.commitment.question"), answer: t("faq.commitment.answer") },
  ];

  // Build breadcrumb items from translations
  const baseUrl = "https://www.iaiaz.com";
  const breadcrumbItems = [
    {
      name: t("breadcrumb.home"),
      url: locale === "fr" ? baseUrl : `${baseUrl}/en`,
    },
    {
      name: t("breadcrumb.business"),
      url: locale === "fr" ? `${baseUrl}/business` : `${baseUrl}/en/business`,
    },
  ];

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
            <NextLink href="/auth/signup/business">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                {t("hero.cta")}
              </Button>
            </NextLink>
            <a href="mailto:contact@iaiaz.com?subject=Demande%20démo%20-%20Entreprise">
              <Button variant="outline" size="lg">
                {t("hero.ctaSecondary")}
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.noPerSeat")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.allModels")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.analytics")}
            </span>
          </div>
        </section>

        {/* Problem Section */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">
              {t("problem.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("problem.subtitle")}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <PiggyBank className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.waste.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.waste.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.vendor.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.vendor.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <Eye className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.visibility.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.visibility.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("solution.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("solution.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-primary-200 dark:border-primary-800">
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.multiModel.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("solution.multiModel.description")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary-200 dark:border-primary-800">
              <CardContent className="pt-6">
                <Calculator className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.payPerUse.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("solution.payPerUse.description")}
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary-200 dark:border-primary-800">
              <CardContent className="pt-6">
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.analytics.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {t("solution.analytics.description")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Comparison Section */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)] py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              {t("comparison.title")}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4"></th>
                    <th className="text-center py-4 px-4">{t("comparison.chatgpt")}</th>
                    <th className="text-center py-4 px-4">{t("comparison.claude")}</th>
                    <th className="text-center py-4 px-4 bg-primary-100 dark:bg-primary-900/40 rounded-t-lg font-bold text-primary-700 dark:text-primary-300">iaiaz</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">{t("comparison.pricing")}</td>
                    <td className="text-center py-4 px-4">{t("comparison.perSeat")}</td>
                    <td className="text-center py-4 px-4">{t("comparison.perSeat")}</td>
                    <td className="text-center py-4 px-4 bg-primary-50 dark:bg-primary-900/20 font-medium text-primary-700 dark:text-primary-300">{t("comparison.payPerUse")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">{t("comparison.priceLabel")}</td>
                    <td className="text-center py-4 px-4">24{currencySymbol}/user</td>
                    <td className="text-center py-4 px-4">24{currencySymbol}/user</td>
                    <td className="text-center py-4 px-4 bg-primary-50 dark:bg-primary-900/20 font-medium text-primary-700 dark:text-primary-300">~3-10{currencySymbol}/user*</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">{t("comparison.models")}</td>
                    <td className="text-center py-4 px-4">GPT-4</td>
                    <td className="text-center py-4 px-4">Claude</td>
                    <td className="text-center py-4 px-4 bg-primary-50 dark:bg-primary-900/20 font-medium text-primary-700 dark:text-primary-300">{t("comparison.allModels")}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">{t("comparison.analyticsLabel")}</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-primary-50 dark:bg-primary-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">{t("comparison.limits")}</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-primary-50 dark:bg-primary-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-[var(--muted-foreground)] mt-4">
              {t("comparison.note")}
            </p>
          </div>
        </section>

        {/* Use Cases by Department */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("useCases.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("useCases.subtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Scale className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("useCases.legal.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("useCases.legal.description")}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {t("useCases.legal.model")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Code className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("useCases.tech.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("useCases.tech.description")}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {t("useCases.tech.model")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <TrendingUp className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("useCases.marketing.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("useCases.marketing.description")}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {t("useCases.marketing.model")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <Briefcase className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("useCases.finance.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("useCases.finance.description")}
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  {t("useCases.finance.model")}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">
              {t("pricing.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("pricing.subtitle")}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Starter */}
              <Card>
                <CardContent className="pt-8 pb-8">
                  <h3 className="font-bold text-xl mb-2">{t("pricing.starter.name")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("pricing.starter.description")}</p>
                  <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    99{currencySymbol}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mb-6">{t("pricing.perMonth")}</div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.starter.feature1")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.starter.feature2")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.starter.feature3")}
                    </li>
                  </ul>
                  <NextLink href="/auth/signup/business" className="block">
                    <Button variant="outline" className="w-full">{t("pricing.cta")}</Button>
                  </NextLink>
                </CardContent>
              </Card>

              {/* Business */}
              <Card className="border-primary-500 dark:border-primary-400 border-2 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded-full">
                  {t("pricing.popular")}
                </div>
                <CardContent className="pt-8 pb-8">
                  <h3 className="font-bold text-xl mb-2">{t("pricing.business.name")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("pricing.business.description")}</p>
                  <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    249{currencySymbol}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mb-6">{t("pricing.perMonth")}</div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.business.feature1")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.business.feature2")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.business.feature3")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.business.feature4")}
                    </li>
                  </ul>
                  <NextLink href="/auth/signup/business" className="block">
                    <Button className="w-full">{t("pricing.cta")}</Button>
                  </NextLink>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card>
                <CardContent className="pt-8 pb-8">
                  <h3 className="font-bold text-xl mb-2">{t("pricing.enterprise.name")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("pricing.enterprise.description")}</p>
                  <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {t("pricing.enterprise.price")}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)] mb-6">{t("pricing.enterprise.unit")}</div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.enterprise.feature1")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.enterprise.feature2")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.enterprise.feature3")}
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500" />
                      {t("pricing.enterprise.feature4")}
                    </li>
                  </ul>
                  <a href="mailto:contact@iaiaz.com?subject=Demande%20Enterprise">
                    <Button variant="outline" className="w-full">{t("pricing.contact")}</Button>
                  </a>
                </CardContent>
              </Card>
            </div>
            <p className="text-center text-xs text-[var(--muted-foreground)] mt-6">
              {t("pricing.note")}
            </p>
          </div>
        </section>

        {/* Security */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            {t("security.title")}
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("security.subtitle")}
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold mb-2">{t("security.eu.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("security.eu.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold mb-2">{t("security.gdpr.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("security.gdpr.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <FileText className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold mb-2">{t("security.audit.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("security.audit.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Eye className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold mb-2">{t("security.noTraining.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("security.noTraining.description")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">
              {t("faq.title")}
            </h2>
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

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <NextLink href="/auth/signup/business">
                <Button size="lg">
                  {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </NextLink>
              <a href="mailto:contact@iaiaz.com?subject=Demande%20démo%20-%20Entreprise">
                <Button variant="outline" size="lg">
                  {t("cta.demo")}
                </Button>
              </a>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] mt-4">
              {t("cta.note")}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
