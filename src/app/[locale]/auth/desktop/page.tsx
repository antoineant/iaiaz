"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Shield, Check, ExternalLink, AlertCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function DesktopAuthPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setIsLoggedIn(true);
      setUserEmail(user.email || null);
    }
    setIsLoading(false);
  };

  const handleConnectApp = async () => {
    setConnecting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError("Vous devez être connecté pour continuer.");
        setConnecting(false);
        return;
      }

      // Get or create API key for desktop app
      let apiKey: string;

      // Check if user already has a desktop app API key
      const { data: existingKey } = await supabase
        .from("api_keys")
        .select("key")
        .eq("user_id", user.id)
        .eq("name", "Desktop App")
        .eq("is_active", true)
        .single();

      if (existingKey) {
        apiKey = existingKey.key;
      } else {
        // Create a new API key
        const newKey = `iaiaz_${crypto.randomUUID().replace(/-/g, "")}`;

        const { error: insertError } = await supabase
          .from("api_keys")
          .insert({
            user_id: user.id,
            key: newKey,
            name: "Desktop App",
            is_active: true,
          });

        if (insertError) {
          throw new Error("Impossible de créer la clé API");
        }

        apiKey = newKey;
      }

      // Redirect to desktop app via deep link
      setConnected(true);

      // Try deep link
      const deepLinkUrl = `iaiaz-app://auth?token=${encodeURIComponent(apiKey)}&session=${sessionId || ""}`;

      // Small delay to show success state
      setTimeout(() => {
        window.location.href = deepLinkUrl;
      }, 500);

    } catch (err) {
      console.error("Connect app error:", err);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Connecter l'application</h1>
          <p className="text-muted-foreground mt-2">
            iaiaz - anonyme
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isLoggedIn ? (
            // Not logged in - show login prompt
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Connectez-vous à votre compte iaiaz pour lier l'application de bureau.
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/auth/login?redirect=/auth/desktop${sessionId ? `?session=${sessionId}` : ""}`}>
                  <Button className="w-full">
                    Se connecter
                  </Button>
                </Link>
                <Link href={`/auth/signup?redirect=/auth/desktop${sessionId ? `?session=${sessionId}` : ""}`}>
                  <Button variant="outline" className="w-full">
                    Créer un compte
                  </Button>
                </Link>
              </div>
            </div>
          ) : connected ? (
            // Successfully connected
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Application connectée !
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Retournez à l'application de bureau.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Si l'application ne s'ouvre pas automatiquement,{" "}
                <button
                  onClick={handleConnectApp}
                  className="text-primary hover:underline"
                >
                  cliquez ici
                </button>
              </p>
            </div>
          ) : (
            // Logged in - show connect button
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Connecté en tant que
                </p>
                <p className="font-medium">{userEmail}</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                onClick={handleConnectApp}
                disabled={connecting}
                className="w-full"
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connecter l'application
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Cette action créera une clé API sécurisée pour l'application de bureau.
                Vos données restent protégées.
              </p>

              <div className="pt-4 border-t">
                <Link
                  href="/auth/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Se connecter avec un autre compte →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
