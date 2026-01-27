import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  Calculator,
  Zap,
  Shield,
  CreditCard,
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
  const t = await getTranslations({ locale, namespace: "metadata.alternativeChatgpt" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/alternative-chatgpt";
  const enPath = "/en/chatgpt-alternative";

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

export default async function AlternativeChatgptPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("alternativeChatgpt");

  const baseUrl = "https://www.iaiaz.com";
  const currencySymbol = locale === "fr" ? "€" : "$";

  // FAQs for structured data
  const faqs = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
    { question: t("faq.q4.question"), answer: t("faq.q4.answer") },
  ];

  const breadcrumbItems = [
    { name: t("breadcrumb.home"), url: locale === "fr" ? baseUrl : `${baseUrl}/en` },
    { name: t("breadcrumb.alternative"), url: locale === "fr" ? `${baseUrl}/alternative-chatgpt` : `${baseUrl}/en/chatgpt-alternative` },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <Header />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-primary-100 dark:from-green-900/40 dark:to-primary-900/40 text-green-700 dark:text-green-300 text-sm font-medium mb-6 shadow-sm">
            <Zap className="w-4 h-4" />
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
            <Link href="/tarifs">
              <Button variant="outline" size="lg">
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              {t("comparison.title")}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-[var(--background)] rounded-xl shadow-lg overflow-hidden">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left"></th>
                    <th className="p-4 text-center">
                      <div className="font-bold text-lg">ChatGPT Plus</div>
                      <div className="text-sm text-[var(--muted-foreground)]">20{currencySymbol}/mois</div>
                    </th>
                    <th className="p-4 text-center bg-primary-50 dark:bg-primary-950">
                      <div className="font-bold text-lg text-primary-600">iaiaz</div>
                      <div className="text-sm text-[var(--muted-foreground)]">{t("comparison.payPerUse")}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.rows.gpt5")}</td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.rows.claude")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.rows.gemini")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.rows.subscription")}</td>
                    <td className="p-4 text-center"><span className="text-red-600 font-medium">{t("comparison.required")}</span></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><span className="text-green-600 font-medium">{t("comparison.none")}</span></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.rows.lowUsageCost")}</td>
                    <td className="p-4 text-center"><span className="font-bold">20{currencySymbol}</span></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><span className="font-bold text-green-600">~2{currencySymbol}</span></td>
                  </tr>
                  <tr>
                    <td className="p-4 font-medium">{t("comparison.rows.freeCredit")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center bg-primary-50/50 dark:bg-primary-950/50"><span className="text-green-600 font-medium">1{currencySymbol} {t("comparison.offered")}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calculator className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold">{t("calculator.title")}</h2>
          </div>
          <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {t("calculator.subtitle")}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="text-center border-2 border-transparent hover:border-primary-200 transition-colors">
              <CardContent className="pt-6">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">{t("calculator.light.label")}</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">~2{currencySymbol}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{t("calculator.light.desc")}</div>
                <div className="text-xs text-green-600 mt-2">{t("calculator.savings", { amount: "18" })}</div>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-transparent hover:border-primary-200 transition-colors">
              <CardContent className="pt-6">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">{t("calculator.moderate.label")}</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">~8{currencySymbol}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{t("calculator.moderate.desc")}</div>
                <div className="text-xs text-green-600 mt-2">{t("calculator.savings", { amount: "12" })}</div>
              </CardContent>
            </Card>
            <Card className="text-center border-2 border-transparent hover:border-primary-200 transition-colors">
              <CardContent className="pt-6">
                <div className="text-sm text-[var(--muted-foreground)] mb-2">{t("calculator.heavy.label")}</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">~15{currencySymbol}</div>
                <div className="text-sm text-[var(--muted-foreground)]">{t("calculator.heavy.desc")}</div>
                <div className="text-xs text-green-600 mt-2">{t("calculator.savings", { amount: "5" })}</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Why Switch */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">{t("whySwitch.title")}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold mb-2">{t("whySwitch.reason1.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("whySwitch.reason1.desc")}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold mb-2">{t("whySwitch.reason2.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("whySwitch.reason2.desc")}</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold mb-2">{t("whySwitch.reason3.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("whySwitch.reason3.desc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("faq.title")}</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <h3 className="font-bold mb-2">{faq.question}</h3>
                  <p className="text-[var(--muted-foreground)]">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
            <Link href="/auth/signup">
              <Button size="lg">
                {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] mt-4">{t("cta.note")}</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
