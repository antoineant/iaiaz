"use client";

import { estimateCost, getModelInfo, type ModelId } from "@/lib/pricing";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, TrendingDown } from "lucide-react";

interface CostEstimateProps {
  model: ModelId;
  inputText: string;
  balance: number;
}

export function CostEstimate({ model, inputText, balance }: CostEstimateProps) {
  if (!inputText.trim()) {
    return null;
  }

  const estimate = estimateCost(model, inputText);
  const modelInfo = getModelInfo(model);
  const balanceAfter = balance - estimate.cost;
  const isLowBalance = balanceAfter < 0.5;
  const isInsufficientBalance = balanceAfter < 0;

  return (
    <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] px-1">
      <div className="flex items-center gap-1.5">
        <span>Estimation :</span>
        <span className="font-medium text-[var(--foreground)]">
          ~{formatCurrency(estimate.cost)}
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
        ~{estimate.inputTokens} tokens entrée, ~{estimate.outputTokens} sortie
      </div>
    </div>
  );
}
