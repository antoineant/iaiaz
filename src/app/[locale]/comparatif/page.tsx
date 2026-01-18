import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { GraduationCap, Building2, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.comparatif" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: locale === "fr"
      ? ["alternative chatgpt", "comparatif ia", "chatgpt vs claude"]
      : ["chatgpt alternative", "ai comparison", "chatgpt vs claude"],
    alternates: {
      canonical: locale === "fr" ? "https://www.iaiaz.com/comparatif" : "https://www.iaiaz.com/en/compare",
      languages: {
        "fr-FR": "https://www.iaiaz.com/comparatif",
        "en": "https://www.iaiaz.com/en/compare",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: locale === "fr" ? "https://www.iaiaz.com/comparatif" : "https://www.iaiaz.com/en/compare",
    },
  };
}

export default async function ComparatifPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("comparatifSelector");

  const baseUrl = "https://www.iaiaz.com";

  return (
    <div className="min-h-screen">
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.compare"), url: locale === "fr" ? `${baseUrl}/comparatif` : `${baseUrl}/en/compare` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Audience Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Students */}
          <Link href="/comparatif/etudiants" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-400">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/40 dark:to-accent-900/40 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("students.title")}</h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("students.description")}
                </p>
                <div className="text-lg font-bold text-primary-600 dark:text-primary-400 mb-4">
                  {t("students.versus")}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 font-medium group-hover:gap-2 transition-all">
                  {t("students.cta")} <ArrowRight className="w-4 h-4" />
                </span>
              </CardContent>
            </Card>
          </Link>

          {/* Schools */}
          <Link href="/comparatif/etablissements" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-400">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("schools.title")}</h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("schools.description")}
                </p>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">
                  {t("schools.versus")}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:gap-2 transition-all">
                  {t("schools.cta")} <ArrowRight className="w-4 h-4" />
                </span>
              </CardContent>
            </Card>
          </Link>

          {/* Trainers */}
          <Link href="/comparatif/formateurs" className="group">
            <Card className="h-full transition-all hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-400">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 flex items-center justify-center">
                  <Users className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">{t("trainers.title")}</h2>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("trainers.description")}
                </p>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-4">
                  {t("trainers.versus")}
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400 font-medium group-hover:gap-2 transition-all">
                  {t("trainers.cta")} <ArrowRight className="w-4 h-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Note */}
        <p className="text-center text-sm text-[var(--muted-foreground)] mt-12 max-w-2xl mx-auto">
          {t("note")}
        </p>
      </main>

      <Footer />
    </div>
  );
}
