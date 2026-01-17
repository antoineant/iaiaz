"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQSchema } from "./structured-data";

export const faqs = [
  {
    question: "Combien coûte iaiaz ?",
    answer:
      "iaiaz fonctionne sans abonnement. Vous achetez des crédits (à partir de 1€) et payez uniquement ce que vous utilisez. Une question simple coûte environ 0.01€ à 0.02€ selon le modèle. Nous offrons 1€ de crédits gratuits à l'inscription pour tester.",
  },
  {
    question: "Quelle est la différence entre iaiaz et ChatGPT Plus ?",
    answer:
      "ChatGPT Plus coûte 20€/mois que vous l'utilisiez ou non. Avec iaiaz, vous payez à l'usage : si vous utilisez l'IA 10 fois dans le mois, vous payez quelques centimes, pas 20€. De plus, iaiaz vous donne accès à plusieurs modèles (Claude, GPT-4, Gemini, Mistral) au lieu d'un seul.",
  },
  {
    question: "Faut-il un abonnement pour utiliser iaiaz ?",
    answer:
      "Non, jamais. C'est notre principe fondamental : zéro engagement, zéro abonnement. Vous achetez des crédits quand vous en avez besoin, et ils n'expirent jamais. Pas de renouvellement automatique, pas de frais cachés.",
  },
  {
    question: "Quels modèles d'IA sont disponibles ?",
    answer:
      "iaiaz propose plus de 15 modèles : Claude Opus, Claude Sonnet et Claude Haiku (Anthropic), GPT-5, GPT-4o et GPT-4o Mini (OpenAI), Gemini 2.5 Pro et Gemini Flash (Google), Mistral Large, Medium et Small, et Codestral pour le code.",
  },
  {
    question: "Comment fonctionne le système de crédits ?",
    answer:
      "Chaque message consomme des crédits selon le modèle utilisé et la longueur de la conversation. Le coût est affiché en temps réel avant d'envoyer votre message. Par exemple, une question simple avec Claude Sonnet coûte environ 0.015€.",
  },
  {
    question: "Mes données sont-elles protégées ?",
    answer:
      "Oui. iaiaz est une entreprise française (BAJURIAN SAS) soumise au RGPD. Vos conversations sont stockées de manière sécurisée et ne sont jamais utilisées pour entraîner les modèles IA. Vous pouvez supprimer vos données à tout moment.",
  },
  {
    question: "Puis-je utiliser iaiaz pour mes études ?",
    answer:
      "Absolument ! iaiaz est parfait pour les étudiants : aide à la rédaction, explication de concepts complexes, correction de textes, aide au code, préparation d'examens... Et le modèle économique sans abonnement est idéal pour un budget étudiant.",
  },
  {
    question: "Comment obtenir mes crédits gratuits ?",
    answer:
      "Créez simplement un compte sur iaiaz. Dès la validation de votre email, 1€ de crédits sont automatiquement ajoutés à votre compte. Aucune carte bancaire n'est requise pour l'inscription.",
  },
  {
    question: "Les crédits expirent-ils ?",
    answer:
      "Non, jamais. Vos crédits restent sur votre compte indéfiniment. Vous pouvez acheter des crédits aujourd'hui et les utiliser dans 6 mois sans aucun problème.",
  },
  {
    question: "Puis-je me faire rembourser ?",
    answer:
      "Oui. Vous pouvez demander le remboursement de vos crédits non utilisés à tout moment. Le remboursement est calculé au prorata du solde restant. Contactez-nous simplement par email à admin@iaiaz.com.",
  },
];

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-4 flex items-center justify-between text-left hover:text-primary-600 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium pr-4">{question}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 flex-shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isOpen ? "max-h-96 pb-4" : "max-h-0"
        )}
      >
        <p className="text-[var(--muted-foreground)] leading-relaxed">
          {answer}
        </p>
      </div>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 px-4">
      <FAQSchema faqs={faqs} />
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          Questions fréquentes
        </h2>
        <p className="text-center text-[var(--muted-foreground)] mb-12">
          Tout ce que vous devez savoir sur iaiaz
        </p>

        <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
