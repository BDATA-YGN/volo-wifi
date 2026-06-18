import type { NextRequest } from "next/server";
import {
  buildForwardedClientHeaderRecord,
  normalizeIp,
  resolveNextRequestClientIp,
} from "@/lib/http/client-ip";

export { resolveNextRequestClientIp };

export function resolveCaptiveApiBaseUrl(): string {
  const raw =
    process.env.CAPTIVE_API_URL ??
    process.env.API_URL?.replace(/\/console\/?$/, "/api") ??
    "http://localhost:4457/api";
  return raw.replace(/\/$/, "");
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export function buildCaptiveProxyForwardHeaders(request: NextRequest): Headers {
  const forward = new Headers();
  const clientIp = resolveNextRequestClientIp(request);

  const forwarded = buildForwardedClientHeaderRecord(request.headers, clientIp);
  for (const [key, value] of Object.entries(forwarded)) {
    forward.set(key, value);
  }

  const contentType = request.headers.get("content-type");
  if (contentType) forward.set("content-type", contentType);

  const cookie = request.headers.get("cookie");
  if (cookie) forward.set("cookie", cookie);

  for (const name of ["x-calling-station-id", "x-called-station-id"]) {
    const value = request.headers.get(name);
    if (value) forward.set(name, value);
  }

  return forward;
}

export function copyCaptiveProxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "set-cookie") {
      headers.append("set-cookie", value);
      return;
    }
    headers.set(key, value);
  });
  return headers;
}

// Re-export for callers that only need normalization in tests/tools.
export { normalizeIp };
