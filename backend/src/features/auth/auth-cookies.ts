export type AuthAppProfile = 'admin' | 'collector' | 'customer';

export const AUTH_COOKIE_NAMES: Record<
  AuthAppProfile,
  { access: string; refresh: string }
> = {
  admin: { access: 'access_token', refresh: 'refresh_token' },
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
