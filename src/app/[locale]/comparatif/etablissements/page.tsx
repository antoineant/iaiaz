import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, Building2, ArrowRight, Users, Shield, CreditCard } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "metadata.comparatifEtablissements" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/comparatif/etablissements";
  const enPath = "/en/compare/schools";

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

export default async function ComparatifEtablissementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comparatifEtablissements");

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
          { name: t("breadcrumb.schools"), url: locale === "fr" ? `${baseUrl}/comparatif/etablissements` : `${baseUrl}/en/compare/schools` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
            <Building2 className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("hero.title")}</h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">{t("hero.subtitle")}</p>
        </div>

        {/* Comparison Table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("table.title")}</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--border)]">
                      <th className="text-left p-4">{t("table.feature")}</th>
                      <th className="text-center p-4 bg-primary-50 dark:bg-primary-950/30">
                        <div className="font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
                      </th>
                      <th className="text-center p-4">
                        <div className="font-bold">ChatGPT Team</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border)]">
                      <td className="p-4 font-medium">{t("table.pricePerStudent")}</td>
                      <td className="p-4 text-center bg-green-50 dark:bg-green-950/20">{t("table.priceIaiaz")}</td>
                      <td className="p-4 text-center text-[var(--muted-foreground)]">{t("table.priceChatgpt")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="p-4 font-medium">{t("table.minSeats")}</td>
                      <td className="p-4 text-center bg-green-50 dark:bg-green-950/20">{t("table.minIaiaz")}</td>
                      <td className="p-4 text-center text-[var(--muted-foreground)]">{t("table.minChatgpt")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="p-4 font-medium">{t("table.budgetControl")}</td>
                      <td className="p-4 text-center bg-green-50 dark:bg-green-950/20">{t("table.budgetIaiaz")}</td>
                      <td className="p-4 text-center text-[var(--muted-foreground)]">{t("table.budgetChatgpt")}</td>
                    </tr>
                    <tr className="border-b border-[var(--border)]">
                      <td className="p-4 font-medium">{t("table.multiModel")}</td>
                      <td className="p-4 text-center bg-green-50 dark:bg-green-950/20">{t("table.multiIaiaz")}</td>
                      <td className="p-4 text-center text-[var(--muted-foreground)]">{t("table.multiChatgpt")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Benefits */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-8">{t("benefits.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-bold mb-2">{t("benefits.cost.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.cost.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">{t("benefits.flex.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.flex.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold mb-2">{t("benefits.control.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.control.description")}</p>
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
        <section className="text-center bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:contact@iaiaz.com?subject=Demande%20établissement">
              <Button size="lg">{t("cta.button")}</Button>
            </a>
            <Link href="/tarifs/etablissements">
              <Button variant="outline" size="lg">{t("cta.pricing")} <ArrowRight className="w-5 h-5 ml-2" /></Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
