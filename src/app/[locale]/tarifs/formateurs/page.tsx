import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Check, ArrowRight, Users, BarChart3, Crown, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FAQSchema, BreadcrumbSchema } from "@/components/seo/structured-data";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.tarifsFormateurs" });

  const baseUrl = "https://www.iaiaz.com";
  const frPath = "/tarifs/formateurs";
  const enPath = "/en/pricing/trainers";

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

export default async function TarifsFormateursPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tarifsFormateurs");

  const baseUrl = "https://www.iaiaz.com";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  const subscriptionFeatures = locale === "fr"
    ? [
        "Jusqu'à 5 classes",
        "Tableau de bord analytics",
        "Gestion des étudiants",
        "Allocation de crédits",
        "Support par email",
      ]
    : [
        "Up to 5 classes",
        "Analytics dashboard",
        "Student management",
        "Credit allocation",
        "Email support",
      ];

  return (
    <div className="min-h-screen">
      <FAQSchema faqs={faqs} />
      <BreadcrumbSchema
        items={[
          { name: t("breadcrumb.home"), url: baseUrl + (locale === "en" ? "/en" : "") },
          { name: t("breadcrumb.pricing"), url: locale === "fr" ? `${baseUrl}/tarifs` : `${baseUrl}/en/pricing` },
          { name: t("breadcrumb.trainers"), url: locale === "fr" ? `${baseUrl}/tarifs/formateurs` : `${baseUrl}/en/pricing/trainers` },
        ]}
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 text-sm font-medium mb-6">
            <BarChart3 className="w-4 h-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
        </div>

        {/* Pricing Model */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Subscription */}
            <Card className="ring-2 ring-primary-500 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs px-3 py-1 rounded-full">
                {locale === "fr" ? "Abonnement" : "Subscription"}
              </div>
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Formateur Pro</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {locale === "fr" ? "Gestion & Analytics" : "Management & Analytics"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">9,90€</span>
                  <span className="text-[var(--muted-foreground)]">/{locale === "fr" ? "mois" : "month"}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {subscriptionFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <p className="text-xs text-[var(--muted-foreground)] mb-4">
                  {locale === "fr"
                    ? "14 jours d'essai gratuit. Annulez à tout moment."
                    : "14-day free trial. Cancel anytime."}
                </p>

                <NextLink href="/auth/signup?type=trainer">
                  <Button className="w-full" size="lg">
                    {locale === "fr" ? "Commencer l'essai gratuit" : "Start free trial"}
                  </Button>
                </NextLink>
              </CardContent>
            </Card>

            {/* Credits */}
            <Card>
              <CardContent className="pt-8 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      {locale === "fr" ? "Crédits IA" : "AI Credits"}
                    </h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {locale === "fr" ? "Usage des étudiants" : "Student usage"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">~2€</span>
                  <span className="text-[var(--muted-foreground)]">/{locale === "fr" ? "étudiant/mois" : "student/month"}</span>
                </div>

                <div className="space-y-3 mb-6 text-sm">
                  <p className="text-[var(--muted-foreground)]">
                    {locale === "fr"
                      ? "Achetez des crédits selon vos besoins. Vos étudiants les consomment en utilisant l'IA."
                      : "Buy credits as needed. Your students consume them when using AI."}
                  </p>
                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <p className="font-medium mb-1">
                      {locale === "fr" ? "Exemple : classe de 30 étudiants" : "Example: class of 30 students"}
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      {locale === "fr"
                        ? "~50€ de crédits pour un semestre complet"
                        : "~€50 in credits for a full semester"}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {locale === "fr" ? "Pas de minimum" : "No minimum"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {locale === "fr" ? "Remises volume : jusqu'à -15%" : "Volume discounts: up to -15%"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {locale === "fr" ? "Crédits non-expirables" : "Credits never expire"}
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
            {locale === "fr"
              ? "L'abonnement couvre la gestion. Les crédits couvrent l'usage IA - deux coûts séparés, transparents."
              : "Subscription covers management. Credits cover AI usage - two separate, transparent costs."}
          </p>
        </section>

        {/* Example Calculation */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center">{t("example.title")}</h2>
          <div className="max-w-xl mx-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{locale === "fr" ? "Abonnement Formateur Pro" : "Trainer Pro subscription"}</span>
                <span className="font-medium">9,90€/{locale === "fr" ? "mois" : "month"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border)]">
                <span>{locale === "fr" ? "Crédits pour 30 étudiants (1 semestre)" : "Credits for 30 students (1 semester)"}</span>
                <span className="font-medium">~50€</span>
              </div>
              <div className="flex justify-between items-center py-4 bg-primary-50 dark:bg-primary-950/30 rounded-lg px-4 -mx-4">
                <span className="font-bold">{locale === "fr" ? "Coût total / semestre" : "Total cost / semester"}</span>
                <span className="font-bold text-xl text-primary-600 dark:text-primary-400">~100€</span>
              </div>
            </div>
            <p className="text-center text-sm text-[var(--muted-foreground)] mt-4">
              {locale === "fr"
                ? "Soit ~3,30€ par étudiant pour un semestre complet"
                : "About €3.30 per student for a full semester"}
            </p>
          </div>
        </section>

        {/* Value */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">{t("value.title")}</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight1.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight1.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight2.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight2.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight3.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight3.description")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-bold mb-3">{t("value.insight4.title")}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{t("value.insight4.description")}</p>
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
        <section className="text-center bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
          <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
            {locale === "fr"
              ? "Créez votre compte formateur et bénéficiez de 14 jours d'essai gratuit."
              : "Create your trainer account and get a 14-day free trial."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NextLink href="/auth/signup?type=trainer">
              <Button size="lg">
                {locale === "fr" ? "Créer mon compte formateur" : "Create trainer account"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </NextLink>
            <Link href="/comparatif/formateurs">
              <Button variant="outline" size="lg">
                {t("cta.compare")}
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
