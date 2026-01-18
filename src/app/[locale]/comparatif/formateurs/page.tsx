import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, Eye, EyeOff, ArrowRight, BarChart3, AlertTriangle, Users } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "metadata.comparatifFormateurs" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/comparatif/formateurs";
  const enPath = "/en/compare/trainers";

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

export default async function ComparatifFormateursPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comparatifFormateurs");

  const baseUrl = "https://www.iaiaz.com";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.compare"), url: locale === "fr" ? `${baseUrl}/comparatif` : `${baseUrl}/en/compare` },
          { name: t("breadcrumb.trainers"), url: locale === "fr" ? `${baseUrl}/comparatif/formateurs` : `${baseUrl}/en/compare/trainers` },
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("hero.title")}</h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">{t("hero.subtitle")}</p>
        </div>

        {/* Comparison */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Without iaiaz */}
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4">
                  <EyeOff className="w-5 h-5" />
                  <h3 className="font-bold">{t("comparison.without.title")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">✗</span>
                    {t("comparison.without.point1")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">✗</span>
                    {t("comparison.without.point2")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">✗</span>
                    {t("comparison.without.point3")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500 mt-1">✗</span>
                    {t("comparison.without.point4")}
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* With iaiaz */}
            <Card className="border-green-200 dark:border-green-800 ring-2 ring-primary-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-4">
                  <Eye className="w-5 h-5" />
                  <h3 className="font-bold">{t("comparison.with.title")}</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    {t("comparison.with.point1")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    {t("comparison.with.point2")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    {t("comparison.with.point3")}
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
                    {t("comparison.with.point4")}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Value */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-8">{t("value.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-bold mb-2">{t("value.insight.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="font-bold mb-2">{t("value.gaps.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("value.gaps.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold mb-2">{t("value.adapt.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("value.adapt.description")}</p>
            </div>
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
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:secretariat@girafestudio.fr?subject=Créer%20mon%20espace%20classe">
              <Button size="lg">{t("cta.button")}</Button>
            </a>
            <Link href="/tarifs/formateurs">
              <Button variant="outline" size="lg">{t("cta.pricing")} <ArrowRight className="w-5 h-5 ml-2" /></Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
