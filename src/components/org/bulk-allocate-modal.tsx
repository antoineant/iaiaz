"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Users, CreditCard, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClassOption {
  id: string;
  name: string;
  student_count: number;
  status: string;
}

interface BulkAllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableCredits: number;
  preselectedClassId?: string;
  onSuccess?: () => void;
}

export function BulkAllocateModal({
  isOpen,
  onClose,
  availableCredits,
  preselectedClassId,
  onSuccess,
}: BulkAllocateModalProps) {
  const t = useTranslations("org.bulkAllocate");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(preselectedClassId || "");
  const [amountPerStudent, setAmountPerStudent] = useState<string>("5");
  const [applyToNewStudents, setApplyToNewStudents] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load classes on mount
  useEffect(() => {
    if (isOpen) {
      loadClasses();
    }
  }, [isOpen]);

  // Set preselected class when it changes
  useEffect(() => {
    if (preselectedClassId) {
      setSelectedClassId(preselectedClassId);
    }
  }, [preselectedClassId]);

  const loadClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const response = await fetch("/api/org/classes");
      if (response.ok) {
        const data = await response.json();
        // Filter only active classes
        const activeClasses = data.filter(
          (c: ClassOption) => c.status === "active"
        );
        setClasses(activeClasses);

        // If no preselected class and there's only one active class, select it
        if (!preselectedClassId && activeClasses.length === 1) {
          setSelectedClassId(activeClasses[0].id);
        }
      }
    } catch {
      console.error("Failed to load classes");
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const amount = parseFloat(amountPerStudent) || 0;
  const studentCount = selectedClass?.student_count || 0;
  const totalAmount = amount * studentCount;
  const hasEnoughCredits = totalAmount <= availableCredits;

  const handleSubmit = async () => {
    if (!selectedClassId || amount <= 0) {
      setError(t("error"));
      return;
    }

    if (!hasEnoughCredits) {
      setError(t("insufficientCredits"));
      return;
    }

    if (studentCount === 0) {
      setError(t("noStudents"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/org/classes/${selectedClassId}/bulk-allocate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount_per_student: amount,
            update_default: applyToNewStudents,
          }),
        }
      );

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
        setSelectedClassId(preselectedClassId || "");
        setAmountPerStudent("5");
        setApplyToNewStudents(true);
      }, 1500);
    } catch {
      setError(t("error"));
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold">{t("title")}</h2>
          </div>
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
          ) : isLoadingClasses ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t("noClasses")}</p>
            </div>
          ) : (
            <>
              {/* Class selector */}
              <div>
                <Label className="mb-2 block">{t("selectClass")}</Label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)]"
                  disabled={isLoading}
                >
                  <option value="">{t("selectClass")}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.student_count} {c.student_count === 1 ? "student" : "students"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount per student */}
              <div>
                <Label className="mb-2 block">{t("amountPerStudent")}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amountPerStudent}
                    onChange={(e) => setAmountPerStudent(e.target.value)}
                    className="pr-8"
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">
                    €
                  </span>
                </div>
              </div>

              {/* Preview */}
              {selectedClass && amount > 0 && (
                <div className="p-3 rounded-lg bg-[var(--muted)]">
                  <p className="text-sm font-medium">
                    {studentCount} {studentCount === 1 ? "élève" : "élèves"} × {amount.toFixed(2)}€ ={" "}
                    <span
                      className={
                        hasEnoughCredits
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }
                    >
                      {totalAmount.toFixed(2)}€
                    </span>
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Crédits disponibles: {availableCredits.toFixed(2)}€
                  </p>
                </div>
              )}

              {/* Apply to new students checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToNewStudents}
                  onChange={(e) => setApplyToNewStudents(e.target.checked)}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div>
                  <span className="text-sm font-medium">
                    {t("applyToNewStudents")}
                  </span>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Les nouveaux élèves recevront automatiquement {amount.toFixed(2)}€
                  </p>
                </div>
              </label>

              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && !isLoadingClasses && classes.length > 0 && (
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
              disabled={
                isLoading ||
                !selectedClassId ||
                amount <= 0 ||
                !hasEnoughCredits ||
                studentCount === 0
              }
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
