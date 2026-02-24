import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  Shield,
  AlertTriangle,
  Lock,
  Brain,
  ArrowRight,
  Sparkles,
  Check,
  Heart,
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
  const t = await getTranslations({ locale, namespace: "metadata.protegerEnfantsIa" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/blog/proteger-enfants-ia";
  const enPath = "/en/blog/proteger-enfants-ia";

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
      type: "article",
    },
  };
}

export default async function ProtegerEnfantsIaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("protegerEnfantsIa");

  const baseUrl = "https://www.iaiaz.com";

  // FAQs for structured data
  const faqs = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
    { question: t("faq.q4.question"), answer: t("faq.q4.answer") },
    { question: t("faq.q5.question"), answer: t("faq.q5.answer") },
  ];

  const breadcrumbItems = [
    { name: t("breadcrumb.home"), url: locale === "fr" ? baseUrl : `${baseUrl}/en` },
    { name: t("breadcrumb.blog"), url: locale === "fr" ? `${baseUrl}/blog` : `${baseUrl}/en/blog` },
    { name: t("breadcrumb.article"), url: locale === "fr" ? `${baseUrl}/blog/proteger-enfants-ia` : `${baseUrl}/en/blog/proteger-enfants-ia` },
  ];

  const riskIcons = [
    <Shield key="shield" className="w-6 h-6 text-red-500" />,
    <AlertTriangle key="alert" className="w-6 h-6 text-orange-500" />,
    <Lock key="lock" className="w-6 h-6 text-blue-500" />,
    <Brain key="brain" className="w-6 h-6 text-purple-500" />,
  ];

  const riskKeys = ["inappropriateContent", "misinformation", "dataPrivacy", "overReliance"] as const;

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <Header />

      <main>
        {/* Hero / Article Header */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-sm mb-4">
              <BookOpen className="w-4 h-4" />
              {t("hero.badge")}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {t("hero.title")}
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-4">
              {t("hero.updated")}
            </p>
          </div>
        </section>

        {/* Why kids use AI */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-center">{t("whyKids.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-4">{t("whyKids.p1")}</p>
            <p className="text-[var(--muted-foreground)] mb-4">{t("whyKids.p2")}</p>
            <p className="text-[var(--muted-foreground)]">{t("whyKids.p3")}</p>
          </div>
        </section>

        {/* Risks */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("risks.title")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {riskKeys.map((key, index) => (
              <Card key={key}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    {riskIcons[index]}
                    <h3 className="text-lg font-bold">{t(`risks.${key}.title`)}</h3>
                  </div>
                  <p className="text-[var(--muted-foreground)]">{t(`risks.${key}.description`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 5 Rules to Protect Them */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t("rules.title")}</h2>
            <div className="space-y-6">
              {([1, 2, 3, 4, 5] as const).map((num) => (
                <Card key={num}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-pink-600">{num}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{t(`rules.rule${num}.title`)}</h3>
                        <p className="text-[var(--muted-foreground)]">{t(`rules.rule${num}.description`)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Parental Control Tools Comparison */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("comparison.title")}</h2>
          <div className="overflow-x-auto">
            <table className="w-full bg-[var(--background)] rounded-xl shadow-lg overflow-hidden">
              <thead>
                <tr className="border-b bg-[var(--muted)]">
                  <th className="p-4 text-left">{t("comparison.feature")}</th>
                  <th className="p-4 text-center">ChatGPT</th>
                  <th className="p-4 text-center">Google Gemini</th>
                  <th className="p-4 text-center text-pink-600 font-bold">mifa</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">{t("comparison.rows.parentalControls")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptParental")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googleParental")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaParental")}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">{t("comparison.rows.ageAdaptation")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptAge")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googleAge")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaAge")}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">{t("comparison.rows.creditControl")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptCredit")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googleCredit")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaCredit")}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">{t("comparison.rows.quietHours")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptQuiet")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googleQuiet")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaQuiet")}</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">{t("comparison.rows.parentDashboard")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptDashboard")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googleDashboard")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaDashboard")}</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium">{t("comparison.rows.pricing")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.chatgptPricing")}</td>
                  <td className="p-4 text-center">{t("comparison.rows.googlePricing")}</td>
                  <td className="p-4 text-center text-pink-600 font-medium">{t("comparison.rows.mifaPricing")}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-4 text-center">
            {t("comparison.note")}{" "}
            <a
              href={locale === "fr" ? "/blog/alternative-chatgpt-famille" : "/en/blog/alternative-chatgpt-famille"}
              className="text-pink-600 hover:underline"
            >
              {t("comparison.linkText")}
            </a>
          </p>
        </section>

        {/* FAQ */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
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
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950 dark:to-rose-950 rounded-2xl p-8 md:p-12 text-center">
            <Heart className="w-10 h-10 text-pink-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-pink-500" />
                <span>{t("cta.feature1")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-pink-500" />
                <span>{t("cta.feature2")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-pink-500" />
                <span>{t("cta.feature3")}</span>
              </div>
            </div>
            <Link href="/mifa">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                <Sparkles className="w-5 h-5 mr-2" />
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
