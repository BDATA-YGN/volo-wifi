import type { Request } from 'express';
import {
  AUTH_COOKIE_NAMES,
  resolveMobileActorFromHeader,
  resolveMobileAuthProfileFromPath,
  type AuthAppProfile,
} from '@/features/auth/auth-cookies';
import { MOBILE_HEADERS } from '../constants';

const BEARER_PREFIX = /^Bearer\s+/i;

function readCookie(req: Request, name: string): string | null {
  const value = (req as Request & { cookies?: Record<string, string> }).cookies?.[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Mobile clients send `Authorization: Bearer <token>`.
 * Web uses HTTP-only cookies scoped per app (admin / collector / customer).
 */
export const extractBearerToken = (req: Request): string | null => {
  const header = req.headers[MOBILE_HEADERS.authorization];
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(BEARER_PREFIX, '').trim() || null;
  }
  return null;
};

export const extractAccessToken = (req: Request, preferredProfile?: AuthAppProfile | null): string | null => {
  const bearer = extractBearerToken(req);
  if (bearer) return bearer;

  const pathProfile = resolveMobileAuthProfileFromPath(req.originalUrl || req.path || '');
  const headerProfile = resolveMobileActorFromHeader(req.headers['x-sms-mobile-actor']);
  const profile = preferredProfile ?? pathProfile ?? headerProfile;

  if (profile === 'collector') {
    return readCookie(req, AUTH_COOKIE_NAMES.collector.access);
  }
  if (profile === 'customer') {
    return readCookie(req, AUTH_COOKIE_NAMES.customer.access);
  }
  if (profile === 'partner') {
    return readCookie(req, AUTH_COOKIE_NAMES.partner.access);
  }
  if (profile === 'admin') {
    return readCookie(req, AUTH_COOKIE_NAMES.admin.access);
  }

  return (
    readCookie(req, AUTH_COOKIE_NAMES.collector.access) ??
    readCookie(req, AUTH_COOKIE_NAMES.customer.access) ??
    readCookie(req, AUTH_COOKIE_NAMES.partner.access) ??
    readCookie(req, AUTH_COOKIE_NAMES.admin.access)
  );
};

export const extractRefreshToken = (req: Request, preferredProfile?: AuthAppProfile | null): string | null => {
  const fromBody = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim();

  const pathProfile = resolveMobileAuthProfileFromPath(req.originalUrl || req.path || '');
  const headerProfile = resolveMobileActorFromHeader(req.headers['x-sms-mobile-actor']);
  const profile = preferredProfile ?? pathProfile ?? headerProfile;

  if (profile === 'collector') {
    return readCookie(req, AUTH_COOKIE_NAMES.collector.refresh);
  }
  if (profile === 'customer') {
    return readCookie(req, AUTH_COOKIE_NAMES.customer.refresh);
  }
  if (profile === 'partner') {
    return readCookie(req, AUTH_COOKIE_NAMES.partner.refresh);
  }
  if (profile === 'admin') {
    return readCookie(req, AUTH_COOKIE_NAMES.admin.refresh);
  }

  return (
    readCookie(req, AUTH_COOKIE_NAMES.collector.refresh) ??
    readCookie(req, AUTH_COOKIE_NAMES.customer.refresh) ??
    readCookie(req, AUTH_COOKIE_NAMES.partner.refresh) ??
    readCookie(req, AUTH_COOKIE_NAMES.admin.refresh)
  );
};
