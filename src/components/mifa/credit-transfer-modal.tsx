"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { getThemeColor } from "@/lib/mifa/theme";

interface Member {
  user_id: string;
  role: string;
  supervision_mode: string | null;
  profiles: {
    display_name: string | null;
    accent_color: string | null;
  } | null;
}

interface CreditTransferModalProps {
  open: boolean;
  onClose: () => void;
  organizationBalance: number;
  members: Member[];
}

export function CreditTransferModal({
  open,
  onClose,
  organizationBalance,
  members,
}: CreditTransferModalProps) {
  const t = useTranslations("mifa.dashboard.transfer");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const totalToTransfer = Object.values(amounts).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const isValid = totalToTransfer > 0 && totalToTransfer <= organizationBalance;

  const handleTransfer = async () => {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      const transfers = Object.entries(amounts)
        .filter(([_, amount]) => parseFloat(amount) > 0)
        .map(([userId, amount]) => ({
          userId,
          amount: parseFloat(amount),
        }));

      const response = await fetch("/api/mifa/transfer-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transfers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("error"));
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.reload(); // Refresh to show updated balances
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmounts({});
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Organization Balance */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-[var(--muted-foreground)] mb-1">
              {t("orgBalance")}
            </p>
            <p className="text-2xl font-bold text-green-600">
              {organizationBalance.toFixed(2)}€
            </p>
          </div>

          {/* Member Inputs */}
          <div className="space-y-3">
            {members.map((member) => {
              const profile = member.profiles;
              const firstName = profile?.display_name || "Member";
              const accentColor = getThemeColor(profile?.accent_color || "blue");

              return (
                <div key={member.user_id} className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: accentColor?.hex || "#818CF8" }}
                  >
                    {firstName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + Input */}
                  <div className="flex-1">
                    <Label htmlFor={`amount-${member.user_id}`} className="text-sm mb-1 block">
                      {firstName}
                    </Label>
                    <div className="relative">
                      <Input
                        id={`amount-${member.user_id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={organizationBalance}
                        placeholder="0.00"
                        value={amounts[member.user_id] || ""}
                        onChange={(e) =>
                          setAmounts({ ...amounts, [member.user_id]: e.target.value })
                        }
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--muted-foreground)]">
                        €
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Preview */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]/50 border border-[var(--border)]">
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">{t("totalToTransfer")}</p>
              <p className="text-lg font-bold">{totalToTransfer.toFixed(2)}€</p>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">{t("remaining")}</p>
              <p
                className={`text-lg font-bold ${
                  totalToTransfer > organizationBalance
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {(organizationBalance - totalToTransfer).toFixed(2)}€
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{t("success")}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!isValid || loading || success}
          >
            {loading ? t("transferring") : t("confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
