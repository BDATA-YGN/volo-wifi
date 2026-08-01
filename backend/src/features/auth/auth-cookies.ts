export type AuthAppProfile = 'admin' | 'partner' | 'captive' | 'collector' | 'customer';

export const AUTH_APP_HEADER = 'x-auth-app';

export const AUTH_COOKIE_NAMES: Record<
  AuthAppProfile,
  { access: string; refresh: string }
> = {
  admin: { access: 'access_token', refresh: 'refresh_token' },
  partner: { access: 'partner_access_token', refresh: 'partner_refresh_token' },
  captive: { access: 'portal_access_token', refresh: 'portal_refresh_token' },
  collector: { access: 'sms_collector_access_token', refresh: 'sms_collector_refresh_token' },
  customer: { access: 'sms_customer_access_token', refresh: 'sms_customer_refresh_token' },
};

export const SMS_MOBILE_ACTOR_HEADER = 'x-sms-mobile-actor';

export function resolveMobileAuthProfileFromPath(path: string): 'collector' | 'customer' | null {
  const p = path.toLowerCase();
  if (p.includes('/v1/mobile/collector')) return 'collector';
  if (p.includes('/v1/mobile/customer')) return 'customer';
  return null;
}

export function resolveMobileActorFromHeader(
  value: string | string[] | undefined,
): 'collector' | 'customer' | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'collector' || raw === 'customer') return raw;
  return null;
}

export function cookieNamesForProfile(profile: AuthAppProfile) {
  return AUTH_COOKIE_NAMES[profile];
}

/** Prefer explicit `x-auth-app`; otherwise infer from which session cookies are present. */
export function resolveConsoleAuthProfile(req: {
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
}): 'admin' | 'partner' {
  const headerRaw = req.headers[AUTH_APP_HEADER] ?? req.headers['X-Auth-App'];
  const header = Array.isArray(headerRaw) ? headerRaw[0] : headerRaw;
  if (header === 'partner') return 'partner';
  if (header === 'admin') return 'admin';

  const cookies = req.cookies ?? {};
  const hasPartner =
    Boolean(cookies[AUTH_COOKIE_NAMES.partner.access]) ||
    Boolean(cookies[AUTH_COOKIE_NAMES.partner.refresh]);
  const hasAdmin =
    Boolean(cookies[AUTH_COOKIE_NAMES.admin.access]) ||
    Boolean(cookies[AUTH_COOKIE_NAMES.admin.refresh]);

  if (hasPartner && !hasAdmin) return 'partner';
  return 'admin';
}
