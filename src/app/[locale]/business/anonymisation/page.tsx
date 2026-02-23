import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import {
  Shield,
  ShieldCheck,
  Check,
  ArrowRight,
  Lock,
  Eye,
  FileText,
  Laptop,
  Cloud,
  RefreshCw,
  Scale,
  Building2,
  Heart,
  Users,
  Download,
  Zap,
  X,
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
  const t = await getTranslations({ locale, namespace: "metadata.anonymisation" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/business/anonymisation";
  const enPath = "/en/business/anonymisation";

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

export default async function AnonymisationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("anonymisationPage");

  // Build FAQs from translations
  const faqs = [
    { question: t("faq.howItWorks.question"), answer: t("faq.howItWorks.answer") },
    { question: t("faq.dataTypes.question"), answer: t("faq.dataTypes.answer") },
    { question: t("faq.reversible.question"), answer: t("faq.reversible.answer") },
    { question: t("faq.platforms.question"), answer: t("faq.platforms.answer") },
    { question: t("faq.offline.question"), answer: t("faq.offline.answer") },
    { question: t("faq.pricing.question"), answer: t("faq.pricing.answer") },
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
    {
      name: t("breadcrumb.anonymisation"),
      url: locale === "fr" ? `${baseUrl}/business/anonymisation` : `${baseUrl}/en/business/anonymisation`,
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
        <section className="bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-[var(--background)] py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium mb-6">
              <ShieldCheck className="w-4 h-4" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {t("hero.title")}
              <br />
              <span className="text-green-600 dark:text-green-400">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="text-xl text-[var(--muted-foreground)] max-w-3xl mx-auto mb-8">
              {t("hero.subtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <NextLink href="/auth/signup?intent=business">
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <Download className="w-5 h-5 mr-2" />
                  {t("hero.cta")}
                </Button>
              </NextLink>
              <a href="mailto:contact@iaiaz.com?subject=Demo%20Anonymisation">
                <Button variant="outline" size="lg">
                  {t("hero.ctaSecondary")}
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> {t("hero.feature1")}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> {t("hero.feature2")}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" /> {t("hero.feature3")}
              </span>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="py-16 bg-[var(--muted)]">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t("problem.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("problem.subtitle")}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <Eye className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.training.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.training.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <Shield className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.gdpr.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.gdpr.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.secrets.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.secrets.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t("howItWorks.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>

            {/* Detailed Flow */}
            <div className="bg-white dark:bg-[var(--background)] rounded-2xl border border-[var(--border)] p-8 md:p-12 mb-12">
              <div className="grid md:grid-cols-5 gap-6 items-start">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold">1</div>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <FileText className="w-10 h-10 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("howItWorks.step1.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step1.description")}</p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center pt-16">
                  <ArrowRight className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>

                {/* Step 2 */}
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-500 text-white flex items-center justify-center text-lg font-bold">2</div>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center border-2 border-green-500">
                    <Laptop className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("howItWorks.step2.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step2.description")}</p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center pt-16">
                  <ArrowRight className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>

                {/* Step 3 */}
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold">3</div>
                  <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Cloud className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("howItWorks.step3.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("howItWorks.step3.description")}</p>
                </div>
              </div>

              {/* Key Point */}
              <div className="mt-8 pt-8 border-t border-[var(--border)] text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  {t("howItWorks.keyPoint")}
                </div>
              </div>
            </div>

            {/* Live Example */}
            <div className="bg-[var(--muted)] rounded-2xl p-8 md:p-12">
              <h3 className="text-xl font-bold text-center mb-6">{t("howItWorks.example.title")}</h3>
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
                  <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-3 uppercase tracking-wide">{t("howItWorks.example.original")}</p>
                  <p className="text-sm font-mono leading-relaxed">{t("howItWorks.example.originalText")}</p>
                </div>
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-3 uppercase tracking-wide">{t("howItWorks.example.anonymized")}</p>
                  <p className="text-sm font-mono leading-relaxed">{t("howItWorks.example.anonymizedText")}</p>
                </div>
              </div>
              <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
                {t("howItWorks.example.note")}
              </p>
            </div>
          </div>
        </section>

        {/* What Gets Anonymized */}
        <section className="py-16 bg-[var(--muted)]">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t("dataTypes.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("dataTypes.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {["names", "emails", "phones", "addresses", "iban", "dates", "companies", "custom"].map((type) => (
                <div key={type} className="bg-white dark:bg-[var(--background)] rounded-lg p-4 border border-[var(--border)] flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium">{t(`dataTypes.types.${type}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Use Cases */}
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t("industries.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("industries.subtitle")}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Scale className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-xl mb-2">{t("industries.legal.title")}</h3>
                  <p className="text-[var(--muted-foreground)] mb-4">{t("industries.legal.description")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.legal.useCase1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.legal.useCase2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.legal.useCase3")}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Building2 className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-xl mb-2">{t("industries.finance.title")}</h3>
                  <p className="text-[var(--muted-foreground)] mb-4">{t("industries.finance.description")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.finance.useCase1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.finance.useCase2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.finance.useCase3")}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Heart className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-xl mb-2">{t("industries.healthcare.title")}</h3>
                  <p className="text-[var(--muted-foreground)] mb-4">{t("industries.healthcare.description")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.healthcare.useCase1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.healthcare.useCase2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.healthcare.useCase3")}
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-primary-600 dark:text-primary-400 mb-4" />
                  <h3 className="font-bold text-xl mb-2">{t("industries.hr.title")}</h3>
                  <p className="text-[var(--muted-foreground)] mb-4">{t("industries.hr.description")}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.hr.useCase1")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.hr.useCase2")}
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {t("industries.hr.useCase3")}
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 bg-gradient-to-b from-green-50 to-white dark:from-green-950/30 dark:to-[var(--background)]">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
              {t("comparison.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("comparison.subtitle")}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm bg-white dark:bg-[var(--background)] rounded-xl border border-[var(--border)]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-6"></th>
                    <th className="text-center py-4 px-4">{t("comparison.chatgpt")}</th>
                    <th className="text-center py-4 px-4">{t("comparison.claude")}</th>
                    <th className="text-center py-4 px-4 bg-green-100 dark:bg-green-900/40 font-bold text-green-700 dark:text-green-300">iaiaz Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">{t("comparison.localAnon")}</td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">{t("comparison.noDataLeaks")}</td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">{t("comparison.gdprCompliant")}</td>
                    <td className="text-center py-4 px-4 text-[var(--muted-foreground)]">{t("comparison.partial")}</td>
                    <td className="text-center py-4 px-4 text-[var(--muted-foreground)]">{t("comparison.partial")}</td>
                    <td className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-6 font-medium">{t("comparison.reversible")}</td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="py-4 px-6 font-medium">{t("comparison.auditTrail")}</td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center py-4 px-4 bg-green-50 dark:bg-green-900/20"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-[var(--muted)]">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
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
        <section className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="bg-gradient-to-r from-green-100 to-green-50 dark:from-green-950 dark:to-green-900/50 rounded-2xl p-8 md:p-12 text-center">
              <ShieldCheck className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">
                {t("cta.title")}
              </h2>
              <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
                {t("cta.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <NextLink href="/auth/signup?intent=business">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </NextLink>
                <Link href="/business">
                  <Button variant="outline" size="lg">
                    {t("cta.learnMore")}
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-6">
                {t("cta.note")}
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
