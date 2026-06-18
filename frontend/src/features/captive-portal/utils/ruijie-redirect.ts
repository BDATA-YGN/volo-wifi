import type { NasParams } from "../api/types";
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

/** Ruijie / WISPr-style login_url handoff (common on RG-EG external portal + RADIUS). */
export function buildRuijieWisprLogin(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const loginUrl = firstParam(params, [
    "login_url",
    "loginUrl",
    "LogonURL",
    "logon_url",
    "logonUrl",
    "login-url",
  ]);
  if (!loginUrl) return null;

  const password = options.nasPassword ?? username;
  const redirect = firstParam(params, [
    "redirect",
    "redirect_url",
    "redirectUrl",
    "url",
    "firsturl",
    "link-orig",
    "link_orig",
    "success_url",
    "successUrl",
  ]);

  const redirectUrl = appendQueryParams(loginUrl, {
    username,
    user: username,
    userName: username,
    password,
    pwd: password,
    redirect,
  });

  return {
    vendor: "ruijie-wispr",
    redirectUrl,
  };
}

/** Ruijie WiFiDog protocol (Cloud / third-party portal). */
export function buildRuijieWifiDogLogin(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const gwAddress = firstParam(params, ["gw_address", "gw_ip", "gwAddress", "gwIp", "nas_ip", "nasip"]);
  if (!gwAddress) return null;

  const gwPort = firstParam(params, ["auth_port", "authPort", "gw_port", "gwPort", "uamport"]) ?? "2060";
  const gwId = firstParam(params, ["gw_id", "gwId", "interface"]) ?? "br-lan";
  const clientIp = firstParam(params, ["ip", "userip", "user_ip", "wlanuserip", "client_ip"]);
  const clientMac = firstParam(params, ["mac", "usermac", "user_mac", "client_mac"]);
  const originalUrl = firstParam(params, ["url", "firsturl", "redirect", "redirect_url"]);
  const password = options.nasPassword ?? username;

  const action = `http://${gwAddress}:${gwPort}/wifidog/logincheck/`;
  const fields: Record<string, string> = {
    user: username,
    pwd: password,
    Submit: "submit",
    gw_address: gwAddress,
    gw_port: firstParam(params, ["gw_port", "gwPort"]) ?? "2060",
    gw_id: gwId,
    authtype: "web",
  };
  if (clientIp) fields.ip = clientIp;
  if (clientMac) fields.mac = clientMac;
  if (originalUrl) fields.url = originalUrl;

  return {
    vendor: "ruijie-wifidog",
    redirectUrl: appendQueryParams(action, fields),
    form: {
      action,
      method: "GET",
      fields,
    },
  };
}

/** Ruijie ePortalV2 / CMCC-style (custom fmt on EG/AP). */
export function buildRuijieEportalLogin(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const userIp = firstParam(params, ["wlanuserip", "userip", "user_ip", "ip"]);
  const nasIp = firstParam(params, ["nasip", "nas_ip", "nasIp", "wlanacip", "wlanacname"]);
  if (!userIp && !nasIp) return null;

  const explicitLogin = firstParam(params, ["login_url", "loginUrl", "auth_url", "authUrl"]);
  const port = firstParam(params, ["uamport", "auth_port", "authPort", "port"]) ?? "8080";
  const nasHost = nasIp ?? firstParam(params, ["gw_address", "gw_ip"]);
  const loginAction =
    explicitLogin ??
    (nasHost ? `http://${nasHost}:${port}/eportal/RedirectAuth/` : null);

  if (!loginAction) return null;

  const password = options.nasPassword ?? username;
  const fields: Record<string, string> = {
    userName: username,
    userPassword: password,
    authSubmit: "Login",
    wlanuserip: userIp ?? "",
    wlanacname: firstParam(params, ["wlanacname", "wlanacip"]) ?? nasHost ?? "",
  };

  const ssid = firstParam(params, ["ssid"]);
  const nasId = firstParam(params, ["NASID", "nasid", "nas_id"]);
  if (ssid) fields.ssid = ssid;
  if (nasId) fields.NASID = nasId;

  const redirect = firstParam(params, ["url", "firsturl", "redirect", "redirect_url"]);
  if (redirect) fields.url = redirect;

  return {
    vendor: "ruijie-eportal",
    form: {
      action: loginAction,
      method: "POST",
      fields,
    },
    redirectUrl: appendQueryParams(loginAction, fields),
  };
}

/** Build login URL from nas_ip + uamport when router does not send login_url. */
export function buildRuijieUamFallback(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  const nasIp = firstParam(params, ["nas_ip", "nasip", "nasIp"]);
  const uamPort = firstParam(params, ["uamport", "auth_port", "authPort", "port"]);
  if (!nasIp || !uamPort) return null;

  const password = options.nasPassword ?? username;
  const loginAction = `http://${nasIp}:${uamPort}/login`;
  const redirectUrl = appendQueryParams(loginAction, {
    username,
    user: username,
    password,
    pwd: password,
    mac: firstParam(params, ["mac", "usermac", "user_mac"]),
    ip: firstParam(params, ["ip", "userip", "user_ip"]),
    url: firstParam(params, ["url", "firsturl", "redirect", "redirect_url"]),
  });

  return {
    vendor: "ruijie-wispr",
    redirectUrl,
  };
}

export function buildRuijieRouterLogin(
  params: NasParams,
  username: string,
  options: BuildRouterLoginOptions = {},
): RouterLoginAction | null {
  return (
    buildRuijieWisprLogin(params, username, options) ??
    buildRuijieWifiDogLogin(params, username, options) ??
    buildRuijieEportalLogin(params, username, options) ??
    buildRuijieUamFallback(params, username, options)
  );
}
