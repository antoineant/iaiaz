import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  PenTool,
  Code,
  Languages,
  Calculator,
  Check,
  ArrowRight,
  Sparkles,
  PiggyBank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "IA pour Étudiants - ChatGPT & Claude sans abonnement",
  description:
    "Accédez à GPT-4, Claude et Gemini sans abonnement. Parfait pour les étudiants : payez uniquement ce que vous utilisez. 1€ offert à l'inscription.",
  keywords: [
    "ia pour étudiants",
    "chatgpt étudiant",
    "chatgpt étudiant gratuit",
    "ia gratuit étudiant",
    "aide devoirs ia",
    "dissertation ia",
    "révision ia",
    "chatgpt université",
    "claude étudiant",
    "gpt-4 étudiant",
  ],
  openGraph: {
    title: "iaiaz pour Étudiants - L'IA accessible à tous",
    description:
      "GPT-4, Claude, Gemini sans abonnement. Parfait pour le budget étudiant.",
  },
};

const useCases = [
  {
    icon: BookOpen,
    title: "Révisions & Examens",
    description:
      "Faites-vous expliquer des concepts complexes, créez des fiches de révision, testez vos connaissances avec des quiz personnalisés.",
    example: "Explique-moi la mitose comme si j'avais 10 ans",
  },
  {
    icon: PenTool,
    title: "Dissertations & Mémoires",
    description:
      "Structurez vos arguments, améliorez votre style, trouvez des sources pertinentes. L'IA vous guide sans écrire à votre place.",
    example: "Aide-moi à structurer ma dissertation sur Rousseau",
  },
  {
    icon: Code,
    title: "Programmation",
    description:
      "Déboguez votre code, comprenez les algorithmes, apprenez de nouveaux langages avec des explications claires.",
    example: "Pourquoi ma boucle for ne fonctionne pas ?",
  },
  {
    icon: Languages,
    title: "Langues étrangères",
    description:
      "Pratiquez la conversation, corrigez vos textes, apprenez du vocabulaire en contexte.",
    example: "Corrige mon email en anglais et explique mes erreurs",
  },
  {
    icon: Calculator,
    title: "Maths & Sciences",
    description:
      "Résolvez des problèmes étape par étape, comprenez les formules, visualisez les concepts.",
    example: "Explique-moi comment résoudre cette intégrale",
  },
  {
    icon: GraduationCap,
    title: "Recherche & Veille",
    description:
      "Synthétisez des articles, comparez des théories, préparez vos présentations.",
    example: "Résume les points clés de cet article de recherche",
  },
];

const testimonials = [
  {
    quote:
      "Avec 5€, j'ai tenu tout le semestre. Parfait pour les partiels !",
    author: "Léa, L3 Droit",
  },
  {
    quote:
      "Je peux enfin utiliser Claude ET GPT-4 selon mes besoins, sans me ruiner.",
    author: "Thomas, M1 Informatique",
  },
  {
    quote:
      "Le modèle Mistral est incroyable pour le français, et il coûte presque rien.",
    author: "Camille, Prépa Lettres",
  },
];

const budgetExamples = [
  { amount: "1€", usage: "~50 questions avec Claude Sonnet" },
  { amount: "5€", usage: "Un mois d'utilisation modérée" },
  { amount: "10€", usage: "Préparation complète des partiels" },
];

export default function EtudiantsPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-accent-100 text-primary-700 text-sm font-medium mb-6 shadow-sm">
            <GraduationCap className="w-4 h-4" />
            Spécial Étudiants
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            L&apos;IA qui respecte
            <br />
            <span className="text-primary-600">ton budget étudiant</span>
          </h1>
          <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto mb-8">
            Accède à GPT-4, Claude, Gemini et Mistral sans abonnement mensuel.
            Paie uniquement ce que tu utilises, à partir de 0.001€ par message.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href="/auth/signup">
              <Button size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                1€ offert à l&apos;inscription
              </Button>
            </Link>
            <Link href="/comparatif">
              <Button variant="outline" size="lg">
                Voir le comparatif
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--muted-foreground)]">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Sans carte bancaire
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Zéro engagement
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" /> Crédits sans expiration
            </span>
          </div>
        </section>

        {/* Budget Section */}
        <section className="bg-[var(--muted)] py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PiggyBank className="w-6 h-6 text-primary-600" />
              <h2 className="text-2xl font-bold">Adapté au budget étudiant</h2>
            </div>
            <p className="text-center text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              Oublie les 20€/mois de ChatGPT Plus. Avec iaiaz, tu contrôles tes
              dépenses.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {budgetExamples.map((example, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="pt-6">
                    <div className="text-4xl font-bold text-primary-600 mb-2">
                      {example.amount}
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)]">
                      {example.usage}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
              Les crédits n&apos;expirent jamais. Recharge quand tu veux.
            </p>
          </div>
        </section>

        {/* Use Cases */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-4">
            Comment les étudiants utilisent iaiaz
          </h2>
          <p className="text-center text-[var(--muted-foreground)] mb-12 max-w-xl mx-auto">
            L&apos;IA est un outil d&apos;apprentissage, pas de triche. Elle
            t&apos;aide à comprendre et progresser.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <useCase.icon className="w-8 h-8 text-primary-600 mb-4" />
                  <h3 className="font-bold text-lg mb-2">{useCase.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    {useCase.description}
                  </p>
                  <div className="bg-[var(--muted)] rounded-lg p-3 text-sm italic">
                    &quot;{useCase.example}&quot;
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Why Multiple Models */}
        <section className="bg-gradient-to-b from-primary-50 to-white py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Pourquoi avoir accès à plusieurs IA ?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-orange-600">C</span>
                  </div>
                  <div>
                    <strong>Claude</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Parfait pour les dissertations et l&apos;analyse de textes
                      longs. Très bon en français.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-green-600">G</span>
                  </div>
                  <div>
                    <strong>GPT-4</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Très polyvalent, excellent pour le code et les maths.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-blue-600">G</span>
                  </div>
                  <div>
                    <strong>Gemini</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Peut analyser des documents très longs (jusqu&apos;à 1
                      million de tokens).
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-purple-600">M</span>
                  </div>
                  <div>
                    <strong>Mistral</strong>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      IA française, ultra économique. Parfait pour les questions
                      simples.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Ce qu&apos;en disent les étudiants
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {testimonials.map((testimonial, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <p className="italic mb-4">&quot;{testimonial.quote}&quot;</p>
                  <p className="text-sm text-[var(--muted-foreground)] font-medium">
                    — {testimonial.author}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Ethics Note */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-3xl mx-auto">
            <h3 className="font-bold mb-2 text-amber-800">
              Note sur l&apos;utilisation éthique
            </h3>
            <p className="text-sm text-amber-700">
              L&apos;IA est un outil d&apos;apprentissage, pas de triche.
              Utilise-la pour comprendre des concepts, améliorer ton travail et
              apprendre plus efficacement. Ne soumets jamais un texte généré par
              IA comme ton propre travail sans le modifier et le comprendre.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à booster tes études ?
            </h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-xl mx-auto">
              Inscris-toi en 30 secondes et reçois 1€ de crédits offerts. De
              quoi tester tous les modèles !
            </p>
            <Link href="/auth/signup">
              <Button size="lg">
                Créer mon compte gratuit <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-[var(--muted-foreground)] mt-4">
              Sans carte bancaire • Sans engagement • Crédits sans expiration
            </p>
          </div>
        </section>
      </main>

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
              Fait avec amour à Toulouse, France
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
