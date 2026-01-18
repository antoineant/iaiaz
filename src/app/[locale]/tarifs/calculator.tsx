"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import type { DBModel } from "@/lib/pricing-db";

interface PricingCalculatorProps {
  models: DBModel[];
  markupMultiplier: number;
  locale: string;
}

export function PricingCalculator({ models, markupMultiplier, locale }: PricingCalculatorProps) {
  const currencySymbol = locale === "fr" ? "€" : "$";
  const texts = locale === "fr" ? {
    title: "Estimez votre coût mensuel",
    model: "Modèle IA",
    messagesPerDay: "Messages par jour",
    daysPerMonth: "Jours d'utilisation par mois",
    costPerMessage: "Coût par message",
    messagesMonth: "Messages/mois",
    estimatedCost: "Coût mensuel estimé",
    vsChatgpt: "vs ChatGPT Plus: 20€/mois",
    savings: "Économie",
    noModel: "Aucun modèle disponible",
    note1: "* Estimation basée sur ~300 tokens en entrée et ~500 tokens en sortie par message.",
    note2: "* Les coûts réels dépendent de la longueur de vos conversations."
  } : {
    title: "Estimate your monthly cost",
    model: "AI Model",
    messagesPerDay: "Messages per day",
    daysPerMonth: "Days of use per month",
    costPerMessage: "Cost per message",
    messagesMonth: "Messages/month",
    estimatedCost: "Estimated monthly cost",
    vsChatgpt: "vs ChatGPT Plus: $20/mo",
    savings: "Savings",
    noModel: "No model available",
    note1: "* Estimate based on ~300 input tokens and ~500 output tokens per message.",
    note2: "* Actual costs depend on your conversation length."
  };
  // Find default model (recommended or first)
  const defaultModel = models.find((m) => m.is_recommended)?.id || models[0]?.id || "";
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [messagesPerDay, setMessagesPerDay] = useState(10);
  const [daysPerMonth, setDaysPerMonth] = useState(20);

  const model = models.find((m) => m.id === selectedModel);

  if (!model) {
    return (
      <div className="max-w-2xl mx-auto border rounded-2xl p-6 md:p-8 bg-card text-center text-muted-foreground">
        {texts.noModel}
      </div>
    );
  }

  // Estimate: ~300 input tokens, ~500 output tokens per message
  const avgInputTokens = 300;
  const avgOutputTokens = 500;

  const costPerMessage = ((avgInputTokens * model.input_price + avgOutputTokens * model.output_price) / 1_000_000) * markupMultiplier;
  const totalMessages = messagesPerDay * daysPerMonth;
  const monthlyCost = costPerMessage * totalMessages;

  return (
    <div className="max-w-2xl mx-auto border rounded-2xl p-6 md:p-8 bg-card">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-bold">{texts.title}</h3>
      </div>

      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {texts.model}
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-3 border rounded-lg bg-background"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {model.description}
          </p>
        </div>

        {/* Messages per day */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {texts.messagesPerDay}: <span className="text-primary font-bold">{messagesPerDay}</span>
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={messagesPerDay}
            onChange={(e) => setMessagesPerDay(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        {/* Days per month */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {texts.daysPerMonth}: <span className="text-primary font-bold">{daysPerMonth}</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={daysPerMonth}
            onChange={(e) => setDaysPerMonth(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>15</span>
            <span>30</span>
          </div>
        </div>

        {/* Results */}
        <div className="bg-muted/50 rounded-xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{texts.costPerMessage}</span>
            <span className="font-mono">{currencySymbol}{costPerMessage.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">{texts.messagesMonth}</span>
            <span className="font-mono">{totalMessages}</span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between items-center">
            <span className="font-bold">{texts.estimatedCost}</span>
            <span className="text-2xl font-bold text-primary">
              {currencySymbol}{monthlyCost.toFixed(2)}
            </span>
          </div>
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              {texts.vsChatgpt}
              {monthlyCost < 20 && (
                <span className="text-green-600 dark:text-green-400 font-medium ml-2">
                  ({texts.savings}: {((1 - monthlyCost / 20) * 100).toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>{texts.note1}</p>
          <p>{texts.note2}</p>
        </div>
      </div>
    </div>
  );
}
