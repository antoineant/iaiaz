"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, AlertCircle, Mail } from "lucide-react";

interface EmailFormProps {
  currentEmail: string;
}

export function EmailForm({ currentEmail }: EmailFormProps) {
  const t = useTranslations("settings.security");
  const [isOpen, setIsOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!newEmail) {
      setError(t("emailRequired"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError(t("invalidEmail"));
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError(t("sameEmail"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });

      if (response.ok) {
        setSuccess(true);
        setNewEmail("");
      } else {
        const data = await response.json();
        setError(data.error || t("changeFailed"));
      }
    } catch {
      setError(t("changeFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div>
        <Label>{t("email")}</Label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[var(--muted-foreground)]">{currentEmail}</span>
          <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
            {t("changeEmail")}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
          <Mail className="w-5 h-5" />
          <span className="font-medium">{t("verificationSent")}</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-500">
          {t("verificationSentDescription", { email: newEmail || "your new email" })}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={() => {
            setIsOpen(false);
            setSuccess(false);
          }}
        >
          {t("done")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="newEmail">{t("newEmail")}</Label>
        <Input
          id="newEmail"
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder={t("newEmailPlaceholder")}
          className="mt-1"
        />
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          {t("emailChangeNote")}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {t("sendVerification")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            setNewEmail("");
            setError(null);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
