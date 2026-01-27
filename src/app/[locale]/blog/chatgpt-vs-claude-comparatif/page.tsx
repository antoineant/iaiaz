import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  BookOpen,
  Code,
  PenTool,
  Brain,
  Zap,
  MessageSquare,
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
  const t = await getTranslations({ locale, namespace: "metadata.chatgptVsClaude" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/blog/chatgpt-vs-claude-comparatif";
  const enPath = "/en/blog/chatgpt-vs-claude-comparison";

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

export default async function ChatgptVsClaudePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("chatgptVsClaude");

  const baseUrl = "https://www.iaiaz.com";
  const currencySymbol = locale === "fr" ? "€" : "$";

  // FAQs for structured data
  const faqs = [
    { question: t("faq.q1.question"), answer: t("faq.q1.answer") },
    { question: t("faq.q2.question"), answer: t("faq.q2.answer") },
    { question: t("faq.q3.question"), answer: t("faq.q3.answer") },
  ];

  const breadcrumbItems = [
    { name: t("breadcrumb.home"), url: locale === "fr" ? baseUrl : `${baseUrl}/en` },
    { name: t("breadcrumb.blog"), url: locale === "fr" ? `${baseUrl}/blog` : `${baseUrl}/en/blog` },
    { name: t("breadcrumb.article"), url: locale === "fr" ? `${baseUrl}/blog/chatgpt-vs-claude-comparatif` : `${baseUrl}/en/blog/chatgpt-vs-claude-comparison` },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <Header />

      <main>
        {/* Hero / Article Header */}
        <section className="max-w-4xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm mb-4">
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

        {/* Quick Summary */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-xl font-bold mb-6 text-center">{t("summary.title")}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <span className="font-bold text-green-600">G</span>
                    </div>
                    <div>
                      <strong>ChatGPT (GPT-5)</strong>
                      <p className="text-xs text-[var(--muted-foreground)]">OpenAI</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">{t("summary.gpt.desc")}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" /> {t("summary.gpt.pro1")}
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" /> {t("summary.gpt.pro2")}
                    </div>
                    <div className="flex items-center gap-2 text-red-500">
                      <X className="w-4 h-4" /> {t("summary.gpt.con1")}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <span className="font-bold text-orange-600">C</span>
                    </div>
                    <div>
                      <strong>Claude (Sonnet/Opus)</strong>
                      <p className="text-xs text-[var(--muted-foreground)]">Anthropic</p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">{t("summary.claude.desc")}</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" /> {t("summary.claude.pro1")}
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" /> {t("summary.claude.pro2")}
                    </div>
                    <div className="flex items-center gap-2 text-red-500">
                      <X className="w-4 h-4" /> {t("summary.claude.con1")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Detailed Comparison */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("detailed.title")}</h2>

          {/* Use Case Comparisons */}
          <div className="space-y-8">
            {/* Writing */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <PenTool className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-bold">{t("detailed.writing.title")}</h3>
                </div>
                <p className="text-[var(--muted-foreground)] mb-4">{t("detailed.writing.intro")}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <strong className="text-green-700 dark:text-green-300">GPT-5</strong>
                    <p className="text-sm mt-1">{t("detailed.writing.gpt")}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <strong className="text-orange-700 dark:text-orange-300">Claude</strong>
                    <p className="text-sm mt-1">{t("detailed.writing.claude")}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <strong className="text-primary-700 dark:text-primary-300">{t("detailed.winner")}:</strong>
                  <span className="ml-2">{t("detailed.writing.winner")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Coding */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Code className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-bold">{t("detailed.coding.title")}</h3>
                </div>
                <p className="text-[var(--muted-foreground)] mb-4">{t("detailed.coding.intro")}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <strong className="text-green-700 dark:text-green-300">GPT-5</strong>
                    <p className="text-sm mt-1">{t("detailed.coding.gpt")}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <strong className="text-orange-700 dark:text-orange-300">Claude</strong>
                    <p className="text-sm mt-1">{t("detailed.coding.claude")}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <strong className="text-primary-700 dark:text-primary-300">{t("detailed.winner")}:</strong>
                  <span className="ml-2">{t("detailed.coding.winner")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Analysis */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-bold">{t("detailed.analysis.title")}</h3>
                </div>
                <p className="text-[var(--muted-foreground)] mb-4">{t("detailed.analysis.intro")}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <strong className="text-green-700 dark:text-green-300">GPT-5</strong>
                    <p className="text-sm mt-1">{t("detailed.analysis.gpt")}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <strong className="text-orange-700 dark:text-orange-300">Claude</strong>
                    <p className="text-sm mt-1">{t("detailed.analysis.claude")}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <strong className="text-primary-700 dark:text-primary-300">{t("detailed.winner")}:</strong>
                  <span className="ml-2">{t("detailed.analysis.winner")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Conversation */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-6 h-6 text-primary-600" />
                  <h3 className="text-lg font-bold">{t("detailed.conversation.title")}</h3>
                </div>
                <p className="text-[var(--muted-foreground)] mb-4">{t("detailed.conversation.intro")}</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <strong className="text-green-700 dark:text-green-300">GPT-5</strong>
                    <p className="text-sm mt-1">{t("detailed.conversation.gpt")}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <strong className="text-orange-700 dark:text-orange-300">Claude</strong>
                    <p className="text-sm mt-1">{t("detailed.conversation.claude")}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                  <strong className="text-primary-700 dark:text-primary-300">{t("detailed.winner")}:</strong>
                  <span className="ml-2">{t("detailed.conversation.winner")}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Price Comparison */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t("pricing.title")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full bg-[var(--background)] rounded-xl shadow-lg overflow-hidden">
                <thead>
                  <tr className="border-b bg-[var(--muted)]">
                    <th className="p-4 text-left">{t("pricing.service")}</th>
                    <th className="p-4 text-center">{t("pricing.price")}</th>
                    <th className="p-4 text-center">{t("pricing.models")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">ChatGPT Plus</td>
                    <td className="p-4 text-center">20{currencySymbol}/mois</td>
                    <td className="p-4 text-center">GPT-5 uniquement</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Claude Pro</td>
                    <td className="p-4 text-center">20{currencySymbol}/mois</td>
                    <td className="p-4 text-center">Claude uniquement</td>
                  </tr>
                  <tr className="border-b bg-primary-50/50 dark:bg-primary-950/50">
                    <td className="p-4 font-medium text-primary-600">iaiaz</td>
                    <td className="p-4 text-center font-medium text-primary-600">{t("pricing.payPerUse")}</td>
                    <td className="p-4 text-center text-primary-600">GPT-5 + Claude + Gemini + Mistral</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <Card className="border-2 border-primary-200 dark:border-primary-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-bold">{t("verdict.title")}</h2>
              </div>
              <p className="text-[var(--muted-foreground)] mb-4">{t("verdict.intro")}</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("verdict.point1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("verdict.point2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("verdict.point3")}</span>
                </li>
              </ul>
              <p className="font-medium text-primary-600">{t("verdict.conclusion")}</p>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="max-w-4xl mx-auto px-4 py-12">
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
