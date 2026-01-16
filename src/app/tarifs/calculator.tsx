"use client";

import { useState } from "react";
import { MODEL_PRICING, MARKUP, type ModelId } from "@/lib/pricing";
import { Calculator } from "lucide-react";

const models = Object.entries(MODEL_PRICING).map(([id, info]) => ({
  id: id as ModelId,
  ...info,
}));

export function PricingCalculator() {
  const [selectedModel, setSelectedModel] = useState<ModelId>("claude-sonnet-4-20250514");
  const [messagesPerDay, setMessagesPerDay] = useState(10);
  const [daysPerMonth, setDaysPerMonth] = useState(20);

  const model = MODEL_PRICING[selectedModel];

  // Estimate: ~300 input tokens, ~500 output tokens per message
  const avgInputTokens = 300;
  const avgOutputTokens = 500;

  const costPerMessage = ((avgInputTokens * model.input + avgOutputTokens * model.output) / 1_000_000) * MARKUP;
  const totalMessages = messagesPerDay * daysPerMonth;
  const monthlyCost = costPerMessage * totalMessages;

  return (
    <div className="max-w-2xl mx-auto border rounded-2xl p-6 md:p-8 bg-card">
      <div className="flex items-center gap-2 mb-6">
        <Calculator className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Estimez votre coût mensuel</h3>
      </div>

      <div className="space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Modèle IA
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelId)}
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
            Messages par jour: <span className="text-primary font-bold">{messagesPerDay}</span>
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
            Jours d&apos;utilisation par mois: <span className="text-primary font-bold">{daysPerMonth}</span>
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
            <span className="text-muted-foreground">Coût par message</span>
            <span className="font-mono">{costPerMessage.toFixed(4)}€</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Messages/mois</span>
            <span className="font-mono">{totalMessages}</span>
          </div>
          <hr className="border-border" />
          <div className="flex justify-between items-center">
            <span className="font-bold">Coût mensuel estimé</span>
            <span className="text-2xl font-bold text-primary">
              {monthlyCost.toFixed(2)}€
            </span>
          </div>
          <div className="text-center pt-2">
            <span className="text-xs text-muted-foreground">
              vs ChatGPT Plus: 20€/mois
              {monthlyCost < 20 && (
                <span className="text-green-600 dark:text-green-400 font-medium ml-2">
                  (Économie: {((1 - monthlyCost / 20) * 100).toFixed(0)}%)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>* Estimation basée sur ~300 tokens en entrée et ~500 tokens en sortie par message.</p>
          <p>* Les coûts réels dépendent de la longueur de vos conversations.</p>
        </div>
      </div>
    </div>
  );
}
