import type { NasParams } from "../api/types";
import { buildMikrotikRouterLogin } from "./mikrotik-redirect";
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

export function detectNasVendor(params: NasParams): NasVendor {
  if (
    firstParam(params, ["link-login", "link-login-only", "link_login", "linkLogin"])
  ) {
    return "mikrotik";
  }

  if (firstParam(params, ["gw_address", "gw_ip", "gwAddress", "gwIp"]) && firstParam(params, ["gw_id", "gwId", "interface"])) {
    return "ruijie-wifidog";
  }

  if (firstParam(params, ["wlanuserip", "wlanacname", "NASID", "nasid"])) {
    return "ruijie-eportal";
  }

  if (
    firstParam(params, [
      "login_url",
      "loginUrl",
      "LogonURL",
      "logon_url",
      "nas_ip",
      "nasip",
      "uamport",
    ])
  ) {
    return "ruijie-wispr";
  }

  return "unknown";
}

export function hasNasRedirectContext(params: NasParams): boolean {
  return detectNasVendor(params) !== "unknown";
}

export function buildRouterLoginAction(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const vendor = detectNasVendor(params);

  if (vendor === "mikrotik") {
    return buildMikrotikRouterLogin(params, username, options);
  }

  if (vendor.startsWith("ruijie")) {
    return buildRuijieRouterLogin(params, username, options);
  }

  return null;
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
