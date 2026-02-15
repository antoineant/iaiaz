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
  Mail,
  Key,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  MessageSquare,
  Star,
} from "lucide-react";
import type { CreditPreference } from "@/lib/credits";
import type { PricingData } from "@/app/api/pricing/route";

const PREFERRED_MODEL_KEY = "iaia_preferred_model";

type RetentionDays = null | 7 | 30 | 90 | 365;

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  credit_preference: CreditPreference;
  credits_balance: number;
  conversation_retention_days: RetentionDays;
  marketing_consent: boolean;
}

interface Credits {
  source: "organization" | "personal";
  balance: number;
  orgId?: string;
  orgName?: string;
  role?: string;
  isTrainer?: boolean;
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

  // Delete account states
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deleteAccountEmail, setDeleteAccountEmail] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);

  // Email preferences states
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isSavingMarketing, setIsSavingMarketing] = useState(false);
  const [marketingSuccess, setMarketingSuccess] = useState(false);

  // API key states
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(false);
  const [isRegeneratingApiKey, setIsRegeneratingApiKey] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Default model states
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [defaultModelSuccess, setDefaultModelSuccess] = useState(false);

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
          setMarketingConsent(data.profile.marketing_consent || false);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Load pricing data and default model preference
  useEffect(() => {
    async function loadPricingData() {
      try {
        const response = await fetch("/api/pricing");
        if (response.ok) {
          const data = await response.json();
          setPricingData(data);
        }
      } catch (error) {
        console.error("Failed to load pricing data:", error);
      }
    }
    loadPricingData();

    // Load preferred model from localStorage
    const stored = localStorage.getItem(PREFERRED_MODEL_KEY);
    if (stored) {
      setDefaultModel(stored);
    }
  }, []);

  const handleDefaultModelChange = (modelId: string) => {
    localStorage.setItem(PREFERRED_MODEL_KEY, modelId);
    setDefaultModel(modelId);
    setDefaultModelSuccess(true);
    setTimeout(() => setDefaultModelSuccess(false), 3000);
  };

  const handleClearDefaultModel = () => {
    localStorage.removeItem(PREFERRED_MODEL_KEY);
    setDefaultModel(null);
    setDefaultModelSuccess(true);
    setTimeout(() => setDefaultModelSuccess(false), 3000);
  };

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

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteAccountError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (response.ok) {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/";
      } else {
        const data = await response.json();
        setDeleteAccountError(data.error || t("privacy.deleteAccount.error"));
      }
    } catch {
      setDeleteAccountError(t("privacy.deleteAccount.error"));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleMarketingConsentChange = async (newConsent: boolean) => {
    setIsSavingMarketing(true);
    setMarketingSuccess(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketing_consent: newConsent }),
      });

      if (response.ok) {
        setMarketingConsent(newConsent);
        if (profile) {
          setProfile({ ...profile, marketing_consent: newConsent });
        }
        setMarketingSuccess(true);
        setTimeout(() => setMarketingSuccess(false), 3000);
      }
    } catch {
      // Silent fail - revert UI
      setMarketingConsent(!newConsent);
    } finally {
      setIsSavingMarketing(false);
    }
  };

  const handleGetApiKey = async () => {
    setIsLoadingApiKey(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_or_create_api_key");
      if (error) throw error;
      setApiKey(data);
    } catch (error) {
      console.error("Failed to get API key:", error);
    } finally {
      setIsLoadingApiKey(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!profile) return;
    setIsRegeneratingApiKey(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("regenerate_api_key", {
        user_id: profile.id,
      });
      if (error) throw error;
      setApiKey(data);
      setShowApiKey(true);
    } catch (error) {
      console.error("Failed to regenerate API key:", error);
    } finally {
      setIsRegeneratingApiKey(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
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

          {/* Chat Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {t("chatPreferences.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">{t("chatPreferences.defaultModel.title")}</Label>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("chatPreferences.defaultModel.description")}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={defaultModel || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        handleDefaultModelChange(value);
                      } else {
                        handleClearDefaultModel();
                      }
                    }}
                    className="flex h-10 w-full max-w-xs rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    <option value="">{t("chatPreferences.defaultModel.systemDefault")}</option>
                    {pricingData?.models
                      .filter((m) => m.is_recommended || defaultModel === m.id)
                      .sort((a, b) => {
                        // Show recommended models first
                        if (a.is_recommended && !b.is_recommended) return -1;
                        if (!a.is_recommended && b.is_recommended) return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.is_recommended ? `(${t("chatPreferences.defaultModel.recommended")})` : ""}
                        </option>
                      ))}
                    <optgroup label="──────────">
                      {pricingData?.models
                        .filter((m) => !m.is_recommended && defaultModel !== m.id)
                        .sort((a, b) => a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name))
                        .map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.provider} - {model.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  {defaultModelSuccess && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
                {defaultModel && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500 fill-current" />
                    {t("chatPreferences.defaultModel.currentDefault", { model: pricingData?.models.find(m => m.id === defaultModel)?.name || defaultModel })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Key Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                {t("apiKey.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("apiKey.description")}
              </p>

              {apiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-[var(--muted)] rounded-md font-mono text-sm overflow-hidden">
                      {showApiKey ? apiKey : "•".repeat(Math.min(apiKey.length, 40))}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyApiKey}
                    >
                      {apiKeyCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateApiKey}
                    disabled={isRegeneratingApiKey}
                    className="text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300 hover:bg-orange-50 dark:border-orange-800 dark:hover:border-orange-700 dark:hover:bg-orange-900/20"
                  >
                    {isRegeneratingApiKey ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {t("apiKey.regenerate")}
                  </Button>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {t("apiKey.regenerateWarning")}
                  </p>
                </div>
              ) : (
                <Button onClick={handleGetApiKey} disabled={isLoadingApiKey}>
                  {isLoadingApiKey ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  {t("apiKey.generate")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Credit Preferences (only for org members who are students - trainers always use org) */}
          {isOrgMember && !credits?.isTrainer && (
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

              {/* Email Preferences */}
              <div className="border-t border-[var(--border)] pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4" />
                  <Label>{t("privacy.emails.title")}</Label>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  {t("privacy.emails.description")}
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30">
                  <div>
                    <p className="font-medium text-sm">{t("privacy.emails.marketing.label")}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t("privacy.emails.marketing.description")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {marketingSuccess && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                    {isSavingMarketing && (
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--muted-foreground)]" />
                    )}
                    <button
                      onClick={() => handleMarketingConsentChange(!marketingConsent)}
                      disabled={isSavingMarketing}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                        marketingConsent ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          marketingConsent ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Delete Account */}
              <div className="border-t border-[var(--border)] pt-6">
                <Label className="mb-2 block">{t("privacy.deleteAccount.title")}</Label>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  {t("privacy.deleteAccount.description")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteAccountConfirm(true)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-700 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t("privacy.deleteAccount.button")}
                </Button>
                {deleteAccountError && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {deleteAccountError}
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

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccountConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[var(--background)] rounded-lg p-6 max-w-md mx-4 shadow-xl">
              <h3 className="text-lg font-semibold mb-2">
                {t("privacy.deleteAccount.confirmTitle")}
              </h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("privacy.deleteAccount.confirmMessage")}
              </p>
              <div className="mb-6">
                <Label className="mb-2 block text-sm">
                  {t("privacy.deleteAccount.confirmLabel")}
                </Label>
                <Input
                  type="email"
                  value={deleteAccountEmail}
                  onChange={(e) => setDeleteAccountEmail(e.target.value)}
                  placeholder={profile?.email || ""}
                  disabled={isDeletingAccount}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteAccountConfirm(false);
                    setDeleteAccountEmail("");
                  }}
                  disabled={isDeletingAccount}
                >
                  {t("privacy.deleteAccount.cancel")}
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteAccountEmail !== profile?.email}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeletingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {t("privacy.deleteAccount.confirm")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
