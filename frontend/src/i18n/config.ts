export type Locale = (typeof locales)[number];

export const locales = ['en', 'my', 'cn', 'ma', 'ta', 'th'] as const;
export const defaultLocale: Locale = 'en';