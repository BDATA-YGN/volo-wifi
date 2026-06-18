'use server';

import { revalidateTag } from 'next/cache';
import { cacheTag } from '@/lib/cacheKeys';

export async function revalidateTranslations() {
  revalidateTag(cacheTag('translation'), 'max');
  return { revalidated: true };
}

export async function revalidateAppSettings() {
  revalidateTag(cacheTag('app-settings'), 'max');
  return { revalidated: true };
}

// Combined revalidation
export async function revalidateAll() {
  revalidateTag(cacheTag('translation'), 'max');
  revalidateTag(cacheTag('app-settings'), 'max');
  return { revalidated: true };
}