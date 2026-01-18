import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Check, ArrowRight, Building2, Users, Shield, CreditCard, Zap } from "lucide-react";
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
  const t = await getTranslations({ locale, namespace: "metadata.tarifsEtablissements" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/tarifs/etablissements";
  const enPath = "/en/pricing/schools";

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

export default async function TarifsEtablissementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tarifsEtablissements");
  const tHome = await getTranslations("home");

  const baseUrl = "https://www.iaiaz.com";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  const tiers = [
    {
      name: t("tiers.pilot.name"),
      students: t("tiers.pilot.students"),
      price: t("tiers.pilot.price"),
      priceNote: t("tiers.pilot.priceNote"),
      setup: t("tiers.pilot.setup"),
      features: [
        t("tiers.pilot.feature1"),
        t("tiers.pilot.feature2"),
        t("tiers.pilot.feature3"),
      ],
      popular: false,
    },
    {
      name: t("tiers.class.name"),
      students: t("tiers.class.students"),
      price: t("tiers.class.price"),
      priceNote: t("tiers.class.priceNote"),
      setup: t("tiers.class.setup"),
      features: [
        t("tiers.class.feature1"),
        t("tiers.class.feature2"),
        t("tiers.class.feature3"),
        t("tiers.class.feature4"),
      ],
      popular: true,
    },
    {
      name: t("tiers.school.name"),
      students: t("tiers.school.students"),
      price: t("tiers.school.price"),
      priceNote: t("tiers.school.priceNote"),
      setup: t("tiers.school.setup"),
      features: [
        t("tiers.school.feature1"),
        t("tiers.school.feature2"),
        t("tiers.school.feature3"),
        t("tiers.school.feature4"),
        t("tiers.school.feature5"),
      ],
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.pricing"), url: locale === "fr" ? `${baseUrl}/tarifs` : `${baseUrl}/en/pricing` },
          { name: t("breadcrumb.schools"), url: locale === "fr" ? `${baseUrl}/tarifs/etablissements` : `${baseUrl}/en/pricing/schools` },
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
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
            <span className="text-primary-600 dark:text-primary-400"> {t("hero.titleHighlight")}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>

          {/* Key stat */}
          <div className="inline-block bg-gradient-to-r from-primary-600 to-accent-600 text-white px-8 py-4 rounded-2xl mb-8">
            <div className="text-3xl md:text-4xl font-bold">{t("hero.stat")}</div>
            <div className="text-primary-100 text-sm">{t("hero.statNote")}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> {t("hero.benefit1")}
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" /> {t("hero.benefit2")}
            </span>
            <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full">
              <Users className="w-4 h-4" /> {t("hero.benefit3")}
            </span>
          </div>
        </div>

        {/* Pricing Tiers */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-4">{t("tiers.title")}</h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            {t("tiers.subtitle")}
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={tier.popular ? "ring-2 ring-primary-500 relative" : ""}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                    {t("tiers.popular")}
                  </div>
                )}
                <CardContent className="pt-8 pb-6">
                  <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">{tier.students}</p>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                    {tier.price}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-2">{tier.priceNote}</p>
                  <p className="text-sm font-medium mb-6">{tier.setup}</p>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <a href={`mailto:contact@iaiaz.com?subject=${encodeURIComponent(tier.name)}`}>
                    <Button className="w-full" variant={tier.popular ? undefined : "outline"}>
                      {t("tiers.cta")}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-[var(--muted-foreground)] mt-8">
            {t("tiers.custom")}
          </p>
        </section>

        {/* Features */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-8 text-center">{t("features.title")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-bold mb-2">{t("features.budget.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("features.budget.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">{t("features.management.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("features.management.description")}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold mb-2">{t("features.models.title")}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t("features.models.description")}</p>
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
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:contact@iaiaz.com?subject=Demande%20d%27information%20%C3%A9tablissement">
              <Button size="lg">
                {t("cta.button")}
              </Button>
            </a>
            <Link href="/comparatif/etablissements">
              <Button variant="outline" size="lg">
                {t("cta.compare")} <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4 mt-16">
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
