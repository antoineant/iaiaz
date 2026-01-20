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
  '/tarifs/etudiants': {
    fr: '/tarifs/etudiants',
    en: '/pricing/students',
  },
  '/tarifs/etablissements': {
    fr: '/tarifs/etablissements',
    en: '/pricing/schools',
  },
  '/tarifs/formateurs': {
    fr: '/tarifs/formateurs',
    en: '/pricing/trainers',
  },
  '/comparatif': {
    fr: '/comparatif',
    en: '/compare',
  },
  '/comparatif/etudiants': {
    fr: '/comparatif/etudiants',
    en: '/compare/students',
  },
  '/comparatif/etablissements': {
    fr: '/comparatif/etablissements',
    en: '/compare/schools',
  },
  '/comparatif/formateurs': {
    fr: '/comparatif/formateurs',
    en: '/compare/trainers',
  },
  '/etudiants': {
    fr: '/etudiants',
    en: '/students',
  },
  '/etablissements': {
    fr: '/etablissements',
    en: '/schools',
  },
  '/formateurs': {
    fr: '/formateurs',
    en: '/trainers',
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
  '/dashboard/analytics': '/dashboard/analytics',
  '/dashboard/settings': '/dashboard/settings',
  '/dashboard/classes': '/dashboard/classes',
  '/class/[classId]': '/class/[classId]',
  '/join': '/join',
  '/org': '/org',
  '/org/setup': '/org/setup',
  '/org/members': '/org/members',
  '/org/invites': '/org/invites',
  '/org/classes': '/org/classes',
  '/org/classes/new': '/org/classes/new',
  '/org/classes/[id]': '/org/classes/[id]',
  '/org/classes/[id]/settings': '/org/classes/[id]/settings',
  '/org/classes/[id]/analytics': '/org/classes/[id]/analytics',
  '/org/classes/[id]/qr': '/org/classes/[id]/qr',
  '/join/class': '/join/class',
  '/join/class/signup': '/join/class/signup',
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
