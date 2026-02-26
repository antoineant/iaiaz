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
  ArrowLeft,
  User,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "react-turnstile";

interface ClassInfo {
  success: boolean;
  class?: {
    id: string;
    name: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  is_accessible?: boolean;
  access_message?: string;
}

export default function ClassSignupPage() {
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
      <ClassSignupContent />
    </Suspense>
  );
}

function ClassSignupContent() {
  const t = useTranslations("joinClass.signup");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

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
      } catch {
        setError("Failed to load class info");
      } finally {
        setIsLoading(false);
      }
    };

    loadClassInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Call the quick signup API
      const response = await fetch("/api/auth/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          classToken: token,
          turnstileToken: turnstileToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join class");
      }

      if (data.needsManualLogin) {
        // Rare case - user created but couldn't auto sign in
        setError(t("errors.needsManualLogin"));
        setIsSubmitting(false);
        return;
      }

      // Sign in using the token hash
      if (data.tokenHash) {
        const supabase = createClient();
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash,
          type: "magiclink",
        });

        if (verifyError) {
          console.error("Error verifying OTP:", verifyError);
          // Still show success - user can login with password reset
        }
      }

      setSuccess(true);

      // Redirect to chat after a brief success message
      setTimeout(() => {
        router.push("/chat");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join class");
      setIsSubmitting(false);
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

  if (!token || !classInfo?.success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">{t("error.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-6">{t("error.invalidToken")}</p>
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

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold mb-2">{t("success.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("success.description", { className: classInfo.class?.name || "" })}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("success.redirecting")}
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8">
            <div className="mb-4">
              <NextLink
                href={`/join/class?token=${token}`}
                className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("back")}
              </NextLink>
            </div>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold">{t("quickJoin.title")}</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {t("quickJoin.subtitle")}
              </p>
            </div>

            {/* Class info */}
            <div className="bg-[var(--muted)] rounded-lg p-3 mb-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <div>
                  <p className="font-medium text-sm">{classInfo.class?.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {classInfo.organization?.name}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("quickJoin.firstName")}*
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg bg-background"
                    placeholder={t("quickJoin.firstNamePlaceholder")}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t("quickJoin.lastName")}*
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full p-3 border rounded-lg bg-background"
                    placeholder={t("quickJoin.lastNamePlaceholder")}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {t("quickJoin.email")}*
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder={t("quickJoin.emailPlaceholder")}
                  required
                />
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  {t("quickJoin.emailHint")}
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {turnstileSiteKey && (
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={
                  isSubmitting ||
                  !formData.firstName ||
                  !formData.lastName ||
                  !formData.email ||
                  (!!turnstileSiteKey && !turnstileToken)
                }
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("quickJoin.submit")}
              </Button>
            </form>

            <p className="text-xs text-[var(--muted-foreground)] text-center mt-4">
              {t("termsNotice")}
            </p>

            <div className="text-center mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("alreadyHaveAccount")}{" "}
                <NextLink
                  href={`/auth/login?redirect=${encodeURIComponent(`/join/class?token=${token}`)}`}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {t("login")}
                </NextLink>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
