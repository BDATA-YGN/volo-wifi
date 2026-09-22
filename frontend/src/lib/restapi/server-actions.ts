// lib/restapi/server-actions.ts
"use server";

import { cookies, headers } from "next/headers";
import setCookie from 'set-cookie-parser';
import { AxiosResponse } from 'axios';
import { cookieNamesForAuthApp, type AuthApp } from '@/lib/auth/cookies';
import { buildForwardedClientHeaderRecord, resolveHeadersClientIp } from '@/lib/http/client-ip';

/**
 * Headers we pull off the incoming Next.js request so the Express backend can
 * see the original browser client (IP, user-agent) instead of the Next.js
 * server's loopback/container address on server-side API calls (sign-in, etc.).
 *
 * Returns `{}` when called outside a request context (e.g. build-time).
 */
export async function getForwardedClientHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers();
    return buildForwardedClientHeaderRecord(h);
  } catch {
    // `headers()` throws when there is no active request (e.g. during build).
    return {};
  }
}

/**
 * Browser client IP as seen by Next.js (edge/proxy headers). Sent in login body
 * as `clientIp` so Express prefers it over the Next→API hop address.
 */
export async function resolveServerActionClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return resolveHeadersClientIp(h);
  } catch {
    return null;
  }
}

function readSetCookieHeaders(headers: AxiosResponse["headers"]): string[] {
  const raw = headers as {
    getSetCookie?: () => string[];
    get?: (name: string) => unknown;
    ["set-cookie"]?: string | string[];
    ["Set-Cookie"]?: string | string[];
  };

  if (typeof raw.getSetCookie === "function") {
    const list = raw.getSetCookie();
    if (Array.isArray(list) && list.length > 0) return list;
  }

  const value = raw["set-cookie"] ?? raw["Set-Cookie"] ?? raw.get?.("set-cookie");
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return setCookie.splitCookiesString(String(value));
}

export async function syncServerCookies(
  response: AxiosResponse,
  authApp: AuthApp = "admin",
): Promise<string> {
  if (!response || !response.headers) {
    return "";
  }

  const setCookieHeader = readSetCookieHeaders(response.headers);
  if (setCookieHeader.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("API login response had no Set-Cookie; Next.js cannot copy the session.");
    }
    return "";
  }

  const allowedNames = new Set(cookieNamesForAuthApp(authApp));
  const cookieStore = await cookies();
  
  const parsedCookies = setCookie.parse(setCookieHeader);
  const applied: string[] = [];

  const MENUS_COOKIE_MAX_BYTES = 3500;

  // Next.js cookies are first-party to the frontend host. Do not copy the API's
  // production SameSite=None (that requires Secure and is rejected on http://localhost).
  const secure = process.env.NODE_ENV === "production";

  parsedCookies.forEach((c: any) => {
    if (!allowedNames.has(c.name)) return;
    if (typeof c.value === "string" && Buffer.byteLength(c.value) > MENUS_COOKIE_MAX_BYTES) {
      return;
    }
    try {
      cookieStore.set(c.name, c.value, {
        httpOnly: c.httpOnly ?? true,
        secure,
        sameSite: "lax",
        path: c.path || "/",
        maxAge: typeof c.maxAge === "number" ? c.maxAge : undefined,
        expires: c.expires,
      });
      applied.push(`${c.name}=${c.value}`);
    } catch (err) {
      console.error(`Failed to persist session cookie "${c.name}"`, err);
    }
  });

  return applied.join('; ');
}

export async function getServerCookiesForAuthApp(app: AuthApp = 'admin'): Promise<string> {
  try {
    const cookieStore = await cookies();
    const allowed = new Set(cookieNamesForAuthApp(app));

    return cookieStore
      .getAll()
      .filter((c) => allowed.has(c.name))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
  } catch {
    console.debug('Cannot access cookies in this context');
    return '';
  }
}

/** @deprecated Prefer getServerCookiesForAuthApp so admin/partner/portal sessions stay isolated. */
export async function getServerCookies(): Promise<string> {
  return getServerCookiesForAuthApp('admin');
}
