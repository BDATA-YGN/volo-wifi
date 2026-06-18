import {
  CAPTIVE_ROUTER_CREDENTIAL_KEY,
  CAPTIVE_ROUTER_PASSWORD_KEY,
} from "../constants";
import { loadStoredNasParams } from "./nas-params";
import { hasNasRedirectContext } from "./router-redirect";
import { captiveDashboardPath, captiveRouterLoginPath } from "../subdomain";

export function storeRouterHandoff(credential: string, nasPassword?: string): void {
  sessionStorage.setItem(CAPTIVE_ROUTER_CREDENTIAL_KEY, credential);
  if (nasPassword) {
    sessionStorage.setItem(CAPTIVE_ROUTER_PASSWORD_KEY, nasPassword);
  } else {
    sessionStorage.removeItem(CAPTIVE_ROUTER_PASSWORD_KEY);
  }
}

export function clearRouterHandoffStorage(): void {
  sessionStorage.removeItem(CAPTIVE_ROUTER_CREDENTIAL_KEY);
  sessionStorage.removeItem(CAPTIVE_ROUTER_PASSWORD_KEY);
}

export function resolvePostLoginPath(
  host: string,
  nasParams: ReturnType<typeof loadStoredNasParams>,
): string {
  if (nasParams && hasNasRedirectContext(nasParams)) {
    return captiveRouterLoginPath(host);
  }
  return captiveDashboardPath(host);
}
