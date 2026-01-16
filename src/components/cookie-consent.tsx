"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, Cookie } from "lucide-react";

type CookieConsent = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  timestamp: string;
};

const CONSENT_KEY = "cookie-consent";

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<CookieConsent>({
    necessary: true, // Always true, can't be disabled
    functional: true,
    analytics: false,
    timestamp: "",
  });

  useEffect(() => {
    // Check if consent has been given
    const storedConsent = localStorage.getItem(CONSENT_KEY);
    if (!storedConsent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (newConsent: CookieConsent) => {
    const consentWithTimestamp = {
      ...newConsent,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentWithTimestamp));
    setShowBanner(false);
  };

  const acceptAll = () => {
    saveConsent({
      necessary: true,
      functional: true,
      analytics: true,
      timestamp: "",
    });
  };

  const acceptNecessaryOnly = () => {
    saveConsent({
      necessary: true,
      functional: false,
      analytics: false,
      timestamp: "",
    });
  };

  const saveCustom = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[var(--background)] border-t border-[var(--border)] shadow-lg">
      <div className="max-w-4xl mx-auto">
        {!showDetails ? (
          // Simple banner view
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">
                  Nous utilisons des cookies pour garantir le bon fonctionnement du
                  site et améliorer votre expérience.{" "}
                  <Link
                    href="/legal/cookies"
                    className="text-primary-600 hover:underline"
                  >
                    En savoir plus
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(true)}
              >
                Personnaliser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={acceptNecessaryOnly}
              >
                Refuser
              </Button>
              <Button size="sm" onClick={acceptAll}>
                Accepter tout
              </Button>
            </div>
          </div>
        ) : (
          // Detailed settings view
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Paramètres des cookies</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Necessary cookies */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-[var(--muted)]">
                <div>
                  <p className="font-medium text-sm">
                    Cookies strictement nécessaires
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Indispensables au fonctionnement du site (authentification,
                    sécurité). Ne peuvent pas être désactivés.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="mt-1 h-4 w-4 accent-primary-600"
                />
              </div>

              {/* Functional cookies */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
                <div>
                  <p className="font-medium text-sm">Cookies fonctionnels</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Améliorent votre expérience en mémorisant vos préférences
                    (thème, choix de cookies).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.functional}
                  onChange={(e) =>
                    setConsent({ ...consent, functional: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 accent-primary-600"
                />
              </div>

              {/* Analytics cookies */}
              <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-[var(--border)]">
                <div>
                  <p className="font-medium text-sm">Cookies analytiques</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Nous aident à comprendre comment le site est utilisé pour
                    l'améliorer. Actuellement non utilisés.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) =>
                    setConsent({ ...consent, analytics: e.target.checked })
                  }
                  className="mt-1 h-4 w-4 accent-primary-600"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Link
                href="/legal/cookies"
                className="text-sm text-primary-600 hover:underline"
              >
                Politique de cookies
              </Link>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={acceptNecessaryOnly}>
                  Tout refuser
                </Button>
                <Button size="sm" onClick={saveCustom}>
                  Enregistrer mes choix
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Component to re-open cookie settings (for footer link)
export function CookieSettingsButton() {
  const openSettings = () => {
    localStorage.removeItem(CONSENT_KEY);
    window.location.reload();
  };

  return (
    <button
      onClick={openSettings}
      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm"
    >
      Gérer les cookies
    </button>
  );
}
