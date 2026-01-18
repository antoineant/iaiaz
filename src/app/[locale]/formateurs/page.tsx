import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  Users,
  Brain,
  Eye,
  Shield,
  Check,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Target,
  Sparkles,
  MessageSquare,
  PieChart,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { BreadcrumbSchema } from "@/components/seo/structured-data";

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

  return (
    <div className="min-h-screen">
      <BreadcrumbSchema items={breadcrumbItems} />
      <Header />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium mb-6 shadow-sm">
            <BarChart3 className="w-4 h-4" />
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

          {/* Unique value prop */}
          <div className="inline-block bg-gradient-to-r from-primary-600 to-accent-600 text-white px-6 py-4 rounded-2xl mb-8">
            <div className="text-xl md:text-2xl font-bold">
              {t("hero.uniqueValue")}
            </div>
            <div className="text-primary-100 text-sm">
              {t("hero.uniqueValueSub")}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <a href="mailto:secretariat@girafestudio.fr?subject=Demande%20demo%20Analytics%20Pedagogique">
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
              <Check className="w-4 h-4 text-green-500" /> {t("hero.feature1")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.feature2")}
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> {t("hero.feature3")}
            </span>
          </div>
        </section>

        {/* Problem Statement */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-4">
              {t("problem.title")}
            </h2>
            <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
              {t("problem.subtitle")}
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-6">
                  <AlertTriangle className="w-8 h-8 text-orange-500 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.item1.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.item1.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-6">
                  <Eye className="w-8 h-8 text-orange-500 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.item2.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.item2.description")}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                <CardContent className="pt-6">
                  <Brain className="w-8 h-8 text-orange-500 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{t("problem.item3.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {t("problem.item3.description")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Dashboard Preview - Tier 1 */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-medium mb-4">
                {t("tier1.badge")}
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("tier1.title")}</h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                {t("tier1.subtitle")}
              </p>
            </div>

            {/* Mock Dashboard */}
            <Card className="max-w-4xl mx-auto overflow-hidden">
              <div className="bg-[var(--muted)] px-4 py-2 border-b flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className="ml-2 text-xs text-[var(--muted-foreground)]">iaiaz Analytics</span>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg">{t("tier1.dashboard.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("tier1.dashboard.period")}</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-[var(--muted)] rounded-lg p-4">
                    <Users className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                    <div className="text-2xl font-bold">32/35</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t("tier1.dashboard.activeStudents")}</div>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-4">
                    <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                    <div className="text-2xl font-bold">287</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t("tier1.dashboard.conversations")}</div>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-4">
                    <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                    <div className="text-2xl font-bold">8.9</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t("tier1.dashboard.avgMessages")}</div>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-4">
                    <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400 mb-2" />
                    <div className="text-2xl font-bold">14h-16h</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{t("tier1.dashboard.peakTime")}</div>
                  </div>
                </div>

                {/* Activity Chart Mock */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3">{t("tier1.dashboard.activityByDay")}</h4>
                  <div className="flex items-end gap-2 h-24">
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-500 rounded-t" style={{ height: '40%' }}></div>
                      <span className="text-xs mt-1">L</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-500 rounded-t" style={{ height: '100%' }}></div>
                      <span className="text-xs mt-1">M</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-500 rounded-t" style={{ height: '55%' }}></div>
                      <span className="text-xs mt-1">M</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-500 rounded-t" style={{ height: '70%' }}></div>
                      <span className="text-xs mt-1">J</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-500 rounded-t" style={{ height: '30%' }}></div>
                      <span className="text-xs mt-1">V</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-300 rounded-t" style={{ height: '15%' }}></div>
                      <span className="text-xs mt-1">S</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-primary-300 rounded-t" style={{ height: '8%' }}></div>
                      <span className="text-xs mt-1">D</span>
                    </div>
                  </div>
                </div>

                {/* Alert */}
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">{t("tier1.dashboard.alertTitle")}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">{t("tier1.dashboard.alertDesc")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tier 2 - Learning Insights */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-medium mb-4">
                {t("tier2.badge")}
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("tier2.title")}</h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                {t("tier2.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Topics Card */}
              <Card>
                <CardContent className="pt-6">
                  <BookOpen className="w-8 h-8 text-accent-600 dark:text-accent-400 mb-4" />
                  <h3 className="font-bold text-lg mb-4">{t("tier2.topics.title")}</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("tier2.topics.topic1")}</span>
                        <span className="text-[var(--muted-foreground)]">34</span>
                      </div>
                      <div className="h-2 bg-[var(--muted)] rounded-full">
                        <div className="h-2 bg-accent-500 rounded-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("tier2.topics.topic2")}</span>
                        <span className="text-[var(--muted-foreground)]">24</span>
                      </div>
                      <div className="h-2 bg-[var(--muted)] rounded-full">
                        <div className="h-2 bg-accent-500 rounded-full" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("tier2.topics.topic3")}</span>
                        <span className="text-[var(--muted-foreground)]">21</span>
                      </div>
                      <div className="h-2 bg-[var(--muted)] rounded-full">
                        <div className="h-2 bg-accent-500 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{t("tier2.topics.topic4")}</span>
                        <span className="text-[var(--muted-foreground)]">18</span>
                      </div>
                      <div className="h-2 bg-[var(--muted)] rounded-full">
                        <div className="h-2 bg-accent-500 rounded-full" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Usage Types Card */}
              <Card>
                <CardContent className="pt-6">
                  <PieChart className="w-8 h-8 text-accent-600 dark:text-accent-400 mb-4" />
                  <h3 className="font-bold text-lg mb-4">{t("tier2.usage.title")}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                      <span className="flex-1 text-sm">{t("tier2.usage.type1")}</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-accent-500"></div>
                      <span className="flex-1 text-sm">{t("tier2.usage.type2")}</span>
                      <span className="text-sm font-medium">30%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="flex-1 text-sm">{t("tier2.usage.type3")}</span>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span className="flex-1 text-sm">{t("tier2.usage.type4")}</span>
                      <span className="text-sm font-medium">10%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tier 3 - Quality Analysis */}
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-medium mb-4">
                {t("tier3.badge")}
              </div>
              <h2 className="text-3xl font-bold mb-4">{t("tier3.title")}</h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                {t("tier3.subtitle")}
              </p>
            </div>

            <Card className="max-w-3xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                  <Brain className="w-10 h-10 text-green-600 dark:text-green-400" />
                  <div>
                    <h3 className="font-bold text-lg">{t("tier3.quality.title")}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{t("tier3.quality.average")}: <span className="font-bold text-green-600">6.2/10</span></p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t("tier3.quality.criteria1")}</span>
                      <span className="font-medium">7.1</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '71%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t("tier3.quality.criteria2")}</span>
                      <span className="font-medium">4.8</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full">
                      <div className="h-2 bg-orange-500 rounded-full" style={{ width: '48%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t("tier3.quality.criteria3")}</span>
                      <span className="font-medium">5.9</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full">
                      <div className="h-2 bg-yellow-500 rounded-full" style={{ width: '59%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{t("tier3.quality.criteria4")}</span>
                      <span className="font-medium">6.8</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '68%' }}></div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm mb-3">{t("tier3.distribution.title")}</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-green-700 dark:text-green-300">4</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{t("tier3.distribution.expert")}</div>
                    </div>
                    <div className="bg-primary-100 dark:bg-primary-900/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-primary-700 dark:text-primary-300">18</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{t("tier3.distribution.competent")}</div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-yellow-700 dark:text-yellow-300">10</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{t("tier3.distribution.progressing")}</div>
                    </div>
                    <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2">
                      <div className="text-lg font-bold text-orange-700 dark:text-orange-300">3</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{t("tier3.distribution.needsHelp")}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <Shield className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">{t("privacy.title")}</h2>
              <p className="text-[var(--muted-foreground)] max-w-xl mx-auto">
                {t("privacy.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("privacy.item1.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("privacy.item1.description")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("privacy.item2.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("privacy.item2.description")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-bold mb-2">{t("privacy.item3.title")}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("privacy.item3.description")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              {t("cta.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="mailto:secretariat@girafestudio.fr?subject=Demande%20demo%20Analytics%20Pedagogique">
                <Button size="lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {t("cta.button")}
                </Button>
              </a>
              <Link href="/etablissements">
                <Button variant="outline" size="lg">
                  {t("cta.buttonSecondary")}
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[var(--muted-foreground)]">
            <p>
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
        </footer>
      </main>
    </div>
  );
}
