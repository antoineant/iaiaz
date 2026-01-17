"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    // Use type assertion for dynamic routes that aren't in pathnames config
    router.replace(pathname as "/", { locale: newLocale });
  };

  // Get the other locale (toggle between FR and EN)
  const otherLocale = locale === "fr" ? "en" : "fr";

  return (
    <button
      onClick={() => switchLocale(otherLocale)}
      className="flex items-center gap-1.5 px-2 py-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-md hover:bg-[var(--muted)]"
      aria-label={`Switch to ${localeNames[otherLocale]}`}
    >
      <Globe className="w-4 h-4" />
      <span className="uppercase font-medium">{otherLocale}</span>
    </button>
  );
}

// Alternative: Dropdown version with both options visible
export function LanguageSwitcherDropdown() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname as "/", { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 text-sm">
      <Globe className="w-4 h-4 text-[var(--muted-foreground)]" />
      {locales.map((l, index) => (
        <span key={l}>
          {index > 0 && <span className="text-[var(--muted-foreground)]">/</span>}
          <button
            onClick={() => switchLocale(l)}
            className={`px-1 py-0.5 rounded transition-colors ${
              locale === l
                ? "font-medium text-primary-600 dark:text-primary-400"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            aria-current={locale === l ? "true" : undefined}
          >
            {l.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
