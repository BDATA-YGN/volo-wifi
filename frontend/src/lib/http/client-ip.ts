import type { NextRequest } from "next/server";

const SINGLE_IP_HEADERS = [
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
] as const;

export function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value) return null;
  if (value.startsWith("::ffff:")) value = value.slice(7);
  if (value === "::1" || value === "0:0:0:0:0:0:0:1") value = "127.0.0.1";
  return value;
}

function firstForwardedIp(xff: string | null | undefined): string | null {
  if (!xff) return null;
  const first = xff.split(",")[0];
  return normalizeIp(first);
}

/** Resolve the end-user IP from incoming Next.js/Fetch headers. */
export function resolveHeadersClientIp(headers: Headers): string | null {
  for (const header of SINGLE_IP_HEADERS) {
    const value = normalizeIp(headers.get(header));
    if (value) return value;
  }

  const fromXff = firstForwardedIp(headers.get("x-forwarded-for"));
  if (fromXff) return fromXff;

  return normalizeIp(headers.get("x-real-ip"));
}

/** Resolve the end-user IP from a Next.js middleware/request object. */
export function resolveNextRequestClientIp(
  request: Pick<NextRequest, "headers"> & { ip?: string | null },
): string | null {
  const fromHeaders = resolveHeadersClientIp(request.headers);
  if (fromHeaders) return fromHeaders;

  return normalizeIp(request.ip ?? null);
}

/** Headers to attach on server-side API calls so Express sees the browser client. */
export function buildForwardedClientHeaderRecord(
  headers: Headers,
  requestIp?: string | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  const clientIp =
    resolveHeadersClientIp(headers) ?? normalizeIp(requestIp ?? null);

  if (clientIp) {
    out["x-forwarded-for"] = clientIp;
    out["x-real-ip"] = clientIp;
    out["x-client-ip"] = clientIp;
  }

  const userAgent = headers.get("user-agent");
  if (userAgent) out["user-agent"] = userAgent;

  return out;
}

/** Clone request headers and ensure downstream server actions see the client IP. */
export function withForwardedClientIpHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers);
  const clientIp = resolveNextRequestClientIp(request);
  if (!clientIp) return requestHeaders;

  if (!requestHeaders.get("x-forwarded-for")) {
    requestHeaders.set("x-forwarded-for", clientIp);
  }
  if (!requestHeaders.get("x-real-ip")) {
    requestHeaders.set("x-real-ip", clientIp);
  }
  if (!requestHeaders.get("x-client-ip")) {
    requestHeaders.set("x-client-ip", clientIp);
  }

  return requestHeaders;
}
