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
  Mail,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient } from "@/lib/supabase/client";

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
  const [emailSent, setEmailSent] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    display_name: "",
  });

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
      const supabase = createClient();

      // Send magic link with class join redirect
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/join/class?token=${token}`,
          data: {
            display_name: formData.display_name,
            join_class_token: token,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      setEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
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

  if (emailSent) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-bold mb-2">{t("emailSent.title")}</h1>
              <p className="text-[var(--muted-foreground)] mb-4">
                {t("emailSent.description", { email: formData.email })}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">{t("emailSent.checkSpam")}</p>
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
                <GraduationCap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h1 className="text-xl font-bold">{t("title")}</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">{t("subtitle")}</p>
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
              <div>
                <label className="block text-sm font-medium mb-2">{t("form.name")}*</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder={t("form.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t("form.email")}*</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border rounded-lg bg-background"
                  placeholder={t("form.emailPlaceholder")}
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.email || !formData.display_name}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("form.submit")}
              </Button>
            </form>

            <p className="text-xs text-[var(--muted-foreground)] text-center mt-4">
              {t("termsNotice")}
            </p>

            <div className="text-center mt-6 pt-6 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)]">
                {t("alreadyHaveAccount")}{" "}
                <NextLink
                  href={`/auth/login?redirect=/join/class?token=${token}`}
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
