import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, ArrowRight, Users, BarChart3, Eye, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tarifsFormateurs" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/tarifs/formateurs";
  const enPath = "/en/pricing/trainers";

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

export default async function TarifsFormateursPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tarifsFormateurs");

  const baseUrl = "https://www.iaiaz.com";
  const currencySymbol = locale === "fr" ? "€" : "$";
  const analyticsPrice = locale === "fr" ? "4,90" : "4.90";
  const analyticsTotalPrice = locale === "fr" ? "24,50" : "24.50";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.pricing"), url: locale === "fr" ? `${baseUrl}/tarifs` : `${baseUrl}/en/pricing` },
          { name: t("breadcrumb.trainers"), url: locale === "fr" ? `${baseUrl}/tarifs/formateurs` : `${baseUrl}/en/pricing/trainers` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 text-sm font-medium mb-6">
            <Eye className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Pricing Cards */}
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Student Usage */}
            <Card>
              <CardContent className="pt-8 pb-6 text-center">
                <Users className="w-10 h-10 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("pricing.usage.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                  {t("pricing.usage.price")}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("pricing.usage.unit")}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pricing.usage.description")}
                </p>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="ring-2 ring-primary-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                {t("pricing.analytics.badge")}
              </div>
              <CardContent className="pt-8 pb-6 text-center">
                <BarChart3 className="w-10 h-10 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("pricing.analytics.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                  {t("pricing.analytics.price")}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("pricing.analytics.unit")}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pricing.analytics.description")}
                </p>
              </CardContent>
            </Card>

            {/* Setup */}
            <Card>
              <CardContent className="pt-8 pb-6 text-center">
                <Zap className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("pricing.setup.title")}</h3>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {t("pricing.setup.price")}
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  &nbsp;
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pricing.setup.description")}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 max-w-2xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {t("pricing.feature1")}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {t("pricing.feature2")}
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                {t("pricing.feature3")}
              </span>
            </div>
          </div>
        </section>

        {/* Example Calculation */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center">{t("example.title")}</h2>
          <div className="max-w-xl mx-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{t("example.class")}</span>
                <span className="font-medium">30 {t("example.students")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{t("example.questions")}</span>
                <span className="font-medium">~50 / {t("example.perStudent")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{t("example.usageCost")}</span>
                <span className="font-medium">~{currencySymbol}50 / {t("example.semester")}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{t("example.analyticsCost")}</span>
                <span className="font-medium">{currencySymbol}{analyticsPrice} x 5 = {currencySymbol}{analyticsTotalPrice}</span>
              </div>
              <div className="flex justify-between items-center py-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg px-4 -mx-4">
                <span className="font-bold">{t("example.total")}</span>
                <span className="font-bold text-xl text-primary-600 dark:text-primary-400">~{currencySymbol}75 / {t("example.semester")}</span>
              </div>
            </div>
            <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
              {t("example.note")}
            </p>
          </div>
        </section>

        {/* Value */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("value.title")}</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight1.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight1.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight2.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight2.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight3.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight3.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight4.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight4.description")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">{faq.question}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:secretariat@girafestudio.fr?subject=Créer%20mon%20espace%20classe">
              <Button size="lg">
                {t("cta.button")}
              </Button>
            </a>
            <Link href="/comparatif/formateurs">
              <Button variant="outline" size="lg">
                {t("cta.compare")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
