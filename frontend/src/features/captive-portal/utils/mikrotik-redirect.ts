import type { NasParams } from "../api/types";
import { hexToBinaryString, mikrotikChapPassword } from "./md5";
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

/** Voucher: username = password = token. Account: use supplied password. */
function resolveNasPassword(username: string, options: BuildRouterLoginOptions): string {
  if (options.nasPassword != null && options.nasPassword !== "") {
    return options.nasPassword;
  }
  return username;
}

function resolveChapParts(params: NasParams): { chapId: string; challenge: string } | null {
  const idHex = firstParam(params, ["chap-id-hex", "chap_id_hex", "chapIdHex"]);
  const challengeHex = firstParam(params, [
    "chap-challenge-hex",
    "chap_challenge_hex",
    "chapChallengeHex",
  ]);

  if (idHex && challengeHex) {
    const idBin = hexToBinaryString(idHex);
    const challengeBin = hexToBinaryString(challengeHex);
    if (!idBin || !challengeBin) return null;
    return { chapId: idBin.charAt(0), challenge: challengeBin };
  }

  const chapId = firstParam(params, ["chap-id", "chap_id", "chapId"]);
  const chapChallenge = firstParam(params, [
    "chap-challenge",
    "chap_challenge",
    "chapChallenge",
  ]);
  if (!chapId || !chapChallenge) return null;

  // Decimal chap-id from some portals; otherwise treat as raw 1-byte string.
  const idByte = /^\d+$/.test(chapId)
    ? String.fromCharCode(parseInt(chapId, 10) & 0xff)
    : chapId.charAt(0);

  return { chapId: idByte, challenge: chapChallenge };
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

  const plainPassword = resolveNasPassword(username, options);
  const chap = resolveChapParts(params);
  const password = chap
    ? mikrotikChapPassword(chap.chapId, plainPassword, chap.challenge, { rawIdByte: true })
    : plainPassword;

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

/**
 * When MikroTik omit / fail to substitute link-login, hand off via
 * http://{nas_ip}/login (http-pap). Skip if Ruijie uamport is present.
 */
export function buildMikrotikNasIpFallback(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  if (firstParam(params, ["uamport", "uamip", "uamIp", "UAMIP"])) return null;
  if (firstParam(params, ["login_url", "loginUrl", "LogonURL", "logon_url"])) return null;
  if (firstParam(params, ["gw_address", "gw_ip", "gwAddress", "gwIp"])) return null;

  const nasIp = firstParam(params, ["nas_ip", "nasip", "nasIp", "hostname"]);
  if (!nasIp) return null;

  // Prefer cases that look like a hotspot client redirect (mac/ip present).
  const mac = firstParam(params, ["mac", "usermac", "user_mac", "client_mac"]);
  const ip = firstParam(params, ["ip", "userip", "user_ip"]);
  if (!mac && !ip) return null;

  const plainPassword = resolveNasPassword(username, options);
  const loginBase = `http://${nasIp}/login`;
  const redirectUrl = appendQueryParams(loginBase, {
    username,
    password: plainPassword,
    dst: firstParam(params, ["link-orig", "link_orig", "linkOrig", "dst", "url"]),
  });

  return {
    vendor: "mikrotik",
    redirectUrl,
  };
}
