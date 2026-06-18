import { CAPTIVE_NAS_STORAGE_KEY } from "../constants";
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

export function storeNasParams(params: NasParams): void {
  if (typeof window === "undefined") return;
  if (!hasNasRedirectContext(params) && Object.keys(params).length === 0) return;
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
