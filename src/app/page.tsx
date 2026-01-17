import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { CREDIT_PACKS } from "@/lib/pricing";
import { getPricingData } from "@/lib/pricing-db";
import { FAQSection } from "@/components/seo/faq-section";
import {
  OrganizationSchema,
  ProductSchema,
  WebsiteSchema,
} from "@/components/seo/structured-data";
import {
  Sparkles,
  CreditCard,
  Zap,
  Shield,
  ArrowRight,
  Check,
  MessageSquare,
  FileText,
  Code,
  HelpCircle,
  Calculator,
} from "lucide-react";

export default async function HomePage() {
  // Fetch pricing data from database
  const { settings, models: allModels } = await getPricingData();
  const { markupMultiplier } = settings;

  // Get first 4 models for display (prefer recommended ones)
  const recommendedModels = allModels.filter((m) => m.is_recommended);
  const otherModels = allModels.filter((m) => !m.is_recommended);
  const displayModels = [...recommendedModels, ...otherModels].slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <OrganizationSchema />
      <ProductSchema />
      <WebsiteSchema />

      <Header />

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 text-sm font-medium mb-6 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Intelligence Artificielle Intelligemment Accessible, Zéro engagement
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-balance">
            L'IA premium, <br />
            <span className="text-primary-600">sans l'abonnement.</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] mb-8 max-w-2xl mx-auto">
            Accédez à Claude, GPT-4, Gemini et Mistral. Payez uniquement ce que
            vous utilisez. Parfait pour les étudiants.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Créer un compte gratuit
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Comment ça marche ?
              </Button>
            </Link>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mt-4">
            1€ de crédits offerts à l'inscription
          </p>
        </div>
      </section>

      {/* What 1€ gets you - PROMINENT */}
      <section className="py-12 px-4 bg-gradient-to-b from-primary-50 to-white border-y border-primary-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary-600 text-white text-sm font-semibold mb-4">
              1€ offert à l'inscription
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">
              Que pouvez-vous faire avec <span className="text-primary-600">1€</span> ?
            </h2>
            <p className="text-[var(--muted-foreground)] mt-2">
              Choisissez le modèle adapté à vos besoins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Claude Sonnet - Recommended */}
            <Card className="relative overflow-hidden border-2 border-primary-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-primary-600 text-white text-center py-1 text-sm font-medium">
                Recommandé
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">Claude Sonnet 4</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  Anthropic • Excellent équilibre qualité/prix
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-primary-600" />
                      <span className="text-sm">Questions simples</span>
                    </div>
                    <span className="text-2xl font-bold text-primary-600">~67</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Questions complexes</span>
                    </div>
                    <span className="text-2xl font-bold">~20</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Dissertations</span>
                    </div>
                    <span className="text-2xl font-bold">~7</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GPT-5 - OpenAI */}
            <Card className="relative overflow-hidden border-2 border-emerald-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-emerald-600 text-white text-center py-1 text-sm font-medium">
                Nouveau
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">GPT-5</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  OpenAI • Le plus récent et polyvalent
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm">Questions simples</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600">~100</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Questions complexes</span>
                    </div>
                    <span className="text-2xl font-bold">~30</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Dissertations</span>
                    </div>
                    <span className="text-2xl font-bold">~10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gemini Flash - Economy */}
            <Card className="relative overflow-hidden border-2 border-blue-500 shadow-lg">
              <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-1 text-sm font-medium">
                Ultra économique
              </div>
              <CardContent className="pt-10 pb-6">
                <h3 className="text-xl font-bold text-center">Gemini Flash</h3>
                <p className="text-sm text-[var(--muted-foreground)] text-center mb-6">
                  Google • Parfait pour les tâches simples
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span className="text-sm">Questions simples</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">~3000+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Questions complexes</span>
                    </div>
                    <span className="text-2xl font-bold">~900+</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--muted)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <span className="text-sm">Dissertations</span>
                    </div>
                    <span className="text-2xl font-bold">~300+</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/auth/signup">
              <Button size="lg">
          Récupérer mon euro offert
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] mt-3">
              + 12 autres modèles disponibles (Claude Opus, GPT-4o, Mistral, etc.)
            </p>
          </div>
        </div>
      </section>

      {/* How it works - Simple explanation */}
      <section id="how-it-works" className="py-16 px-4 bg-[var(--muted)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
            Vous payez quelques centimes par conversation au lieu de 20€/mois
            pour un abonnement que vous n'utilisez jamais entièrement.
          </p>

          {/* Step by step */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-semibold mb-2">Créez votre compte</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Inscription gratuite en 30 secondes. 1€ offert pour découvrir le service.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-semibold mb-2">Utilisez l'IA</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Posez vos questions, faites-vous aider pour vos devoirs, vos projets...
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-semibold mb-2">Payez selon votre usage</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Rechargez quand vous le souhaitez. Sans abonnement, sans engagement.
              </p>
            </div>
          </div>

          {/* Real cost examples */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-lg">Combien ça coûte vraiment ?</h3>
              </div>
              <p className="text-[var(--muted-foreground)] mb-6">
                Voici des exemples concrets pour des usages étudiants :
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <MessageSquare className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Poser une question simple</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      "Explique-moi le théorème de Pythagore"
                    </p>
                    <p className="text-lg font-bold text-primary-600 mt-1">~0.01€</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <FileText className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Relire et corriger un texte</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Dissertation de 2 pages
                    </p>
                    <p className="text-lg font-bold text-primary-600 mt-1">~0.03€</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <Code className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Débugger du code</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Comprendre une erreur Python
                    </p>
                    <p className="text-lg font-bold text-primary-600 mt-1">~0.02€</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--muted)]">
                  <HelpCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Préparer un examen</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      20 questions-réponses
                    </p>
                    <p className="text-lg font-bold text-primary-600 mt-1">~0.15€</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison with subscriptions */}
          <Card className="bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-4 text-center">
                💡 Pourquoi débourser 20€/mois quand 2€ suffisent ?
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center p-4">
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">Abonnement ChatGPT Plus</p>
                  <p className="text-3xl font-bold text-red-500">20€<span className="text-base font-normal">/mois</span></p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    Même si vous ne l'utilisez que 5 fois
                  </p>
                </div>
                <div className="text-center p-4">
                  <p className="text-sm text-[var(--muted-foreground)] mb-2">Avec iaiaz (usage moyen étudiant)</p>
                  <p className="text-3xl font-bold text-green-600">2-5€<span className="text-base font-normal">/mois</span></p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-2">
                    Vous payez exactement ce que vous utilisez
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Pourquoi choisir iaiaz ?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Pas d'abonnement
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Rechargez votre compte quand vous en avez besoin. Aucun
                  engagement, aucune mauvaise surprise.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-accent-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Tous les modèles</h3>
                <p className="text-[var(--muted-foreground)]">
                  Claude, GPT-4, Gemini, Mistral... Choisissez le meilleur
                  modèle pour chaque tâche.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Transparent et simple
                </h3>
                <p className="text-[var(--muted-foreground)]">
                  Vous savez exactement ce que coûte chaque message avant
                  de l'envoyer.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-16 px-4 bg-[var(--muted)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Des modèles pour chaque besoin
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-2xl mx-auto">
            Du plus économique au plus puissant, choisissez le modèle adapté à
            votre besoin. Nous vous guidons vers le meilleur rapport qualité/prix.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayModels.map((model) => (
              <Card
                key={model.id}
                className={
                  model.is_recommended ? "ring-2 ring-primary-500" : ""
                }
              >
                <CardContent className="pt-6">
                  {model.is_recommended && (
                    <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
                      Recommandé
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mt-2">{model.name}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    {model.provider}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {model.description}
                  </p>
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Coût moyen par question
                    </p>
                    <p className="text-lg font-semibold text-primary-600">
                      ~{((model.input_price * 500 + model.output_price * 500) * markupMultiplier / 1_000_000).toFixed(2)}€
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
            + 10 autres modèles disponibles dans l'application
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Rechargez à votre rythme
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12">
            Ajoutez des crédits et utilisez-les quand bon vous semble. Vos
            crédits n'expirent jamais.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className={pack.popular ? "ring-2 ring-primary-500" : ""}
              >
                <CardContent className="pt-6 text-center">
                  {pack.popular && (
                    <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-1 rounded-full">
                      Le plus populaire
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mt-2">{pack.name}</h3>
                  <p className="text-4xl font-bold my-4">{pack.price}€</p>
                  <p className="text-[var(--muted-foreground)] mb-2">
                    {pack.description}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-6">
                    ≈ {Math.round(pack.credits / 0.02)} questions simples
                  </p>
                  <ul className="text-sm text-left space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      {pack.credits}€ de crédits
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Tous les modèles IA
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      Jamais d'expiration
                    </li>
                  </ul>
                  <Link href="/auth/signup">
                    <Button
                      variant={pack.popular ? "primary" : "outline"}
                      className="w-full"
                    >
                      Commencer
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-b from-[var(--muted)] to-primary-50">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Envie de tester l'IA sans contraintes ?
          </h2>
          <p className="text-[var(--muted-foreground)] mb-6">
            Créez votre compte en 30 secondes et profitez d'1€ de crédits offerts.
          </p>
          <div className="inline-flex flex-wrap justify-center gap-3 mb-8 text-sm">
            <span className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full font-medium">
              ~67 questions avec Claude
            </span>
            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
              ~100 questions avec GPT-5
            </span>
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
              ~3000+ avec Gemini Flash
            </span>
          </div>
          <Link href="/auth/signup">
            <Button size="lg">
          Récupérer mon euro offert
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-[var(--muted-foreground)] mt-4">
            Sans engagement • Sans carte bancaire
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="text-2xl font-bold text-primary-600">iaiaz</div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Intelligence Artificielle Intelligemment Accessible, Zéro engagement
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              © 2025 iaiaz. Tous droits réservés.
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Fait avec ❤️ à Toulouse, France
            </p>
          </div>
          <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              CGU
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              CGV
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              Confidentialité
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
