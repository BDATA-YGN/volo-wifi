import { CACHE_PREFIX } from "@/lib/cacheKeys";
import type { AuthApp } from "./cookies";

/** Prefix React Query keys per mobile app so collector/customer caches do not collide. */
export function mobileQueryKey<T extends readonly unknown[]>(
  app: Extract<AuthApp, "collector" | "customer">,
  keys: T,
): readonly [string, string, ...T] {
  return [CACHE_PREFIX, `mobile-${app}`, ...keys] as const;
}
