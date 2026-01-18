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
} from "lucide-react";
import type { CreditPreference } from "@/lib/credits";

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  credit_preference: CreditPreference;
  credits_balance: number;
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
        </div>
      </div>
    </div>
  );
}
