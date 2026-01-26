"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Loader2,
  AlertCircle,
  Check,
  ArrowRight,
  ArrowLeft,
  Building2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TransferDirection = "to_org" | "to_personal";

interface TransferInfo {
  can_transfer: boolean;
  reason?: string;
  personal_balance: number;
  org_balance: number;
  org_allocated: number;
  org_available: number;
  org_name: string;
  org_type: string;
  role: string;
}

interface TransferCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TransferCreditsModal({
  isOpen,
  onClose,
  onSuccess,
}: TransferCreditsModalProps) {
  const t = useTranslations("org.transferCredits");
  const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
  const [direction, setDirection] = useState<TransferDirection>("to_org");
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load transfer info on mount
  useEffect(() => {
    if (isOpen) {
      loadTransferInfo();
    }
  }, [isOpen]);

  const loadTransferInfo = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/org/credits/transfer");
      if (response.ok) {
        const data = await response.json();
        setTransferInfo(data);
        if (!data.can_transfer) {
          setError(t("noPermission"));
        }
      } else {
        setError(t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;

  const maxAmount =
    direction === "to_org"
      ? transferInfo?.personal_balance || 0
      : transferInfo?.org_available || 0;

  const isValidAmount = parsedAmount > 0 && parsedAmount <= maxAmount;

  const handleSubmit = async () => {
    if (!isValidAmount || !transferInfo?.can_transfer) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/org/credits/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          amount: parsedAmount,
        }),
      });

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
        setDirection("to_org");
      }, 1500);
    } catch {
      setError(t("error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetMax = () => {
    setAmount(maxAmount.toFixed(2));
  };

  if (!isOpen) return null;

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
            disabled={isSubmitting}
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
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : !transferInfo?.can_transfer ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-[var(--muted-foreground)]">{t("noPermission")}</p>
            </div>
          ) : (
            <>
              {/* Current balances */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    direction === "to_org"
                      ? "border-primary-300 bg-primary-50 dark:bg-primary-950/30"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium">{t("personal")}</span>
                  </div>
                  <p className="text-lg font-bold">
                    {transferInfo.personal_balance.toFixed(2)}€
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg border transition-colors ${
                    direction === "to_personal"
                      ? "border-primary-300 bg-primary-50 dark:bg-primary-950/30"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-medium truncate">
                      {transferInfo.org_name}
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {transferInfo.org_available.toFixed(2)}€
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("available")}
                  </p>
                </div>
              </div>

              {/* Direction selector */}
              <div className="flex items-center justify-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => setDirection("to_org")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    direction === "to_org"
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                      : "border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4" />
                  <Building2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("to_personal")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    direction === "to_personal"
                      ? "border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                      : "border-[var(--border)] hover:bg-[var(--muted)]"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <ArrowRight className="w-4 h-4" />
                  <Wallet className="w-4 h-4" />
                </button>
              </div>

              <p className="text-center text-sm text-[var(--muted-foreground)]">
                {direction === "to_org" ? t("toOrgDescription") : t("toPersonalDescription")}
              </p>

              {/* Amount input */}
              <div>
                <Label className="mb-2 block">{t("amount")}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={maxAmount}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pr-8"
                      disabled={isSubmitting}
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                      €
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSetMax}
                    disabled={isSubmitting}
                  >
                    Max
                  </Button>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("maxAvailable")}: {maxAmount.toFixed(2)}€
                </p>
              </div>

              {/* Preview */}
              {parsedAmount > 0 && (
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t("afterTransfer")}:</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        {(direction === "to_org"
                          ? transferInfo.personal_balance - parsedAmount
                          : transferInfo.personal_balance + parsedAmount
                        ).toFixed(2)}
                        €
                      </span>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary-600" />
                      <span className="text-sm">
                        {(direction === "to_org"
                          ? transferInfo.org_available + parsedAmount
                          : transferInfo.org_available - parsedAmount
                        ).toFixed(2)}
                        €
                      </span>
                    </div>
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
        {!success && !isLoading && transferInfo?.can_transfer && (
          <div className="p-4 border-t border-[var(--border)] flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || !isValidAmount}
            >
              {isSubmitting ? (
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
