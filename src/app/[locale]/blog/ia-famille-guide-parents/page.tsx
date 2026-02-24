import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Globe,
  Lightbulb,
  Shield,
  ArrowRight,
  Heart,
  Check,
  Users,
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
  const t = await getTranslations({ locale, namespace: "metadata.iaFamilleGuide" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/blog/ia-famille-guide-parents";
  const enPath = "/en/blog/family-ai-parent-guide";

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

export default async function IaFamilleGuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("iaFamilleGuide");

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
    { name: t("breadcrumb.article"), url: locale === "fr" ? `${baseUrl}/blog/ia-famille-guide-parents` : `${baseUrl}/en/blog/family-ai-parent-guide` },
  ];

  const protegerEnfantsUrl = locale === "fr" ? "/blog/proteger-enfants-ia" : "/en/blog/protect-children-ai";

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

        {/* AI is already in your kids' lives */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-center">{t("intro.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-4">{t("intro.p1")}</p>
            <p className="text-[var(--muted-foreground)] mb-4">{t("intro.p2")}</p>
            <p className="text-[var(--muted-foreground)]">
              {t("intro.p3")}{" "}
              <a href={protegerEnfantsUrl} className="text-primary-600 underline hover:text-primary-700">
                {t("intro.crossLink")}
              </a>.
            </p>
          </div>
        </section>

        {/* What AI can do for families */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">{t("benefits.title")}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold">{t("benefits.homework.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.homework.desc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold">{t("benefits.creativity.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.creativity.desc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold">{t("benefits.languages.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.languages.desc")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold">{t("benefits.curiosity.title")}</h3>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{t("benefits.curiosity.desc")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Best practices by age */}
        <section className="bg-[var(--muted)] py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">{t("ageGroups.title")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {/* 12-14 Guided */}
              <Card className="border-2 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <strong>{t("ageGroups.guided.title")}</strong>
                      <p className="text-xs text-[var(--muted-foreground)]">{t("ageGroups.guided.age")}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.guided.point1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.guided.point2")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.guided.point3")}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* 15-17 Trusted */}
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <strong>{t("ageGroups.trusted.title")}</strong>
                      <p className="text-xs text-[var(--muted-foreground)]">{t("ageGroups.trusted.age")}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.trusted.point1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.trusted.point2")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.trusted.point3")}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* 18+ Adult */}
              <Card className="border-2 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <strong>{t("ageGroups.adult.title")}</strong>
                      <p className="text-xs text-[var(--muted-foreground)]">{t("ageGroups.adult.age")}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.adult.point1")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.adult.point2")}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                      <span>{t("ageGroups.adult.point3")}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Choosing the right family solution */}
        <section className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center">{t("solution.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-4">{t("solution.p1")}</p>
          <p className="text-[var(--muted-foreground)] mb-4">{t("solution.p2")}</p>
          <Card className="border-2 border-primary-200 dark:border-primary-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-primary-600" />
                <h3 className="text-lg font-bold">{t("solution.mifa.title")}</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("solution.mifa.point1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("solution.mifa.point2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("solution.mifa.point3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{t("solution.mifa.point4")}</span>
                </li>
              </ul>
            </CardContent>
          </Card>
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
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">{t("cta.subtitle")}</p>
            <Link href="/mifa">
              <Button size="lg">
                <Heart className="w-5 h-5 mr-2" />
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
