import type { Request } from 'express';
import PrismaDBConnection from '@/prisma/prisma-client';
import { resolveCaptiveClientIp, resolveCaptiveClientMac } from '@/features/captive/utils/captive-client-ip';
import { resolveUserAgent } from '@/utils/request-ip';

const prisma = PrismaDBConnection.getConnection();

export type CaptivePortalNasParams = Record<string, unknown>;

const IP_NAS_KEYS = ['ip', 'wlanuserip', 'userip', 'user_ip', 'client_ip'] as const;
const MAC_NAS_KEYS = ['mac', 'usermac', 'user_mac', 'client_mac'] as const;

function readBodyNasParams(bodyNasParams: unknown): CaptivePortalNasParams {
  if (bodyNasParams == null || typeof bodyNasParams !== 'object' || Array.isArray(bodyNasParams)) {
    return {};
  }
  return { ...(bodyNasParams as CaptivePortalNasParams) };
}

function readNasString(params: CaptivePortalNasParams, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function resolveCaptivePortalSessionIp(
  req: Request,
  bodyNasParams?: unknown,
  builtNasParams?: CaptivePortalNasParams,
): string | null {
  const body = readBodyNasParams(bodyNasParams);
  // Prefer raw NAS redirect fields before request headers (server/edge public IP).
  return (
    readNasString(body, IP_NAS_KEYS) ??
    (builtNasParams ? readNasString(builtNasParams, IP_NAS_KEYS) : null) ??
    resolveCaptiveClientIp(req, body)
  );
}

export function resolveCaptivePortalSessionMac(
  req: Request,
  bodyNasParams?: unknown,
  builtNasParams?: CaptivePortalNasParams,
): string | null {
  const body = readBodyNasParams(bodyNasParams);
  return (
    resolveCaptiveClientMac(req, body) ??
    (builtNasParams ? readNasString(builtNasParams, MAC_NAS_KEYS) : null) ??
    readNasString(body, MAC_NAS_KEYS)
  );
}

/**
 * Merge router redirect params with request context for `nas_params` JSON.
 * IP/MAC are also stored in dedicated columns on `wf_captive_portal_session`.
 */
export function buildCaptivePortalNasParams(
  req: Request,
  bodyNasParams?: unknown,
): CaptivePortalNasParams {
  const merged = readBodyNasParams(bodyNasParams);
  const clientIp = resolveCaptivePortalSessionIp(req, bodyNasParams, merged);
  const clientMac = resolveCaptivePortalSessionMac(req, bodyNasParams, merged);
  const userAgent = resolveUserAgent(req);

  if (clientIp && merged.ip == null && merged.wlanuserip == null && merged.userip == null) {
    merged.ip = clientIp;
  }
  if (clientMac && merged.mac == null && merged.usermac == null && merged.user_mac == null) {
    merged.mac = clientMac;
  }
  if (userAgent && merged.userAgent == null) {
    merged.userAgent = userAgent;
  }

  merged.recordedAt = new Date().toISOString();

  return merged;
}

export async function recordCaptivePortalSession(input: {
  orgId: string;
  credentialId: string;
  username: string;
  req: Request;
  bodyNasParams?: unknown;
}): Promise<void> {
  const nasParams = buildCaptivePortalNasParams(input.req, input.bodyNasParams);
  const ip = resolveCaptivePortalSessionIp(input.req, input.bodyNasParams, nasParams);
  const mac = resolveCaptivePortalSessionMac(input.req, input.bodyNasParams, nasParams);

  await prisma.captivePortalSession.create({
    data: {
      orgId: input.orgId,
      credentialId: input.credentialId,
      username: input.username,
      ip,
      mac,
      nasParams: nasParams as object,
    },
  });
}
