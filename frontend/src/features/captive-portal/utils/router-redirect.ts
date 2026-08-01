import type { NasParams } from "../api/types";
import {
  buildMikrotikNasIpFallback,
  buildMikrotikRouterLogin,
} from "./mikrotik-redirect";
import {
  type BuildRouterLoginOptions,
  type NasVendor,
  type RouterLoginAction,
} from "./nas-vendor";
import { buildRuijieRouterLogin } from "./ruijie-redirect";

function firstParam(params: NasParams, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = params[key];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

/**
 * Best-effort vendor label for UI. Prefer calling this on a successful
 * RouterLoginAction.vendor instead of guessing before build.
 */
export function detectNasVendor(params: NasParams): NasVendor {
  if (
    firstParam(params, ["link-login", "link-login-only", "link_login", "linkLogin"])
  ) {
    return "mikrotik";
  }

  if (firstParam(params, ["gw_address", "gw_ip", "gwAddress", "gwIp"])) {
    return "ruijie-wifidog";
  }

  if (
    firstParam(params, ["wlanuserip", "wlanacname", "wlanacip", "NASID", "nasid"])
  ) {
    return "ruijie-eportal";
  }

  if (
    firstParam(params, [
      "login_url",
      "loginUrl",
      "LogonURL",
      "logon_url",
      "logonUrl",
      "login-url",
    ])
  ) {
    return "ruijie-wispr";
  }

  if (
    firstParam(params, ["uamip", "uamIp", "UAMIP"]) ||
    (firstParam(params, ["nas_ip", "nasip", "nasIp"]) &&
      firstParam(params, ["uamport", "uamPort", "UAMPORT", "auth_port", "authPort"]))
  ) {
    return "ruijie-wispr";
  }

  if (firstParam(params, ["nas_ip", "nasip", "nasIp"])) {
    return "mikrotik";
  }

  return "unknown";
}

/**
 * Build the gateway handoff for MikroTik and Ruijie.
 * Tries specific markers first so the two vendors do not steal each other's params.
 */
export function buildRouterLoginAction(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  return (
    // MikroTik: explicit Hotspot login URL
    buildMikrotikRouterLogin(params, username, options) ??
    // Ruijie: login_url / WiFiDog / ePortal / uamip+uamport
    buildRuijieRouterLogin(params, username, options) ??
    // MikroTik: nas_ip + mac/ip without Ruijie UAM markers
    buildMikrotikNasIpFallback(params, username, options)
  );
}

/** True only when we can actually build a NAS login handoff URL/form. */
export function hasNasRedirectContext(params: NasParams): boolean {
  return buildRouterLoginAction(params, "__probe__") != null;
}

export function vendorDisplayName(vendor: NasVendor): string {
  switch (vendor) {
    case "mikrotik":
      return "MikroTik Hotspot";
    case "ruijie-wifidog":
      return "Ruijie WiFiDog";
    case "ruijie-wispr":
      return "Ruijie WISPr";
    case "ruijie-eportal":
      return "Ruijie ePortal";
    default:
      return "Network gateway";
  }
}

/** @deprecated Use buildRouterLoginAction */
export function buildNasLoginRedirectUrl(
  nasParams: NasParams,
  credential: string,
  options?: BuildRouterLoginOptions,
): string | null {
  const action = buildRouterLoginAction(nasParams, credential, options);
  return action?.redirectUrl ?? action?.form?.action ?? null;
}
