export const locales = ['fr', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

// 'as-needed' means no prefix for default locale (French)
// French: /tarifs, English: /en/pricing
export const localePrefix = 'as-needed' as const;

export const localeNames: Record<Locale, string> = {
  fr: 'Francais',
  en: 'English',
};

// Path mappings for SEO-friendly URLs
export const pathnames = {
  '/': '/',
  '/tarifs': {
    fr: '/tarifs',
    en: '/pricing',
  },
  '/comparatif': {
    fr: '/comparatif',
    en: '/compare',
  },
  '/etudiants': {
    fr: '/etudiants',
    en: '/students',
  },
  '/etablissements': {
    fr: '/etablissements',
    en: '/schools',
  },
  '/auth/login': '/auth/login',
  '/auth/signup': '/auth/signup',
  '/auth/forgot-password': '/auth/forgot-password',
  '/auth/reset-password': '/auth/reset-password',
  '/auth/accept-terms': '/auth/accept-terms',
  '/chat': '/chat',
  '/chat/[id]': '/chat/[id]',
  '/dashboard': '/dashboard',
  '/dashboard/credits': '/dashboard/credits',
  '/dashboard/credits/success': '/dashboard/credits/success',
  '/dashboard/settings': '/dashboard/settings',
  '/join': '/join',
  '/org': '/org',
  '/org/members': '/org/members',
  '/org/invites': '/org/invites',
  '/admin': '/admin',
  '/admin/models': '/admin/models',
  '/admin/users': '/admin/users',
  '/admin/settings': '/admin/settings',
  '/legal/cgu': {
    fr: '/legal/cgu',
    en: '/legal/terms',
  },
  '/legal/cgv': {
    fr: '/legal/cgv',
    en: '/legal/sales',
  },
  '/legal/privacy': '/legal/privacy',
  '/legal/cookies': '/legal/cookies',
} as const;
