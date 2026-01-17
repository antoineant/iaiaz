"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FAQSchema } from "./structured-data";

const faqKeys = [
  "cost",
  "vsChatgpt",
  "subscription",
  "models",
  "credits",
  "privacy",
  "students",
  "freeCredits",
  "expiration",
  "refund",
] as const;

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
  const t = useTranslations("faq");

  const faqs = faqKeys.map((key) => ({
    question: t(`items.${key}.question`),
    answer: t(`items.${key}.answer`),
  }));

  return (
    <section id="faq" className="py-16 px-4">
      <FAQSchema faqs={faqs} />
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          {t("title")}
        </h2>
        <p className="text-center text-[var(--muted-foreground)] mb-12">
          {t("subtitle")}
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
