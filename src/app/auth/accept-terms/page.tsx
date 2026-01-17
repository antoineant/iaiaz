"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FileText, LogOut } from "lucide-react";

export default function AcceptTermsPage() {
  const router = useRouter();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAcceptTerms = async () => {
    if (!termsAccepted) {
      setError("Vous devez accepter les conditions pour continuer");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Update terms acceptance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq("id", user.id);

      if (updateError) {
        setError("Une erreur est survenue. Veuillez réessayer.");
        setIsLoading(false);
        return;
      }

      // Redirect to chat
      router.push("/chat");
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600">
            iaiaz
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-xl font-semibold">Acceptation des conditions</h1>
            <p className="text-[var(--muted-foreground)] mt-2">
              Pour continuer à utiliser iaiaz, vous devez accepter nos conditions d'utilisation.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="bg-[var(--muted)] rounded-lg p-4 space-y-3 text-sm">
              <p>
                <strong>En acceptant, vous confirmez avoir lu et compris :</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-[var(--muted-foreground)]">
                <li>
                  Les{" "}
                  <Link href="/legal/cgu" className="text-primary-600 hover:underline" target="_blank">
                    Conditions Générales d'Utilisation (CGU)
                  </Link>
                </li>
                <li>
                  Les{" "}
                  <Link href="/legal/cgv" className="text-primary-600 hover:underline" target="_blank">
                    Conditions Générales de Vente (CGV)
                  </Link>
                </li>
                <li>
                  La{" "}
                  <Link href="/legal/privacy" className="text-primary-600 hover:underline" target="_blank">
                    Politique de confidentialité
                  </Link>
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm">
                J'ai lu et j'accepte les CGU, les CGV et la politique de confidentialité.
              </span>
            </label>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAcceptTerms}
                className="w-full"
                disabled={!termsAccepted || isLoading}
                isLoading={isLoading}
              >
                Accepter et continuer
              </Button>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Me déconnecter
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
