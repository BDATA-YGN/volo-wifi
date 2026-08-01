// lib/restapi/server-actions.ts
"use server";

import { cookies, headers } from "next/headers";
import setCookie from 'set-cookie-parser';
import { AxiosResponse } from 'axios';
import { cookieNamesForAuthApp, type AuthApp } from '@/lib/auth/cookies';
import { buildForwardedClientHeaderRecord } from '@/lib/http/client-ip';

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

export async function syncServerCookies(
  response: AxiosResponse,
  authApp: AuthApp = "admin",
): Promise<string> {
  if (!response || !response.headers) {
    return "";
  }

  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader) return "";

  const allowedNames = new Set(cookieNamesForAuthApp(authApp));
  const cookieStore = await cookies();
  
  const splitCookies = setCookie.splitCookiesString(setCookieHeader as unknown as string);
  const parsedCookies = setCookie.parse(splitCookies);
  const applied: string[] = [];

  parsedCookies.forEach((c: any) => {
    if (!allowedNames.has(c.name)) return;
    cookieStore.set(c.name, c.value, {
      httpOnly: c.httpOnly ?? true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (c.sameSite as any) || 'lax',
      path: c.path || '/',
      maxAge: c.maxAge,
      expires: c.expires,
    });
    applied.push(`${c.name}=${c.value}`);
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
