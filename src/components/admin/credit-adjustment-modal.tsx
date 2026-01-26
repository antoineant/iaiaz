"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, AlertCircle, Check, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreditType = "personal" | "organization";

interface CreditAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  // For organization credits
  organizationId?: string;
  organizationName?: string;
  organizationBalance?: number;
  // For personal credits
  userId?: string;
  userEmail?: string;
  userBalance?: number;
  // Callback
  onSuccess?: () => void;
}

export function CreditAdjustmentModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  organizationBalance = 0,
  userId,
  userEmail,
  userBalance = 0,
  onSuccess,
}: CreditAdjustmentModalProps) {
  const t = useTranslations("admin.creditAdjustment");
  const [creditType, setCreditType] = useState<CreditType>(
    organizationId ? "organization" : "personal"
  );
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const currentBalance = creditType === "organization" ? organizationBalance : userBalance;
  const parsedAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, currentBalance + parsedAmount);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(t("reasonRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let response;

      if (creditType === "organization" && organizationId) {
        response = await fetch(`/api/admin/organizations/${organizationId}/credits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parsedAmount, reason: reason.trim() }),
        });
      } else if (userId) {
        response = await fetch(`/api/admin/users/${userId}/credits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: parsedAmount, reason: reason.trim() }),
        });
      } else {
        setError("No valid target for credit adjustment");
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || t("error"));
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset state
        setSuccess(false);
        setAmount("");
        setReason("");
      }, 1500);
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const canSwitchType = organizationId && userId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--background)] rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-semibold">{t("title")}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Success state */}
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium text-green-600 dark:text-green-400">
                {t("success")}
              </p>
            </div>
          ) : (
            <>
              {/* Credit type selector (only if both org and user are provided) */}
              {canSwitchType && (
                <div>
                  <Label className="mb-2 block">Type de crédit</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCreditType("organization")}
                      className={`flex-1 p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                        creditType === "organization"
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30"
                          : "border-[var(--border)] hover:bg-[var(--muted)]/50"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm">{t("orgCredits")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreditType("personal")}
                      className={`flex-1 p-3 rounded-lg border flex items-center gap-2 transition-colors ${
                        creditType === "personal"
                          ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30"
                          : "border-[var(--border)] hover:bg-[var(--muted)]/50"
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm">{t("personalCredits")}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Target info */}
              <div className="p-3 rounded-lg bg-[var(--muted)]">
                {creditType === "organization" && organizationName ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary-600" />
                    <span className="font-medium">{organizationName}</span>
                  </div>
                ) : userEmail ? (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="font-medium">{userEmail}</span>
                  </div>
                ) : null}
              </div>

              {/* Amount input */}
              <div>
                <Label className="mb-2 block">{t("amount")}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00 ou -5.00"
                    className="pr-8"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    €
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Utilisez un nombre positif pour ajouter, négatif pour retirer
                </p>
              </div>

              {/* Reason input */}
              <div>
                <Label className="mb-2 block">{t("reason")}</Label>
                <Input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("reasonPlaceholder")}
                  disabled={isLoading}
                />
              </div>

              {/* Preview */}
              {parsedAmount !== 0 && (
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <div className="flex justify-between text-sm">
                    <span>{t("currentBalance")}:</span>
                    <span>{currentBalance.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Ajustement:</span>
                    <span
                      className={
                        parsedAmount > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {parsedAmount > 0 ? "+" : ""}
                      {parsedAmount.toFixed(2)}€
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 font-medium border-t border-[var(--border)] pt-1">
                    <span>{t("newBalance")}:</span>
                    <span>{newBalance.toFixed(2)}€</span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="p-4 border-t border-[var(--border)] flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isLoading || parsedAmount === 0 || !reason.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("confirm")
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
