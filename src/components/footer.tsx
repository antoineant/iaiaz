"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("home");
  const tNav = useTranslations("common.nav");

  return (
    <footer className="border-t border-[var(--border)] py-12 px-4 mt-16">
      <div className="max-w-6xl mx-auto">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-block">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">iaiaz</div>
            </Link>
            <p className="text-xs text-[var(--muted-foreground)] mt-2 max-w-[200px] leading-relaxed">
              {t("footer.tagline1")}<br />
              {t("footer.tagline2")}<br />
              {t("footer.tagline3")}
            </p>
          </div>

          {/* Product links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">{t("footer.product")}</h3>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                <Link href="/tarifs" className="hover:text-[var(--foreground)] transition-colors">
                  {tNav("pricing")}
                </Link>
              </li>
              <li>
                <Link href="/comparatif" className="hover:text-[var(--foreground)] transition-colors">
                  {tNav("compare")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Audience links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">{t("footer.forWhom")}</h3>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                <Link href="/etudiants" className="hover:text-[var(--foreground)] transition-colors">
                  {tNav("students")}
                </Link>
              </li>
              <li>
                <Link href="/etablissements" className="hover:text-[var(--foreground)] transition-colors">
                  {tNav("schools")}
                </Link>
              </li>
              <li>
                <Link href="/formateurs" className="hover:text-[var(--foreground)] transition-colors">
                  {tNav("trainers")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="font-semibold text-sm mb-3">{t("footer.legal")}</h3>
            <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>
                <Link href="/legal/cgu" className="hover:text-[var(--foreground)] transition-colors">
                  {t("footer.cgu")}
                </Link>
              </li>
              <li>
                <Link href="/legal/cgv" className="hover:text-[var(--foreground)] transition-colors">
                  {t("footer.cgv")}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[var(--foreground)] transition-colors">
                  {t("footer.privacy")}
                </Link>
              </li>
              <li>
                <Link href="/legal/cookies" className="hover:text-[var(--foreground)] transition-colors">
                  {t("footer.cookies")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[var(--border)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--muted-foreground)]">
          <p>{t("footer.copyright")}</p>
          <div className="flex items-center gap-4 text-xs">
            <span>{t("footer.madeIn")}</span>
            <span>•</span>
            <span>
              {t("footer.madeBy")}{" "}
              <a
                href="https://www.girafestudio.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 dark:text-primary-400 hover:underline"
              >
                {t("footer.madeByStudio")}
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
