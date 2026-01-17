import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <div className="flex-1" />
          <Link href="/" className="text-xl font-bold text-primary-600">
            iaiaz
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <article className="legal-content">
          {children}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
          <p>© 2025 BAJURIAN SAS. Tous droits réservés.</p>
          <nav className="flex gap-4">
            <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
              CGU
            </Link>
            <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
              CGV
            </Link>
            <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
              Confidentialité
            </Link>
            <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
              Cookies
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
