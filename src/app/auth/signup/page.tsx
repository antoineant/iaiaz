"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";
import { Check } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!termsAccepted) {
      setError("Vous devez accepter les conditions d'utilisation");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?terms_accepted=true`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Cet email est déjà utilisé");
      } else {
        setError(error.message);
      }
      setIsLoading(false);
      return;
    }

    // If user was created (no email confirmation needed), update terms acceptance
    if (data.user && data.session) {
      await supabase.rpc("accept_terms", { p_user_id: data.user.id });
    }

    setIsSuccess(true);
    setIsLoading(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Vérifiez votre email</h1>
              <p className="text-[var(--muted-foreground)] mb-4">
                Nous avons envoyé un lien de confirmation à{" "}
                <span className="font-medium text-[var(--foreground)]">{email}</span>
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Cliquez sur le lien dans l'email pour activer votre compte et
                recevoir vos crédits gratuits.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <p className="text-[var(--muted-foreground)] mt-2">
            Créez votre compte et recevez 1€ de crédits gratuits
          </p>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-xl font-semibold">Inscription</h1>
          </CardHeader>
          <CardContent>
            {/* Terms acceptance checkbox - required for both Google and email signup */}
            <div className="mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-[var(--muted-foreground)]">
                  J'ai lu et j'accepte les{" "}
                  <Link href="/legal/cgu" className="text-primary-600 dark:text-primary-400 hover:underline" target="_blank">
                    CGU
                  </Link>
                  , les{" "}
                  <Link href="/legal/cgv" className="text-primary-600 dark:text-primary-400 hover:underline" target="_blank">
                    CGV
                  </Link>{" "}
                  et la{" "}
                  <Link href="/legal/privacy" className="text-primary-600 dark:text-primary-400 hover:underline" target="_blank">
                    politique de confidentialité
                  </Link>
                  . <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            <GoogleButton mode="signup" disabled={!termsAccepted} />

            <Divider />

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                id="password"
                type="password"
                label="Mot de passe"
                placeholder="Au moins 6 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirmer le mot de passe"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={!termsAccepted}
              >
                Créer mon compte
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
              Déjà un compte ?{" "}
              <Link
                href="/auth/login"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Se connecter
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
