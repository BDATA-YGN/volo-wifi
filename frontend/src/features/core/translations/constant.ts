export const TRANSLATIONS_API_ROUTES = {
  getTranslationsByLocale: (locale: string) => `/translations/${locale}`,
  createOrUpdateTranslationByLocale: (locale: string) => `/translations/${locale}`,
  getLocalLanguages: () => `/translations`,
};