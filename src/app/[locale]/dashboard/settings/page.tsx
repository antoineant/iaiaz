"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/settings/avatar-upload";
import { CreditPreferenceSelector } from "@/components/settings/credit-preference-selector";
import { PasswordForm } from "@/components/settings/password-form";
import { EmailForm } from "@/components/settings/email-form";
import {
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  Trash2,
} from "lucide-react";
import type { CreditPreference } from "@/lib/credits";

type RetentionDays = null | 7 | 30 | 90 | 365;

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  credit_preference: CreditPreference;
  credits_balance: number;
  conversation_retention_days: RetentionDays;
}

interface Credits {
  source: "organization" | "personal";
  balance: number;
  orgId?: string;
  orgName?: string;
  role?: string;
  preference?: CreditPreference;
  personalBalance?: number;
  orgBalance?: number;
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Privacy states
  const [retentionDays, setRetentionDays] = useState<RetentionDays>(null);
  const [isSavingRetention, setIsSavingRetention] = useState(false);
  const [retentionSuccess, setRetentionSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
          setCredits(data.credits);
          setDisplayName(data.profile.display_name || "");
          setRetentionDays(data.profile.conversation_retention_days);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveDisplayName = async () => {
    if (!profile) return;

    setIsSavingName(true);
    setNameSuccess(false);
    setNameError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({ ...profile, display_name: data.profile.display_name });
        setNameSuccess(true);
        setTimeout(() => setNameSuccess(false), 3000);
      } else {
        const data = await response.json();
        setNameError(data.error || "Failed to save");
      }
    } catch {
      setNameError("Failed to save");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleAvatarChange = (newUrl: string | null) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl });
    }
  };

  const handlePreferenceChange = (newPreference: CreditPreference) => {
    if (profile) {
      setProfile({ ...profile, credit_preference: newPreference });
    }
  };

  const handleRetentionChange = async (newRetention: RetentionDays) => {
    setIsSavingRetention(true);
    setRetentionSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_retention_days: newRetention }),
      });

      if (response.ok) {
        setRetentionDays(newRetention);
        if (profile) {
          setProfile({ ...profile, conversation_retention_days: newRetention });
        }
        setRetentionSuccess(true);
        setTimeout(() => setRetentionSuccess(false), 3000);
      }
    } catch {
      // Silent fail - user can retry
    } finally {
      setIsSavingRetention(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/conversations/delete-all", {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteSuccess(true);
        setShowDeleteConfirm(false);
        setTimeout(() => setDeleteSuccess(false), 5000);
      } else {
        const data = await response.json();
        setDeleteError(data.error || t("privacy.deleteAll.error"));
      }
    } catch {
      setDeleteError(t("privacy.deleteAll.error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const isOrgMember = credits?.orgId !== undefined;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--muted)]/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("backToDashboard")}
          </Link>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div>
                <Label className="mb-2 block">{t("profile.avatar")}</Label>
                <AvatarUpload
                  currentUrl={profile?.avatar_url || null}
                  displayName={profile?.display_name || profile?.email || ""}
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="displayName">{t("profile.displayName")}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t("profile.displayNamePlaceholder")}
                  />
                  <Button
                    onClick={handleSaveDisplayName}
                    disabled={isSavingName}
                    className="shrink-0"
                  >
                    {isSavingName ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : nameSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      t("profile.save")
                    )}
                  </Button>
                </div>
                {nameError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {nameError}
                  </p>
                )}
              </div>

              {/* Email (read-only display) */}
              <div>
                <Label>{t("profile.email")}</Label>
                <p className="text-[var(--muted-foreground)] mt-1">
                  {profile?.email}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Section */}
          <Card>
            <CardHeader>
              <CardTitle>{t("security.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <PasswordForm />
              <div className="border-t border-[var(--border)] pt-6">
                <EmailForm currentEmail={profile?.email || ""} />
              </div>
            </CardContent>
          </Card>

          {/* Credit Preferences (only for org members) */}
          {isOrgMember && (
            <Card>
              <CardHeader>
                <CardTitle>{t("creditPreference.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <CreditPreferenceSelector
                  currentPreference={profile?.credit_preference || "auto"}
                  orgName={credits?.orgName || ""}
                  orgBalance={credits?.orgBalance || 0}
                  personalBalance={credits?.personalBalance || 0}
                  onPreferenceChange={handlePreferenceChange}
                />
              </CardContent>
            </Card>
          )}

          {/* Privacy & Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t("privacy.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Retention Setting */}
              <div>
                <Label className="mb-2 block">{t("privacy.retention.title")}</Label>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("privacy.retention.description")}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={retentionDays === null ? "forever" : retentionDays.toString()}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRetentionChange(value === "forever" ? null : parseInt(value) as RetentionDays);
                    }}
                    disabled={isSavingRetention}
                    className="flex h-10 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="forever">{t("privacy.retention.options.forever")}</option>
                    <option value="365">{t("privacy.retention.options.365")}</option>
                    <option value="90">{t("privacy.retention.options.90")}</option>
                    <option value="30">{t("privacy.retention.options.30")}</option>
                    <option value="7">{t("privacy.retention.options.7")}</option>
                  </select>
                  {isSavingRetention && (
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--muted-foreground)]" />
                  )}
                  {retentionSuccess && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>

              {/* Delete All Conversations */}
              <div className="border-t border-[var(--border)] pt-6">
                <Label className="mb-2 block">{t("privacy.deleteAll.title")}</Label>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("privacy.deleteAll.description")}
                </p>
                {deleteSuccess ? (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {t("privacy.deleteAll.success")}
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("privacy.deleteAll.button")}
                  </Button>
                )}
                {deleteError && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {deleteError}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--background)] rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">
                {t("privacy.deleteAll.confirmTitle")}
              </h3>
              <p className="text-[var(--muted-foreground)] mb-6">
                {t("privacy.deleteAll.confirmMessage")}
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  {t("privacy.deleteAll.cancel")}
                </Button>
                <Button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {t("privacy.deleteAll.confirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
