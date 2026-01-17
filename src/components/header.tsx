"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/tarifs", label: "Tarifs" },
  { href: "/comparatif", label: "Comparatif" },
  { href: "/etudiants", label: "Étudiants" },
];

interface HeaderProps {
  showAuthButtons?: boolean;
}

export function Header({ showAuthButtons = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</span>
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
              L&apos;IA accessible, sans engagement
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors ${
                  isActive(link.href)
                    ? "text-primary-600 dark:text-primary-400 font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {showAuthButtons && (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  Connexion
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Commencer</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {showAuthButtons && (
              <Link href="/auth/signup">
                <Button size="sm">Commencer</Button>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-out Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Slide-out Panel */}
          <div className="fixed top-0 right-0 h-full w-72 bg-[var(--background)] shadow-xl z-50 md:hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label="Fermer le menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-base transition-colors ${
                  pathname === "/"
                    ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                Accueil
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base transition-colors ${
                    isActive(link.href)
                      ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                      : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {/* Divider */}
              <div className="my-4 border-t border-[var(--border)]" />

              {/* Auth Links */}
              {showAuthButtons && (
                <>
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base text-[var(--foreground)] hover:bg-[var(--muted)]"
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base bg-primary-600 text-white text-center font-medium hover:bg-primary-700"
                  >
                    Créer un compte gratuit
                  </Link>
                </>
              )}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                1€ de crédits offerts à l'inscription
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
