"use client";

import { useState, useEffect, Suspense } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import NextLink from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Building2,
  Check,
  AlertTriangle,
  Loader2,
  GraduationCap,
  Users,
  Shield,
} from "lucide-react";

interface InviteInfo {
  id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  class_name?: string;
  credit_amount: number;
  expires_at: string;
}

function JoinPageContent() {
  const t = useTranslations("join");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Check auth and load invite info
  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setError(t("errors.noToken"));
        setIsLoading(false);
        return;
      }

      const supabase = createClient();

      // Check if user is logged in
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch invite details using RPC function (bypasses RLS)
      const { data: invite, error: inviteError } = await supabase.rpc(
        "get_invite_by_token",
        { p_token: token }
      );

      if (inviteError || !invite || invite.error === "not_found") {
        setError(t("errors.invalidToken"));
        setIsLoading(false);
        return;
      }

      if (invite.status !== "pending") {
        setError(
          invite.status === "accepted"
            ? t("errors.alreadyUsed")
            : t("errors.expired")
        );
        setIsLoading(false);
        return;
      }

      // Check expiry
      if (new Date(invite.expires_at) < new Date()) {
        setError(t("errors.expired"));
        setIsLoading(false);
        return;
      }

      setInviteInfo({
        id: invite.id,
        organization_id: invite.organization_id,
        organization_name: invite.organization_name,
        role: invite.role,
        class_name: invite.class_name,
        credit_amount: invite.credit_amount,
        expires_at: invite.expires_at,
      });
      setIsLoading(false);
    }

    loadInvite();
  }, [token, t]);

  const handleAccept = async () => {
    if (!inviteInfo || !user) return;

    setIsAccepting(true);
    setError(null);

    const supabase = createClient();

    // Call the RPC function to accept the invite
    const { data, error: acceptError } = await supabase.rpc(
      "accept_organization_invite",
      {
        p_token: token,
        p_user_id: user.id,
      }
    );

    if (acceptError) {
      console.error("Accept invite error:", acceptError);
      setError(t("errors.acceptFailed"));
      setIsAccepting(false);
      return;
    }

    if (data && !data.success) {
      setError(
        data.error === "already_member"
          ? t("errors.alreadyMember")
          : data.error === "invite_expired"
          ? t("errors.expired")
          : t("errors.acceptFailed")
      );
      setIsAccepting(false);
      return;
    }

    setSuccess(true);
    setIsAccepting(false);

    // Redirect to chat after 2 seconds
    setTimeout(() => {
      router.push("/chat");
    }, 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "student":
        return <GraduationCap className="w-5 h-5" />;
      case "teacher":
        return <Users className="w-5 h-5" />;
      case "admin":
      case "owner":
        return <Shield className="w-5 h-5" />;
      default:
        return <GraduationCap className="w-5 h-5" />;
    }
  };

  const getRoleLabel = (role: string) => {
    return t(`roles.${role}`, { defaultValue: role });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-[var(--muted-foreground)]">{t("loading")}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !inviteInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">
                {t("errors.title")}
              </h1>
              <p className="text-[var(--muted-foreground)] mb-6">{error}</p>
              <Link href="/">
                <Button variant="outline">{t("backHome")}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">{t("success.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("success.description", { org: inviteInfo?.organization_name || "" })}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("success.redirect")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="text-3xl font-bold text-primary-600 dark:text-primary-400"
            >
              iaiaz
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-semibold">{t("title")}</h1>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-2xl font-semibold mb-2">
                {inviteInfo?.organization_name}
              </p>

              <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)] mb-6">
                {getRoleIcon(inviteInfo?.role || "student")}
                <span>{getRoleLabel(inviteInfo?.role || "student")}</span>
                {inviteInfo?.class_name && (
                  <>
                    <span>•</span>
                    <span>{inviteInfo.class_name}</span>
                  </>
                )}
              </div>

              <p className="text-[var(--muted-foreground)] mb-6">
                {t("loginRequired")}
              </p>

              <div className="space-y-3">
                <NextLink href={`/auth/login?redirect=/join?token=${token}`}>
                  <Button className="w-full">{t("login")}</Button>
                </NextLink>
                <NextLink href={`/auth/signup?redirect=/join?token=${token}`}>
                  <Button variant="outline" className="w-full">
                    {t("signup")}
                  </Button>
                </NextLink>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Logged in - show invitation details
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="text-3xl font-bold text-primary-600 dark:text-primary-400"
          >
            iaiaz
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <p className="text-2xl font-semibold mb-2">
                {inviteInfo?.organization_name}
              </p>

              <div className="flex items-center justify-center gap-2 text-[var(--muted-foreground)]">
                {getRoleIcon(inviteInfo?.role || "student")}
                <span>{getRoleLabel(inviteInfo?.role || "student")}</span>
                {inviteInfo?.class_name && (
                  <>
                    <span>•</span>
                    <span>{inviteInfo.class_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Credits info */}
            <div className="bg-[var(--muted)] rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted-foreground)]">
                  {t("creditsAllocated")}
                </span>
                <span className="font-semibold text-lg">
                  {inviteInfo?.credit_amount.toFixed(2)}€
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <Button
              onClick={handleAccept}
              className="w-full"
              isLoading={isAccepting}
            >
              {t("accept")}
            </Button>

            <p className="text-sm text-[var(--muted-foreground)] text-center mt-4">
              {t("disclaimer")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <JoinPageContent />
    </Suspense>
  );
}
