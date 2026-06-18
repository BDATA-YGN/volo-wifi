/**
 * Isolates browser persistence and Next.js cache tags per deployed app instance.
 * Set `NEXT_PUBLIC_CACHE_PREFIX` in `.env` (e.g. `bdata-admin`, `isp-hub`) so
 * multiple consoles on the same origin do not share menu/auth localStorage keys.
 */

const RAW =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CACHE_PREFIX?.trim()) ||
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_SHORT_CODE?.trim()) ||
  'bdata-admin';

/** Safe slug used as the first segment of storage keys and cache tags. */
export const CACHE_PREFIX = RAW.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

const LEGACY_STORAGE_SUFFIXES = [
  'auth-storage',
  'menu-storage',
  'theme-storage',
] as const;

/** Zustand persist `name` values (without prefix). */
export const PERSIST_STORE_NAMES = LEGACY_STORAGE_SUFFIXES;

export function storageKey(suffix: string): string {
  return `${CACHE_PREFIX}:${suffix}`;
}

export function cacheTag(name: string): string {
  return `${CACHE_PREFIX}:${name}`;
}

/** Prefix React Query keys so in-memory cache does not collide across apps in one tab. */
export function queryKey<T extends readonly unknown[]>(keys: T): readonly [string, ...T] {
  return [CACHE_PREFIX, ...keys] as const;
}

/** Drops unprefixed keys left by older builds or other apps on the same origin. */
export function migrateLegacyPersistedState(): void {
  if (typeof window === 'undefined') return;
  for (const suffix of LEGACY_STORAGE_SUFFIXES) {
    localStorage.removeItem(suffix);
  }
}

/** Removes prefixed and legacy unprefixed persisted state on sign-out. */
export function clearPersistedClientState(): void {
  if (typeof window === 'undefined') return;
  migrateLegacyPersistedState();
  for (const suffix of LEGACY_STORAGE_SUFFIXES) {
    localStorage.removeItem(storageKey(suffix));
  }
}
