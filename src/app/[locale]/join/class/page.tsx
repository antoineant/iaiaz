"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NextLink from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  AlertCircle,
  GraduationCap,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Keyboard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface ClassInfo {
  success: boolean;
  error?: string;
  class?: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    closed_at: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
  is_accessible: boolean;
  access_message: string | null;
  is_logged_in: boolean;
  membership: {
    is_member: boolean;
    member_id: string;
    status: string;
    same_class: boolean;
  } | null;
}

export default function JoinClassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </main>
          <Footer />
        </div>
      }
    >
      <JoinClassContent />
    </Suspense>
  );
}

function JoinClassContent() {
  const t = useTranslations("joinClass");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || searchParams.get("code");

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isLoading, setIsLoading] = useState(!!token); // Only loading if we have a token
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual code entry state
  const [manualCode, setManualCode] = useState("");
  const [isLoadingCode, setIsLoadingCode] = useState(false);

  // Load class info if token is present in URL
  useEffect(() => {
    const loadClassInfo = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/class/join?token=${token}`);
        const data = await response.json();
        setClassInfo(data);

        if (!data.success) {
          setError(data.error);
        }
      } catch {
        setError(t("errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };

    loadClassInfo();
  }, [token, t]);

  // Handle manual code submission
  const handleCodeSubmit = async () => {
    if (manualCode.length < 6) return;

    setIsLoadingCode(true);
    setError(null);

    try {
      const response = await fetch(`/api/class/join?code=${manualCode.toUpperCase()}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error === "class_not_found" ? t("enterCode.invalidCode") : data.error);
        setIsLoadingCode(false);
        return;
      }

      setClassInfo(data);
      // Update URL with the code for consistency
      router.replace(`/join/class?code=${manualCode.toUpperCase()}`);
    } catch {
      setError(t("errors.loadFailed"));
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleJoin = async () => {
    const joinToken = token || manualCode;
    if (!joinToken) return;
    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/class/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joinToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join class");
      }

      // Successfully joined - redirect to chat
      router.push("/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join class");
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </main>
        <Footer />
      </div>
    );
  }

  // No token provided - show code entry form
  if (!token && !classInfo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                  <Keyboard className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <h1 className="text-xl font-bold mb-2">{t("enterCode.title")}</h1>
                <p className="text-[var(--muted-foreground)]">
                  {t("enterCode.subtitle")}
                </p>
              </div>

              {/* Code input */}
              <div className="space-y-4">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder={t("enterCode.placeholder")}
                  maxLength={8}
                  className="text-center text-2xl tracking-[0.5em] font-mono uppercase h-14"
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                />

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCodeSubmit}
                  disabled={manualCode.length < 6 || isLoadingCode}
                >
                  {isLoadingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("enterCode.submit")}
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)] text-center">
                  {t("enterCode.qrHint")}
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state (when token was provided but failed)
  if (error || !classInfo?.success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">{t("error.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-6">
                {error || classInfo?.error || t("errors.unknown")}
              </p>
              <div className="space-y-3">
                <Button variant="outline" onClick={() => {
                  setError(null);
                  setClassInfo(null);
                  router.replace("/join/class");
                }}>
                  {t("enterCode.tryAgain")}
                </Button>
                <Link href="/" className="block">
                  <Button variant="ghost" className="w-full">{t("backToHome")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Class info loaded successfully
  const { class: classData, organization, is_accessible, access_message, is_logged_in, membership } =
    classInfo;

  // Already a member of this class
  if (membership?.is_member && membership.same_class) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">{t("alreadyMember.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-6">
                {t("alreadyMember.description", { className: classData?.name || "" })}
              </p>
              <Link href="/chat">
                <Button>
                  {t("goToChat")} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Session not accessible
  if (!is_accessible) {
    let statusIcon = <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
    let statusTitle = t("sessionClosed.title");
    let statusMessage = t("sessionClosed.description");

    if (access_message === "session_not_started" && classData?.starts_at) {
      statusIcon = <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />;
      statusTitle = t("sessionNotStarted.title");
      statusMessage = t("sessionNotStarted.description", {
        date: new Date(classData.starts_at).toLocaleString(),
      });
    } else if (access_message === "session_expired") {
      statusTitle = t("sessionExpired.title");
      statusMessage = t("sessionExpired.description");
    }

    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              {statusIcon}
              <h1 className="text-xl font-bold mb-2">{statusTitle}</h1>
              <p className="text-[var(--muted-foreground)] mb-2">{statusMessage}</p>
              {classData && (
                <div className="text-sm text-[var(--muted-foreground)] mb-6">
                  <p className="font-medium">{classData.name}</p>
                  <p>{organization?.name}</p>
                </div>
              )}
              <Link href="/">
                <Button variant="outline">{t("backToHome")}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Show join page
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold">{t("title")}</h1>
            </div>

            {/* Class info */}
            <div className="bg-[var(--muted)] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h2 className="font-semibold">{classData?.name}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">{organization?.name}</p>
                  {classData?.description && (
                    <p className="text-sm text-[var(--muted-foreground)] mt-2">
                      {classData.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Session times if set */}
            {(classData?.starts_at || classData?.ends_at) && (
              <div className="text-sm text-[var(--muted-foreground)] mb-6 text-center">
                {classData?.ends_at && (
                  <p>
                    {t("sessionEnds", {
                      date: new Date(classData.ends_at).toLocaleString(),
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-4 mb-6 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            {is_logged_in ? (
              <Button className="w-full" onClick={handleJoin} disabled={isJoining}>
                {isJoining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("joinButton")}
              </Button>
            ) : (
              <div className="space-y-3">
                <NextLink href={`/join/class/signup?token=${token || manualCode}`} className="block">
                  <Button className="w-full">
                    {t("quickJoin")}
                  </Button>
                </NextLink>
                <p className="text-center text-sm text-[var(--muted-foreground)]">
                  {t("alreadyHaveAccount")}{" "}
                  <NextLink
                    href={`/auth/login?redirect=${encodeURIComponent(`/join/class?token=${token || manualCode}`)}`}
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {t("login")}
                  </NextLink>
                </p>
              </div>
            )}

            <p className="text-xs text-[var(--muted-foreground)] text-center mt-4">
              {t("termsNotice")}
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
