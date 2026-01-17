import { createNavigation } from 'next-intl/navigation';
import { locales, localePrefix, pathnames, defaultLocale } from './config';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({
    locales,
    defaultLocale,
    localePrefix,
    pathnames,
  });
