import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  X,
  Check,
  ArrowRight,
  Sparkles,
  Heart,
  Shield,
  Clock,
  Users,
  AlertTriangle,
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
  const t = await getTranslations({ locale, namespace: "metadata.alternativeChatgptFamille" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/blog/alternative-chatgpt-famille";
  const enPath = "/en/blog/alternative-chatgpt-famille";

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

export default async function AlternativeChatgptFamillePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("alternativeChatgptFamille");

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
    { name: t("breadcrumb.article"), url: locale === "fr" ? `${baseUrl}/blog/alternative-chatgpt-famille` : `${baseUrl}/en/blog/alternative-chatgpt-famille` },
  ];

  const comparatifLink = locale === "fr"
    ? "/blog/chatgpt-vs-claude-comparatif"
    : "/en/blog/chatgpt-vs-claude-comparatif";

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

        {/* Why ChatGPT isn't built for families */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t("problems.title")}</h2>
            <p className="text-[var(--muted-foreground)] text-center mb-8 max-w-2xl mx-auto">
              {t("problems.intro")}
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{t("problems.p1.title")}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{t("problems.p1.desc")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{t("problems.p2.title")}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{t("problems.p2.desc")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{t("problems.p3.title")}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{t("problems.p3.desc")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <X className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1">{t("problems.p4.title")}</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">{t("problems.p4.desc")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What parents need */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("needs.title")}</h2>
          <p className="text-[var(--muted-foreground)] text-center mb-8 max-w-2xl mx-auto">
            {t("needs.intro")}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{t("needs.n1.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("needs.n1.desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{t("needs.n2.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("needs.n2.desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{t("needs.n3.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("needs.n3.desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold mb-1">{t("needs.n4.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("needs.n4.desc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t("comparison.title")}</h2>
            <p className="text-[var(--muted-foreground)] text-center mb-8 max-w-2xl mx-auto">
              {t("comparison.intro")}
            </p>
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
                    <td className="p-4 font-medium">{t("comparison.parentalControls")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.ageModes")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.usageLimits")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">{t("comparison.multiModel")}</td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="p-4 text-center"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b bg-pink-50/50 dark:bg-pink-950/50">
                    <td className="p-4 font-medium">{t("comparison.price")}</td>
                    <td className="p-4 text-center">{t("comparison.chatgptPrice")}</td>
                    <td className="p-4 text-center">{t("comparison.geminiPrice")}</td>
                    <td className="p-4 text-center font-medium text-pink-600">{t("comparison.mifaPrice")}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-[var(--muted-foreground)] text-center mt-4">
              {t("comparison.note")}
            </p>
          </div>
        </section>

        {/* mifa Key Features */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-4 text-center">{t("features.title")}</h2>
          <p className="text-[var(--muted-foreground)] text-center mb-8 max-w-2xl mx-auto">
            {t("features.intro")}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-2 border-pink-200 dark:border-pink-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-bold">{t("features.f1.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("features.f1.desc")}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-pink-200 dark:border-pink-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                    <Users className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-bold">{t("features.f2.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("features.f2.desc")}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-pink-200 dark:border-pink-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-bold">{t("features.f3.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("features.f3.desc")}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-pink-200 dark:border-pink-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-bold">{t("features.f4.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("features.f4.desc")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cross-link to comparison article */}
          <div className="mt-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("features.crossLink")}{" "}
              <a href={comparatifLink} className="text-primary-600 underline hover:no-underline">
                {t("features.crossLinkText")}
              </a>
            </p>
          </div>
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
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="w-6 h-6 text-pink-600" />
              <span className="text-sm font-medium text-pink-600">{t("cta.badge")}</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
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
