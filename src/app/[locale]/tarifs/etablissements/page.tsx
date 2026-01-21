import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Check, ArrowRight, Building2, Users, Shield, CreditCard, Crown } from "lucide-react";
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

  const baseUrl = "https://www.iaiaz.com";

  const faqs = [
    { question: t("faq.q1"), answer: t("faq.a1") },
    { question: t("faq.q2"), answer: t("faq.a2") },
    { question: t("faq.q3"), answer: t("faq.a3") },
    { question: t("faq.q4"), answer: t("faq.a4") },
  ];

  const subscriptionFeatures = locale === "fr"
    ? [
        "Classes illimitées",
        "Analytics complets",
        "Multi-administrateurs",
        "Gestion des formateurs",
        "Allocation de crédits",
        "Rapports exportables",
        "Support prioritaire",
      ]
    : [
        "Unlimited classes",
        "Full analytics",
        "Multiple administrators",
        "Trainer management",
        "Credit allocation",
        "Exportable reports",
        "Priority support",
      ];

  // Example calculations for different school sizes
  const examples = [
    { students: 50, subscription: 50, credits: 100, total: 150 },
    { students: 200, subscription: 200, credits: 400, total: 600 },
    { students: 500, subscription: 500, credits: 850, total: 1350 }, // with volume discount
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
            {locale === "fr" ? "L'IA pour votre" : "AI for your"}
            <span className="text-primary-600 dark:text-primary-400"> {locale === "fr" ? "établissement" : "institution"}</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            {locale === "fr"
              ? "Équipez tous vos étudiants avec les meilleurs modèles d'IA. Tarification simple et transparente."
              : "Equip all your students with the best AI models. Simple and transparent pricing."}
          </p>

          {/* Key stat */}
          <div className="inline-block bg-gradient-to-r from-primary-600 to-accent-600 text-white px-8 py-4 rounded-2xl mb-8">
            <div className="text-3xl md:text-4xl font-bold">1€</div>
            <div className="text-primary-100 text-sm">{locale === "fr" ? "par étudiant / mois" : "per student / month"}</div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-full">
              <Check className="w-4 h-4" /> {locale === "fr" ? "14 jours d'essai" : "14-day trial"}
            </span>
            <span className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full">
              <Shield className="w-4 h-4" /> {locale === "fr" ? "Sans engagement" : "No commitment"}
            </span>
            <span className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-full">
              <Users className="w-4 h-4" /> {locale === "fr" ? "Étudiants illimités" : "Unlimited students"}
            </span>
          </div>
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
                    <h3 className="font-bold text-lg">{locale === "fr" ? "Établissement" : "School"}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {locale === "fr" ? "Gestion & Analytics" : "Management & Analytics"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">1€</span>
                  <span className="text-[var(--muted-foreground)]">/{locale === "fr" ? "étudiant/mois" : "student/month"}</span>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    {locale === "fr" ? "Minimum 10 étudiants (10€/mois)" : "Minimum 10 students (€10/month)"}
                  </p>
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

                <NextLink href="/auth/signup?type=school">
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
                      ? "Achetez des crédits en volume. Vos étudiants les consomment en utilisant l'IA."
                      : "Buy credits in bulk. Your students consume them when using AI."}
                  </p>
                  <div className="p-3 rounded-lg bg-[var(--muted)]">
                    <p className="font-medium mb-1">
                      {locale === "fr" ? "Remises volume" : "Volume discounts"}
                    </p>
                    <p className="text-[var(--muted-foreground)]">
                      100€+ : -5% | 200€+ : -10% | 500€+ : -15%
                    </p>
                  </div>
                </div>

                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {locale === "fr" ? "Allocation par classe/étudiant" : "Allocate by class/student"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    {locale === "fr" ? "Limites de consommation" : "Usage limits"}
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

        {/* Example Calculations */}
        <section className="mb-16 bg-[var(--muted)] rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6 text-center">
            {locale === "fr" ? "Exemples de budget (par semestre)" : "Budget examples (per semester)"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {examples.map((ex, idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold">{ex.students}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {locale === "fr" ? "étudiants" : "students"}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>{locale === "fr" ? "Abonnement (5 mois)" : "Subscription (5 months)"}</span>
                      <span className="font-medium">{ex.subscription}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{locale === "fr" ? "Crédits IA" : "AI Credits"}</span>
                      <span className="font-medium">~{ex.credits}€</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                      <span className="font-bold">Total</span>
                      <span className="font-bold text-primary-600 dark:text-primary-400">~{ex.total}€</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] text-center mt-3">
                    ~{(ex.total / ex.students).toFixed(2)}€/{locale === "fr" ? "étudiant" : "student"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
            {locale === "fr"
              ? "Estimation basée sur ~50 questions/étudiant/semestre. Usage réel variable."
              : "Estimate based on ~50 questions/student/semester. Actual usage varies."}
          </p>
        </section>

        {/* Features */}
        <section className="mb-16">
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
                <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
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
            {locale === "fr"
              ? "Créez votre espace établissement et bénéficiez de 14 jours d'essai gratuit."
              : "Create your school workspace and get a 14-day free trial."}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NextLink href="/auth/signup?type=school">
              <Button size="lg">
                {locale === "fr" ? "Créer mon espace établissement" : "Create school workspace"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </NextLink>
            <Link href="/comparatif/etablissements">
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
