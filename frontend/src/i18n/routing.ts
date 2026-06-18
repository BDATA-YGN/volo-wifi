import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  // Completely remove locale prefixes from URLs
  localePrefix: 'never',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);