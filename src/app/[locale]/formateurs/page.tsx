import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Eye,
  EyeOff,
  Users,
  BarChart3,
  Shield,
  Check,
  AlertTriangle,
  BookOpen,
  Target,
  Sparkles,
  Zap,
  ArrowRight,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.formateurs" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/formateurs";
  const enPath = "/en/trainers";

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

export default async function FormateursPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("formateurs");
  const tHome = await getTranslations("home");

  const baseUrl = "https://www.iaiaz.com";
  const breadcrumbItems = [
    {
      name: t("breadcrumb.home"),
      url: locale === "fr" ? baseUrl : `${baseUrl}/en`,
    },
    {
      name: t("breadcrumb.trainers"),
      url: locale === "fr" ? `${baseUrl}/formateurs` : `${baseUrl}/en/trainers`,
    },
  ];

  // Build FAQs for SEO
  const faqs = [
    { question: t("objections.q1"), answer: t("objections.a1") },
    { question: t("objections.q2"), answer: t("objections.a2") },
    { question: t("objections.q3"), answer: t("objections.a3") },
    { question: t("objections.q4"), answer: t("objections.a4") },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema items={breadcrumbItems} />
      <Header />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6 shadow-sm">
            <Eye className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t("hero.title")}
            <br />
            <span className="text-primary-600 dark:text-primary-400">{t("hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>

          {/* Key stat */}
          <div className="inline-block bg-gradient-to-r from-primary-600 to-accent-600 text-white px-6 py-4 rounded-2xl mb-8">
            <div className="text-2xl md:text-3xl font-bold">67%</div>
            <div className="text-primary-100 text-sm max-w-xs">{t("hero.stat")}</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="mailto:secretariat@girafestudio.fr?subject=Créer%20mon%20espace%20classe">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                {t("hero.cta")}
              </Button>
            </a>
            <Link href="/etablissements">
              <Button variant="outline" size="lg">
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("pricing.feature1")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("pricing.feature2")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("pricing.feature3")}
            </span>
          </div>
        </section>

        {/* The Problem - Fear Flip */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">{t("problem.title")}</h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("problem.subtitle")}
            </p>

            {/* Fear Flip Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 p-4 border-b border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <EyeOff className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.fear")}</span>
                  </div>
                  <p className="text-red-800 dark:text-red-200 font-semibold mt-2">{t("problem.fear1.title")}</p>
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Lightbulb className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.reality")}</span>
                  </div>
                  <p className="text-sm">{t("problem.fear1.flip")}</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 p-4 border-b border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <EyeOff className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.fear")}</span>
                  </div>
                  <p className="text-red-800 dark:text-red-200 font-semibold mt-2">{t("problem.fear2.title")}</p>
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Lightbulb className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.reality")}</span>
                  </div>
                  <p className="text-sm">{t("problem.fear2.flip")}</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <div className="bg-red-50 dark:bg-red-950/30 p-4 border-b border-red-100 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <EyeOff className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.fear")}</span>
                  </div>
                  <p className="text-red-800 dark:text-red-200 font-semibold mt-2">{t("problem.fear3.title")}</p>
                </div>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Lightbulb className="w-5 h-5" />
                    <span className="font-medium text-sm">{t("problem.reality")}</span>
                  </div>
                  <p className="text-sm">{t("problem.fear3.flip")}</p>
                </CardContent>
              </Card>
            </div>

            {/* The invisible problem */}
            <Card className="max-w-3xl mx-auto border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">{t("problem.invisible.title")}</h3>
                    <p className="text-[var(--muted-foreground)] mb-4">{t("problem.invisible.description")}</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <span className="text-orange-500">✗</span>
                        {t("problem.invisible.point1")}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-orange-500">✗</span>
                        {t("problem.invisible.point2")}
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-orange-500">✗</span>
                        {t("problem.invisible.point3")}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* The Solution */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">{t("solution.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("solution.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.feature1.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("solution.feature1.description")}</p>
              </CardContent>
            </Card>

            <Card className="border-primary-500 dark:border-primary-400 border-2">
              <CardContent className="pt-6">
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.feature2.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("solution.feature2.description")}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <Target className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="font-bold text-lg mb-2">{t("solution.feature3.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("solution.feature3.description")}</p>
              </CardContent>
            </Card>
          </div>

          {/* What you gain */}
          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950/30 dark:to-accent-950/30 border-0">
              <CardContent className="pt-6">
                <h3 className="font-bold text-lg mb-4 text-center">{t("solution.gains.title")}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t("solution.gains.point1")}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t("solution.gains.point2")}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t("solution.gains.point3")}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{t("solution.gains.point4")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Dashboard Preview */}
        <section className="bg-gradient-to-b from-primary-50 to-white dark:from-primary-950 dark:to-[var(--background)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">{t("dashboard.title")}</h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
              {t("dashboard.subtitle")}
            </p>

            {/* Mock Dashboard */}
            <Card className="max-w-4xl mx-auto overflow-hidden shadow-xl">
              <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="ml-2 text-xs text-gray-400">iaiaz - Tableau de bord enseignant</span>
              </div>
              <CardContent className="p-6 bg-white dark:bg-gray-900">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b">
                  <div>
                    <h3 className="font-bold text-lg">{t("dashboard.mock.class")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("dashboard.mock.period")}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">28/32</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t("dashboard.mock.activeStudents")}</div>
                  </div>
                </div>

                {/* Insights Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Topics */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary-500" />
                      {t("dashboard.mock.topicsTitle")}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-primary-100 dark:bg-primary-900/30 rounded overflow-hidden">
                          <div className="h-full bg-primary-500 rounded" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-xs w-32 truncate">{t("dashboard.mock.topic1")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-primary-100 dark:bg-primary-900/30 rounded overflow-hidden">
                          <div className="h-full bg-primary-500 rounded" style={{ width: '62%' }}></div>
                        </div>
                        <span className="text-xs w-32 truncate">{t("dashboard.mock.topic2")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-6 bg-primary-100 dark:bg-primary-900/30 rounded overflow-hidden">
                          <div className="h-full bg-primary-500 rounded" style={{ width: '45%' }}></div>
                        </div>
                        <span className="text-xs w-32 truncate">{t("dashboard.mock.topic3")}</span>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-2 italic">
                      → {t("dashboard.mock.topicInsight")}
                    </p>
                  </div>

                  {/* Alerts */}
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      {t("dashboard.mock.alertsTitle")}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-2 rounded bg-orange-50 dark:bg-orange-950/30 text-sm">
                        <span className="text-orange-500">⚠</span>
                        <span>{t("dashboard.mock.alert1")}</span>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/30 text-sm">
                        <span className="text-blue-500">💡</span>
                        <span>{t("dashboard.mock.alert2")}</span>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded bg-green-50 dark:bg-green-950/30 text-sm">
                        <span className="text-green-500">✓</span>
                        <span>{t("dashboard.mock.alert3")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom insight */}
                <div className="mt-6 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-[var(--muted-foreground)]">{t("dashboard.mock.avgQuestions")}: </span>
                      <span className="font-bold">7.2</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">{t("dashboard.mock.peakTime")}: </span>
                      <span className="font-bold">21h-23h</span>
                    </div>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {t("dashboard.mock.timeSpent")}
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="mt-8 max-w-3xl mx-auto text-center text-sm text-[var(--muted-foreground)] italic">
              {t("dashboard.example")}
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">{t("pricing.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("pricing.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Student Usage */}
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold mb-1">{t("pricing.studentUsage.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                  {t("pricing.studentUsage.price")}
                </div>
                <div className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("pricing.studentUsage.unit")}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pricing.studentUsage.description")}
                </p>
              </CardContent>
            </Card>

            {/* Analytics - Highlighted */}
            <Card className="relative border-primary-500 dark:border-primary-400 border-2">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
                {t("pricing.analytics.badge")}
              </div>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold mb-1">{t("pricing.analytics.title")}</h3>
                <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                  {t("pricing.analytics.price")}
                </div>
                <div className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("pricing.analytics.unit")}
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("pricing.analytics.description")}
                </p>
              </CardContent>
            </Card>

            {/* Setup */}
            <Card>
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
                <h3 className="font-bold mb-1">{t("pricing.setup.title")}</h3>
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {t("pricing.setup.price")}
                </div>
                <div className="text-sm text-[var(--muted-foreground)] mb-3">
                  &nbsp;
                </div>
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

        {/* Objections / FAQ */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-12">{t("objections.title")}</h2>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">{t("objections.q1")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("objections.a1")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">{t("objections.q2")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("objections.a2")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">{t("objections.q3")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("objections.a3")}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <p className="font-medium mb-2">{t("objections.q4")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("objections.a4")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <a href="mailto:secretariat@girafestudio.fr?subject=Créer%20mon%20espace%20classe">
              <Button size="lg">
                {t("cta.button")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
            <p className="text-sm text-[var(--muted-foreground)] mt-4">
              {t("cta.bonus")}
            </p>
          </div>
        </section>
      </main>

      {/* Footer - consistent with other pages */}
      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              {tHome("footer.tagline")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              {tHome("footer.copyright")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {tHome("footer.madeIn")}
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {tHome("footer.madeBy")}{" "}
              <a
                href="https://www.girafestudio.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {tHome("footer.madeByStudio")}
              </a>
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              {tHome("footer.cgu")}
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              {tHome("footer.cgv")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              {tHome("footer.privacy")}
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              {tHome("footer.cookies")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
