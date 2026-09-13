export const RENTAL_TERMS_VERSION = '2026-09-13';

export function normalizeTermsLocale(locale?: string) {
  return locale === 'en' ? 'en' : 'sv';
}
