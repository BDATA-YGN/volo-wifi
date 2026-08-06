import { CAPTIVE_NAS_STORAGE_KEY, CAPTIVE_ROUTER_CREDENTIAL_KEY } from "../constants";
import type { NasParams } from "../api/types";
import { hasNasRedirectContext as detectRedirectContext } from "./router-redirect";

export function parseNasParamsFromSearch(search: string): NasParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const result: NasParams = {};

  params.forEach((value, key) => {
    if (value) result[key] = value;
  });

  return result;
}

export function hasNasRedirectContext(params: NasParams): boolean {
  return detectRedirectContext(params);
}

/** Persist only when we can actually hand off to the gateway. */
export function storeNasParams(params: NasParams): void {
  if (typeof window === "undefined") return;
  if (!hasNasRedirectContext(params)) {
    clearStoredNasParams();
    return;
  }
  sessionStorage.setItem(CAPTIVE_NAS_STORAGE_KEY, JSON.stringify(params));
}

export function loadStoredNasParams(): NasParams | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CAPTIVE_NAS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NasParams;
  } catch {
    return null;
  }
}

export function clearStoredNasParams(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CAPTIVE_NAS_STORAGE_KEY);
}

export function mergeNasParams(
  fromUrl: NasParams,
  stored: NasParams | null,
): NasParams | undefined {
  const merged = { ...(stored ?? {}), ...fromUrl };
  const hasData = Object.values(merged).some((v) => v != null && v !== "");
  return hasData ? merged : undefined;
}

function hasPendingRouterHandoff(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(CAPTIVE_ROUTER_CREDENTIAL_KEY));
}

export type ResolvedNasParams = {
  /** Params safe to send on login / show router banner (fresh URL redirect only). */
  active: NasParams | undefined;
  /** Gateway bounce-back error from the current URL, if any. */
  gatewayError: string | undefined;
};

/**
 * Resolve NAS context for the login page.
 * Never treat leftover sessionStorage alone as an active router redirect.
 */
export function resolveNasParamsForPage(search: string): ResolvedNasParams {
  const fromUrl = parseNasParamsFromSearch(search);
  const gatewayError = fromUrl.error;

  if (hasNasRedirectContext(fromUrl)) {
    const stored = loadStoredNasParams();
    const active = mergeNasParams(fromUrl, stored) ?? fromUrl;
    return { active, gatewayError };
  }

  // Clean portal URL: drop stale NAS unless login → router-login handoff is in flight.
  if (!hasPendingRouterHandoff()) {
    clearStoredNasParams();
  }

  return { active: undefined, gatewayError };
}
