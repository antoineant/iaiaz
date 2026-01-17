"use client";

import { formatCurrency } from "@/lib/utils";
import { AlertCircle, TrendingDown } from "lucide-react";
import type { PricingData } from "@/lib/pricing-db";

interface CostEstimateProps {
  model: string;
  inputText: string;
  balance: number;
  pricingData: PricingData;
}

export function CostEstimate({ model, inputText, balance, pricingData }: CostEstimateProps) {
  if (!inputText.trim()) {
    return null;
  }

  const modelInfo = pricingData.models.find((m) => m.id === model);
  if (!modelInfo) {
    return null;
  }

  // Rough estimation: ~4 characters per token
  const inputTokens = Math.ceil(inputText.length / 4);
  const estimatedOutputTokens = 500;

  // Calculate cost using DB pricing
  const baseCost =
    (inputTokens * modelInfo.input_price + estimatedOutputTokens * modelInfo.output_price) /
    1_000_000;
  const cost = baseCost * pricingData.settings.markupMultiplier;

  const balanceAfter = balance - cost;
  const isLowBalance = balanceAfter < 0.5;
  const isInsufficientBalance = balanceAfter < 0;

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] px-1">
      <div className="flex items-center gap-1.5">
        <span>Estimation :</span>
        <span className="font-medium text-[var(--foreground)]">
          ~{formatCurrency(cost)}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span>Après envoi :</span>
        <span
          className={
            isInsufficientBalance
              ? "text-red-500 font-medium"
              : isLowBalance
                ? "text-orange-500 font-medium"
                : "text-[var(--foreground)] font-medium"
          }
        >
          {formatCurrency(Math.max(0, balanceAfter))}
        </span>
      </div>

      {isInsufficientBalance && (
        <div className="flex items-center gap-1 text-red-500">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Crédits insuffisants</span>
        </div>
      )}

      {!isInsufficientBalance && isLowBalance && (
        <div className="flex items-center gap-1 text-orange-500">
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Solde bas</span>
        </div>
      )}

      <div className="ml-auto text-[var(--muted-foreground)]">
        ~{inputTokens} tokens entrée, ~{estimatedOutputTokens} sortie
      </div>
    </div>
  );
}
