"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleButton, Divider } from "@/components/auth/google-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/chat";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect"
          : error.message
      );
      setIsLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold">Connexion</h1>
      </CardHeader>
      <CardContent>
        <GoogleButton mode="login" />

        <Divider />

        <form onSubmit={handleLogin} className="space-y-4">
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/auth/forgot-password"
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Se connecter
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
          Pas encore de compte ?{" "}
          <Link
            href="/auth/signup"
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
          >
            Créer un compte
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            iaiaz
          </Link>
          <p className="text-[var(--muted-foreground)] mt-2">
            Connectez-vous à votre compte
          </p>
        </div>

        <Suspense
          fallback={
            <Card>
              <CardContent className="py-8 text-center">
                Chargement...
              </CardContent>
            </Card>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
