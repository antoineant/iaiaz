"use client";

import { Suspense, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Save, UserPlus, Shield, User } from "lucide-react";

const SCHOOL_YEAR_OPTIONS = [
  "6eme", "5eme", "4eme", "3eme",
  "seconde", "premiere", "terminale", "superieur",
] as const;

interface ChildProfile {
  display_name: string | null;
  birthdate: string | null;
  school_year: string | null;
}

interface ChildControl {
  user_id: string;
  display_name: string;
  supervision_mode: string;
  age_bracket: string;
  profile: ChildProfile;
  controls: {
    supervision_mode: string;
    daily_time_limit_minutes: number | null;
    daily_credit_limit: number | null;
    cumulative_credits: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
  } | null;
}

export default function FamiliaSettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>}>
      <FamiliaSettingsContent />
    </Suspense>
  );
}

function FamiliaSettingsContent() {
  const t = useTranslations("familia.settings");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const selectedChildId = searchParams.get("child");

  const [children, setChildren] = useState<ChildControl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "student">("student");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  // Local edits: keyed by user_id
  const [edits, setEdits] = useState<Record<string, Partial<ChildControl["controls"]>>>({});
  const [profileEdits, setProfileEdits] = useState<Record<string, Partial<ChildProfile>>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch("/api/familia/analytics?days=7");
      if (!res.ok) return;
      const data = await res.json();

      const childMembers = (data.member_usage || []).filter(
        (m: { role: string }) => m.role === "student"
      );

      // Load controls and profile for each child
      const withControls = await Promise.all(
        childMembers.map(async (child: { user_id: string; display_name: string; supervision_mode: string; age_bracket: string }) => {
          const [controlRes, profileRes] = await Promise.all([
            fetch(`/api/familia/controls?childId=${child.user_id}`),
            fetch(`/api/familia/child-profile?childId=${child.user_id}`),
          ]);
          const controlData = controlRes.ok ? await controlRes.json() : { controls: null };
          const profileData = profileRes.ok ? await profileRes.json() : { profile: { display_name: null, birthdate: null, school_year: null } };
          return { ...child, controls: controlData.controls, profile: profileData.profile };
        })
      );

      setChildren(withControls);
    } catch (err) {
      console.error("Error loading settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateEdit = (childId: string, field: string, value: unknown) => {
    setEdits((prev) => ({
      ...prev,
      [childId]: { ...prev[childId], [field]: value },
    }));
  };

  const updateProfileEdit = (childId: string, field: string, value: unknown) => {
    setProfileEdits((prev) => ({
      ...prev,
      [childId]: { ...prev[childId], [field]: value },
    }));
  };

  const saveChild = async (childId: string) => {
    setSaving(childId);
    try {
      const controlSettings = edits[childId];
      const profileSettings = profileEdits[childId];

      const promises: Promise<Response>[] = [];

      if (controlSettings) {
        promises.push(
          fetch("/api/familia/controls", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ childUserId: childId, settings: controlSettings }),
          })
        );
      }

      if (profileSettings) {
        promises.push(
          fetch("/api/familia/child-profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ childUserId: childId, profile: profileSettings }),
          })
        );
      }

      const results = await Promise.all(promises);
      if (results.every((r) => r.ok)) {
        await loadData();
        setEdits((prev) => {
          const next = { ...prev };
          delete next[childId];
          return next;
        });
        setProfileEdits((prev) => {
          const next = { ...prev };
          delete next[childId];
          return next;
        });
      }
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSaving(null);
    }
  };

  const sendInvite = async () => {
    setInviting(true);
    setInviteMsg("");
    try {
      const res = await fetch("/api/familia/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          role: inviteRole,
          locale,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setInviteMsg(t("inviteSent"));
        setInviteEmail("");
        setInviteName("");
      } else {
        setInviteMsg(data.error || t("inviteError"));
      }
    } catch {
      setInviteMsg(t("inviteError"));
    } finally {
      setInviting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link href="/familia/dashboard">
        <Button variant="ghost" size="sm" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("backToDashboard")}
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

      {/* Invite New Member */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t("inviteMember")}
          </h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemple.com"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "student")}
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
            >
              <option value="student">{t("roleChild")}</option>
              <option value="admin">{t("roleParent")}</option>
            </select>
            <Button
              onClick={sendInvite}
              disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
              size="sm"
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sendInvite")}
            </Button>
          </div>
          {inviteMsg && (
            <p className="text-sm mt-2 text-[var(--muted-foreground)]">{inviteMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Per-Child Controls */}
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5" />
        {t("childControls")}
      </h2>

      {children.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-[var(--muted-foreground)] text-center">{t("noChildren")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {children.map((child) => {
            const controls = { ...child.controls, ...edits[child.user_id] };
            const profile = { ...child.profile, ...profileEdits[child.user_id] };
            const hasEdits = !!edits[child.user_id] || !!profileEdits[child.user_id];

            return (
              <Card key={child.user_id} className={selectedChildId === child.user_id ? "ring-2 ring-primary-500" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center text-lg font-bold">
                        {child.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <h3 className="font-semibold">{child.display_name}</h3>
                        <span className="text-xs text-[var(--muted-foreground)]">{child.age_bracket}</span>
                      </div>
                    </div>
                    {hasEdits && (
                      <Button
                        onClick={() => saveChild(child.user_id)}
                        disabled={saving === child.user_id}
                        size="sm"
                        className="bg-primary-600 hover:bg-primary-700 text-white"
                      >
                        {saving === child.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <><Save className="w-4 h-4 mr-1" /> {t("save")}</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Profile Section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--muted-foreground)]">
                      <User className="w-4 h-4" />
                      {t("profile")}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">{t("displayName")}</label>
                        <input
                          type="text"
                          maxLength={50}
                          value={profile.display_name || ""}
                          onChange={(e) => updateProfileEdit(child.user_id, "display_name", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">{t("birthdate")}</label>
                        <input
                          type="date"
                          value={profile.birthdate || ""}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={(e) => updateProfileEdit(child.user_id, "birthdate", e.target.value || null)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">{t("schoolYear")}</label>
                        <select
                          value={profile.school_year || ""}
                          onChange={(e) => updateProfileEdit(child.user_id, "school_year", e.target.value || null)}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                        >
                          <option value="">—</option>
                          {SCHOOL_YEAR_OPTIONS.map((yr) => (
                            <option key={yr} value={yr}>{t(`schoolYears.${yr}`)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Controls Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Supervision Mode */}
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("supervisionMode")}</label>
                      <select
                        value={controls?.supervision_mode || "guided"}
                        onChange={(e) => updateEdit(child.user_id, "supervision_mode", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      >
                        <option value="guided">{t("guided")} (12-14)</option>
                        <option value="trusted">{t("trusted")} (15-17)</option>
                      </select>
                    </div>

                    {/* Daily Credit Limit */}
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("dailyCreditLimit")}</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={controls?.daily_credit_limit ?? ""}
                        onChange={(e) => updateEdit(child.user_id, "daily_credit_limit", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder={t("unlimited")}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      />
                    </div>

                    {/* Quiet Hours */}
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("quietHoursStart")}</label>
                      <input
                        type="time"
                        value={controls?.quiet_hours_start || ""}
                        onChange={(e) => updateEdit(child.user_id, "quiet_hours_start", e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">{t("quietHoursEnd")}</label>
                      <input
                        type="time"
                        value={controls?.quiet_hours_end || ""}
                        onChange={(e) => updateEdit(child.user_id, "quiet_hours_end", e.target.value || null)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
                      />
                    </div>

                    {/* Cumulative Credits */}
                    <div className="sm:col-span-2 flex items-center gap-3 pt-1">
                      <input
                        type="checkbox"
                        checked={controls?.cumulative_credits ?? false}
                        onChange={(e) => updateEdit(child.user_id, "cumulative_credits", e.target.checked)}
                        className="rounded"
                      />
                      <div>
                        <label className="text-sm">{t("cumulativeCredits")}</label>
                        <p className="text-xs text-[var(--muted-foreground)]">{t("cumulativeCreditsDesc")}</p>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
