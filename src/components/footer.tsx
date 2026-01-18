"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("home");

  return (
    <footer className="border-t border-[var(--border)] py-8 px-4 mt-16">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {t("footer.tagline")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {t("footer.copyright")}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t("footer.madeIn")}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t("footer.madeBy")}{" "}
            <a
              href="https://www.girafestudio.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              {t("footer.madeByStudio")}
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap gap-4 md:gap-6 text-sm text-[var(--muted-foreground)]">
          <Link href="/legal/cgu" className="hover:text-[var(--foreground)]">
            {t("footer.cgu")}
          </Link>
          <Link href="/legal/cgv" className="hover:text-[var(--foreground)]">
            {t("footer.cgv")}
          </Link>
          <Link href="/legal/privacy" className="hover:text-[var(--foreground)]">
            {t("footer.privacy")}
          </Link>
          <Link href="/legal/cookies" className="hover:text-[var(--foreground)]">
            {t("footer.cookies")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
