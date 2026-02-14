"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown, GraduationCap, Building2, Users, Briefcase, Heart } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

interface HeaderProps {
  showAuthButtons?: boolean;
}

export function Header({ showAuthButtons = true }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [audienceDropdownOpen, setAudienceDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const t = useTranslations("common");

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAudienceDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mainNavLinks = [
    { href: "/tarifs" as const, label: t("nav.pricing") },
    { href: "/comparatif" as const, label: t("nav.compare") },
  ];

  const audienceLinks = [
    { href: "/etudiants" as const, label: t("nav.students"), icon: GraduationCap },
    { href: "/familia" as const, label: t("nav.familia"), icon: Heart },
    { href: "/etablissements" as const, label: t("nav.schools"), icon: Building2 },
    { href: "/formateurs" as const, label: t("nav.trainers"), icon: Users },
    { href: "/business" as const, label: t("nav.business"), icon: Briefcase },
  ];

  const isActive = (href: string) => pathname === href;
  const isAudienceActive = audienceLinks.some(link => isActive(link.href));

  return (
    <>
      <header className="border-b border-[var(--border)] bg-[var(--background)] sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex flex-col">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</span>
            <span className="text-xs text-[var(--muted-foreground)] hidden sm:block">
              {t("tagline")}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {mainNavLinks.map((link) => (
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

            {/* Audience Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAudienceDropdownOpen(!audienceDropdownOpen)}
                className={`flex items-center gap-1 text-sm transition-colors ${
                  isAudienceActive
                    ? "text-primary-600 dark:text-primary-400 font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t("nav.forWhom")}
                <ChevronDown className={`w-4 h-4 transition-transform ${audienceDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {audienceDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[var(--background)] border border-[var(--border)] rounded-lg shadow-lg py-2 z-50">
                  {audienceLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setAudienceDropdownOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                          isActive(link.href)
                            ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                            : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {showAuthButtons && (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {t("nav.login")}
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">{t("nav.signup")}</Button>
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {showAuthButtons && (
              <Link href="/auth/signup">
                <Button size="sm">{t("nav.signup")}</Button>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label={t("aria.openMenu")}
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
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">{t("nav.menu")}</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label={t("aria.closeMenu")}
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
                {t("nav.home")}
              </Link>

              {mainNavLinks.map((link) => (
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

              {/* Audience Section */}
              <div className="pt-2">
                <p className="px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                  {t("nav.forWhom")}
                </p>
                {audienceLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base transition-colors ${
                        isActive(link.href)
                          ? "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-medium"
                          : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-[var(--muted-foreground)]" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

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
                    {t("nav.login")}
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-base bg-primary-600 text-white text-center font-medium hover:bg-primary-700"
                  >
                    {t("buttons.startFree")}
                  </Link>
                </>
              )}

              {/* Language Switcher in Mobile */}
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <LanguageSwitcher />
              </div>
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] text-center">
                {t("freeCredit")}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
