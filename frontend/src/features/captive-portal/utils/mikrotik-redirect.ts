import type { NasParams } from "../api/types";
import { mikrotikChapPassword } from "./md5";
import type { BuildRouterLoginOptions, RouterLoginAction } from "./nas-vendor";

function firstParam(params: NasParams, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = params[key];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

function appendQueryParams(
  base: string,
  fields: Record<string, string | undefined>,
): string {
  try {
    const url = new URL(base);
    for (const [key, value] of Object.entries(fields)) {
      if (value != null && value !== "" && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  } catch {
    const entries = Object.entries(fields).filter(([, v]) => v != null && v !== "");
    if (!entries.length) return base;
    const separator = base.includes("?") ? "&" : "?";
    const query = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
      .join("&");
    return `${base}${separator}${query}`;
  }
}

export function buildMikrotikRouterLogin(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const loginBase =
    firstParam(params, ["link-login", "link-login-only", "link_login", "linkLogin"]) ??
    null;
  if (!loginBase) return null;

  const plainPassword = options.nasPassword ?? "";
  const chapId = firstParam(params, ["chap-id", "chap_id", "chapId"]);
  const chapChallenge = firstParam(params, ["chap-challenge", "chap_challenge", "chapChallenge"]);

  let password = plainPassword;
  if (chapId && chapChallenge) {
    password = mikrotikChapPassword(chapId, plainPassword, chapChallenge);
  }

  const redirectUrl = appendQueryParams(loginBase, {
    username,
    password,
    dst: firstParam(params, ["link-orig", "link_orig", "linkOrig", "dst"]),
  });

  return {
    vendor: "mikrotik",
    redirectUrl,
  };
}
