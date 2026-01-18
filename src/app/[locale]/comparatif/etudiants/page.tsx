import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, X, Zap, DollarSign, Brain, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.comparatifEtudiants" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/comparatif/etudiants";
  const enPath = "/en/compare/students";

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

export default async function ComparatifEtudiantsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comparatifEtudiants");
  const tHome = await getTranslations("home");

  const baseUrl = "https://www.iaiaz.com";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
  ];

  const comparisonData = [
    { feature: t("table.price"), iaiaz: t("table.priceIaiaz"), chatgpt: t("table.priceChatgpt"), winner: "iaiaz" },
    { feature: t("table.models"), iaiaz: t("table.modelsIaiaz"), chatgpt: t("table.modelsChatgpt"), winner: "iaiaz" },
    { feature: t("table.commitment"), iaiaz: t("table.commitmentIaiaz"), chatgpt: t("table.commitmentChatgpt"), winner: "iaiaz" },
    { feature: t("table.freeCredits"), iaiaz: t("table.freeCreditsIaiaz"), chatgpt: t("table.freeCreditsChatgpt"), winner: "iaiaz" },
    { feature: t("table.limit"), iaiaz: t("table.limitIaiaz"), chatgpt: t("table.limitChatgpt"), winner: "iaiaz" },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.compare"), url: locale === "fr" ? `${baseUrl}/comparatif` : `${baseUrl}/en/compare` },
          { name: t("breadcrumb.students"), url: locale === "fr" ? `${baseUrl}/comparatif/etudiants` : `${baseUrl}/en/compare/students` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6">
            <GraduationCap className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> {t("hero.save")}
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Zap className="w-4 h-4" /> {t("hero.models")}
            </span>
          </div>
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
                        <div className="text-sm text-[var(--muted-foreground)]">{t("table.payAsYouGo")}</div>
                      </th>
                      <th className="text-center p-4">
                        <div className="font-bold">ChatGPT Plus</div>
                        <div className="text-sm text-[var(--muted-foreground)]">$20/mois</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className={`p-4 text-center ${row.winner === "iaiaz" ? "bg-green-50 dark:bg-green-950/20" : ""}`}>
                          {row.iaiaz}
                        </td>
                        <td className="p-4 text-center text-[var(--muted-foreground)]">{row.chatgpt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Savings Examples */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-8">{t("savings.title")}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold mb-2">{t("savings.light.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("savings.light.description")}</p>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{t("savings.light.cost")}</div>
                <div className="text-sm text-green-600 dark:text-green-400">{t("savings.light.save")}</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold mb-2">{t("savings.regular.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("savings.regular.description")}</p>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{t("savings.regular.cost")}</div>
                <div className="text-sm text-green-600 dark:text-green-400">{t("savings.regular.save")}</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <h3 className="font-bold mb-2">{t("savings.intensive.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">{t("savings.intensive.description")}</p>
                <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{t("savings.intensive.cost")}</div>
                <div className="text-sm text-green-600 dark:text-green-400">{t("savings.intensive.save")}</div>
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
        <section className="text-center bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg">{t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" /></Button>
            </Link>
            <Link href="/tarifs/etudiants">
              <Button variant="outline" size="lg">{t("cta.pricing")}</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
            <p className="text-xs text-[var(--muted-foreground)]">{tHome("footer.tagline")}</p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">{tHome("footer.cgu")}</Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">{tHome("footer.privacy")}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
