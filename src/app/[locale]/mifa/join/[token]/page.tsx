"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Check, AlertCircle } from "lucide-react";

function MifaJoinInner() {
  const t = useTranslations("mifa.join");
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;

  const [inviteInfo, setInviteInfo] = useState<{
    organization_name: string;
    role: string;
    email: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [birthdate, setBirthdate] = useState(searchParams.get("birthdate") || "");
  const [schoolYear, setSchoolYear] = useState(searchParams.get("schoolYear") || "");
  const [needsAuth, setNeedsAuth] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();

      // Look up invite
      const { data: invite } = await supabase
        .from("organization_invites")
        .select("email, role, status, expires_at, organization:organizations(name)")
        .eq("token", token)
        .single();

      if (!invite) {
        setError(t("invalidInvite"));
        setIsLoading(false);
        return;
      }

      if (invite.status !== "pending") {
        setError(t("alreadyAccepted"));
        setIsLoading(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError(t("expired"));
        setIsLoading(false);
        return;
      }

      const org = invite.organization as unknown as { name: string };

      setInviteInfo({
        organization_name: org?.name || "",
        role: invite.role,
        email: invite.email,
      });

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setNeedsAuth(true);
      }

      setIsLoading(false);
    };
    load();
  }, [token, t]);

  const buildSignupUrl = () => {
    const redirectPath = `/mifa/join/${token}`;
    const signupParams = new URLSearchParams();
    signupParams.set("redirect", redirectPath);
    if (birthdate) signupParams.set("birthdate", birthdate);
    if (schoolYear) signupParams.set("schoolYear", schoolYear);
    return `/auth/signup?${signupParams.toString()}`;
  };

  const acceptInvite = async () => {
    setIsAccepting(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push(buildSignupUrl());
      return;
    }

    const res = await fetch("/api/mifa/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, birthdate, schoolYear }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error || t("acceptError"));
      setIsAccepting(false);
      return;
    }

    setSuccess(true);
    setIsAccepting(false);

    // Redirect after 2 seconds
    setTimeout(() => {
      if (data.role === "student") {
        router.push("/chat");
      } else {
        router.push("/mifa/dashboard");
      }
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-primary-950 dark:via-[var(--background)] dark:to-accent-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold">
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #0284c7 0%, #d946ef 28%, #0284c7 52%, #d946ef 80%, #0284c7 100%)" }}>mifa</span>
            <span className="text-[var(--muted-foreground)] font-medium text-lg ml-2">by iaiaz</span>
          </h1>
        </div>

        {error && !inviteInfo && (
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">{t("welcomeFamily")}</h2>
              <p className="text-[var(--muted-foreground)]">{t("redirecting")}</p>
            </CardContent>
          </Card>
        )}

        {inviteInfo && !success && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <Heart className="w-12 h-12 text-accent-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  {inviteInfo.role === "student" ? t("childTitle") : t("parentTitle")}
                </h2>
                <p className="text-[var(--muted-foreground)]">
                  {t("invitedTo", { family: inviteInfo.organization_name })}
                </p>
              </div>

              {needsAuth && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                  {t("needsAccount")}
                </div>
              )}

              {inviteInfo.role === "student" && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">{t("enterBirthdate")}</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("birthdateHelp")}</p>

                  <label className="block text-sm font-medium mb-1 mt-4">{t("schoolYear")}</label>
                  <select
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                  >
                    <option value="">{t("selectYear")}</option>
                    <option value="6eme">6ème</option>
                    <option value="5eme">5ème</option>
                    <option value="4eme">4ème</option>
                    <option value="3eme">3ème</option>
                    <option value="seconde">Seconde</option>
                    <option value="premiere">Première</option>
                    <option value="terminale">Terminale</option>
                    <option value="superieur">Supérieur</option>
                  </select>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{t("schoolYearHelp")}</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-600 mb-4">{error}</p>
              )}

              <Button
                onClick={needsAuth ? () => router.push(buildSignupUrl()) : acceptInvite}
                disabled={isAccepting}
                className="w-full bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white"
              >
                {isAccepting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {needsAuth ? t("createAccount") : t("joinFamily")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MifaJoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <MifaJoinInner />
    </Suspense>
  );
}
